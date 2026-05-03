const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Payment = require('../models/payment');
const Booking = require('../models/booking');
const Transaction = require('../models/transaction');

// ==========================================
// HELPER: Tạo mã thanh toán theo cấu trúc SePay
// Format: DH + DDMM + HHMM + 4 hex = DH0402013412AB
// ==========================================
const generatePaymentCode = () => {
    const now = new Date();
    const DD = String(now.getDate()).padStart(2, '0');
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const hex = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `DH${DD}${MM}${HH}${mm}${hex}`;
};

// ==========================================
// POST /create — Tạo QR thanh toán SePay
// ==========================================
router.post('/create', async (req, res) => {
    try {
        const { booking_id, amount, orderInfo } = req.body;
        const paymentCode = generatePaymentCode();
        const bankAcc = process.env.SEPAY_BANK_ACC || '';
        const bankName = process.env.SEPAY_BANK_NAME || 'BIDV';

        const qrCodeUrl = `https://qr.sepay.vn/img?bank=${bankName}&acc=${bankAcc}&template=compact&amount=${amount}&des=${paymentCode}`;

        const newPayment = new Payment({
            booking_id,
            amount,
            payment_method: 'sepay',
            payment_type: 'booking',
            transaction_id: paymentCode,
            status: 'pending'
        });
        await newPayment.save();

        console.log('✅ QR created | Code:', paymentCode, '| Amount:', amount);
        res.json({ payUrl: qrCodeUrl, qrCodeUrl, transactionId: paymentCode });
    } catch (error) {
        console.error('Create Error:', error);
        res.status(500).json({ message: 'Lỗi tạo QR', error: error.message });
    }
});

// ==========================================
// GET /check/:transaction_id — Polling trạng thái
// Check DB trước, nếu pending thì hỏi SePay API
// ==========================================
router.get('/check/:transaction_id', async (req, res) => {
    try {
        const payment = await Payment.findOne({ transaction_id: req.params.transaction_id });
        if (!payment) return res.status(404).json({ message: 'Không tìm thấy giao dịch' });

        // Đã xong → trả ngay
        if (payment.status !== 'pending') {
            return res.json({ status: payment.status });
        }

        // Vẫn pending → hỏi SePay API xem có giao dịch mới không
        try {
            const axios = require('axios');
            const sepayToken = process.env.SEPAY_API_TOKEN;
            const bankAcc = process.env.SEPAY_BANK_ACC;

            if (sepayToken) {
                const response = await axios.get('https://my.sepay.vn/userapi/transactions/list', {
                    headers: { 'Authorization': `Bearer ${sepayToken}` },
                    params: { account_number: bankAcc, limit: 20 },
                    timeout: 5000,
                });

                const transactions = response.data?.transactions || [];

                for (const txn of transactions) {
                    const content = txn.transaction_content || '';
                    const code = txn.code || '';

                    if (code === payment.transaction_id || content.includes(payment.transaction_id)) {
                        const amount = parseFloat(txn.amount_in) || 0;
                        if (amount >= payment.amount) {
                            payment.status = 'completed';
                            payment.paid_at = new Date();
                            await payment.save();

                            // Lưu vào tb_transactions
                            try {
                                await Transaction.create({
                                    gateway: 'BIDV',
                                    transaction_date: txn.transaction_date || null,
                                    account_number: txn.account_number || bankAcc,
                                    amount_in: amount,
                                    code: code,
                                    transaction_content: content,
                                    reference_number: txn.reference_number || null,
                                    body: JSON.stringify(txn),
                                });
                            } catch (e) { /* skip */ }

                            // Cập nhật booking(s)
                            try {
                                const bookingIds = (payment.booking_id || '').split(',');
                                for (const bid of bookingIds) {
                                    if (!bid.trim()) continue;
                                    const booking = await Booking.findById(bid.trim());
                                    if (booking) {
                                        booking.status = 'paid';
                                        booking.paid_amount = booking.total_amount;
                                        booking.remaining_amount = 0;
                                        await booking.save();
                                    }
                                }
                            } catch (e) { /* skip */ }

                            console.log('🎉 Payment COMPLETED via SePay API!', payment.transaction_id);
                            return res.json({ status: 'completed' });
                        }
                    }
                }
            }
        } catch (apiErr) {
            // SePay API lỗi → bỏ qua
        }

        res.json({ status: payment.status });
    } catch (error) {
        res.json({ status: 'pending' });
    }
});

// ==========================================
// POST /webhook — Nhận giao dịch từ SePay (theo docs chính thức)
// Docs: https://developer.sepay.vn/vi/sepay-webhooks/lap-trinh-webhooks/lap-trinh-webhook-nodejs
// ==========================================
router.post('/webhook', async (req, res) => {
    const data = req.body;

    // Log để debug
    console.log('');
    console.log('════════════════════════════════════════');
    console.log('🔔 SePay WEBHOOK received!');
    console.log('📦 Body:', JSON.stringify(data, null, 2));
    console.log('════════════════════════════════════════');

    // Kiểm tra dữ liệu
    if (!data || !data.gateway) {
        return res.json({ success: false, message: 'No data' });
    }

    // 1. Lưu giao dịch vào tb_transactions (theo docs SePay)
    const amountIn = data.transferType === 'in' ? data.transferAmount : 0;
    const amountOut = data.transferType === 'out' ? data.transferAmount : 0;

    try {
        await Transaction.create({
            gateway: data.gateway,
            transaction_date: data.transactionDate || null,
            account_number: data.accountNumber || null,
            sub_account: data.subAccount || null,
            amount_in: amountIn,
            amount_out: amountOut,
            accumulated: data.accumulated || 0,
            code: data.code || null,
            transaction_content: data.content || null,
            reference_number: data.referenceCode || null,
            body: data.description || JSON.stringify(data),
        });
        console.log('💾 Saved to tb_transactions');
    } catch (err) {
        console.log('⚠️ Save error:', err.message);
    }

    // 2. Tìm payment khớp — dùng "code" (SePay tự trích xuất từ cấu trúc mã thanh toán)
    const paymentCode = data.code || null;
    console.log('🏷️ Code:', paymentCode, '| Amount:', data.transferAmount);

    if (paymentCode) {
        try {
            const payment = await Payment.findOne({
                transaction_id: paymentCode,
                status: 'pending',
                payment_method: 'sepay'
            });

            if (payment && parseFloat(data.transferAmount) >= payment.amount) {
                payment.status = 'completed';
                payment.paid_at = new Date();
                await payment.save();

                // Cập nhật booking(s)
                try {
                    const bookingIds = (payment.booking_id || '').split(',');
                    for (const bid of bookingIds) {
                        if (!bid.trim()) continue;
                        const booking = await Booking.findById(bid.trim());
                        if (booking) {
                            booking.status = 'paid';
                            booking.paid_amount = booking.total_amount;
                            booking.remaining_amount = 0;
                            await booking.save();
                        }
                    }
                } catch (e) { /* skip */ }

                console.log('🎉 Payment COMPLETED!', paymentCode);
            }
        } catch (e) {
            console.log('⚠️ Payment lookup error:', e.message);
        }
    }

    // Luôn trả 200 (theo docs SePay)
    res.status(200).json({ success: true });
});

// ==========================================
// POST /simulate/:transaction_id — Test/Demo
// ==========================================
router.post('/simulate/:transaction_id', async (req, res) => {
    try {
        const { transaction_id } = req.params;
        const payment = await Payment.findOne({ transaction_id, status: 'pending' });
        if (!payment) return res.status(404).json({ message: 'Không tìm thấy', transaction_id });

        payment.status = 'completed';
        payment.paid_at = new Date();
        await payment.save();

        try {
            const bookingIds = (payment.booking_id || '').split(',');
            for (const bid of bookingIds) {
                if (!bid.trim()) continue;
                const booking = await Booking.findById(bid.trim());
                if (booking) {
                    booking.status = 'paid';
                    booking.paid_amount = booking.total_amount;
                    booking.remaining_amount = 0;
                    await booking.save();
                }
            }
        } catch (e) { /* skip */ }

        console.log('🧪 SIMULATED:', transaction_id);
        res.json({ success: true, status: 'completed', transaction_id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
