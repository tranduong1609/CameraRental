const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Booking = require('../models/booking');
const Payment = require('../models/payment');

/**
 * ============================================
 * VNPAY PAYMENT INTEGRATION (Sandbox)
 * Tạo URL thanh toán theo tài liệu VNPay chính thức
 * ============================================
 */

function sortObject(obj) {
    let sorted = {};
    let keys = Object.keys(obj).sort();
    for (let key of keys) {
        sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
    }
    return sorted;
}

router.post('/vnpay/create', async (req, res) => {
    try {
        const { booking_id, amount, orderInfo } = req.body;

        const tmnCode = process.env.VNP_TMNCODE || 'J9B0NX9Y';
        const secretKey = process.env.VNP_HASHSECRET || 'LNKSMCQZSIBXLYLWQNPUEORXSRHFFJWM';
        const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        const returnUrl = process.env.VNP_RETURNURL || `http://localhost:${process.env.PORT || 5000}/api/payment/vnpay/vnpay_return`;

        const txnRef = `VNPAY${Date.now()}`;
        
        // Tạo ngày theo múi giờ Việt Nam (GMT+7)
        const now = new Date();
        const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const createDate = vnTime.toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14);

        let vnpParams = {};
        vnpParams['vnp_Version'] = '2.1.0';
        vnpParams['vnp_Command'] = 'pay';
        vnpParams['vnp_TmnCode'] = tmnCode;
        vnpParams['vnp_Locale'] = 'vn';
        vnpParams['vnp_CurrCode'] = 'VND';
        vnpParams['vnp_TxnRef'] = txnRef;
        vnpParams['vnp_OrderInfo'] = orderInfo || `Thanh toan don hang ${txnRef}`;
        vnpParams['vnp_OrderType'] = 'other';
        vnpParams['vnp_Amount'] = amount * 100;
        vnpParams['vnp_ReturnUrl'] = returnUrl;
        vnpParams['vnp_IpAddr'] = '127.0.0.1';
        vnpParams['vnp_CreateDate'] = createDate;

        vnpParams = sortObject(vnpParams);

        const signData = new URLSearchParams(vnpParams).toString();
        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        vnpParams['vnp_SecureHash'] = signed;

        const paymentUrl = vnpUrl + '?' + new URLSearchParams(vnpParams).toString();

        // Lưu payment vào DB
        const newPayment = new Payment({
            booking_id,
            amount,
            payment_method: 'vnpay',
            payment_type: 'booking',
            transaction_id: txnRef,
            status: 'pending'
        });
        await newPayment.save();

        console.log('✅ VNPay URL created:', paymentUrl.substring(0, 80) + '...');
        res.json({ payUrl: paymentUrl, transactionId: txnRef });
    } catch (error) {
        console.error('VNPay Create Error:', error);
        res.status(500).json({ message: 'Lỗi khi tạo thanh toán VNPay', error: error.message });
    }
});

router.get('/vnpay/vnpay_return', async (req, res) => {
    try {
        const responseCode = req.query.vnp_ResponseCode;
        const txnRef = req.query.vnp_TxnRef;

        if (responseCode === '00') {
            const payment = await Payment.findOne({ transaction_id: txnRef });
            if (payment && payment.status === 'pending') {
                payment.status = 'completed';
                payment.paid_at = new Date();
                await payment.save();

                const booking = await Booking.findById(payment.booking_id);
                if (booking) {
                    booking.status = 'paid';
                    booking.paid_amount += payment.amount;
                    booking.remaining_amount = Math.max(0, booking.total_amount - booking.paid_amount);
                    await booking.save();
                }
            }
            res.send('<html><body style="background:#111;color:#0f0;text-align:center;padding:50px;font-size:24px;">✅ Thanh toán VNPay thành công! Bạn có thể đóng trình duyệt này.</body></html>');
        } else {
            const payment = await Payment.findOne({ transaction_id: txnRef });
            if (payment) {
                payment.status = 'failed';
                await payment.save();
            }
            res.send('<html><body style="background:#111;color:#f00;text-align:center;padding:50px;font-size:24px;">❌ Thanh toán VNPay thất bại!</body></html>');
        }
    } catch (error) {
        console.error('VNPay Return Error:', error);
        res.status(500).send('Có lỗi xảy ra');
    }
});

router.get('/vnpay/vnpay_ipn', async (req, res) => {
    try {
        const responseCode = req.query.vnp_ResponseCode;
        const txnRef = req.query.vnp_TxnRef;

        if (responseCode === '00') {
            const payment = await Payment.findOne({ transaction_id: txnRef });
            if (payment && payment.status === 'pending') {
                payment.status = 'completed';
                payment.paid_at = new Date();
                await payment.save();

                const booking = await Booking.findById(payment.booking_id);
                if (booking) {
                    booking.status = 'paid';
                    booking.paid_amount += payment.amount;
                    booking.remaining_amount = Math.max(0, booking.total_amount - booking.paid_amount);
                    await booking.save();
                }
                res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
            } else {
                res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
            }
        } else {
            res.status(200).json({ RspCode: '97', Message: 'Thanh toán thất bại' });
        }
    } catch (error) {
        console.error('VNPay IPN Error:', error);
        res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
    }
});

/**
 * ============================================
 * MOMO PAYMENT INTEGRATION (Test)
 * ============================================
 */
router.post('/momo/create', async (req, res) => {
    try {
        const { booking_id, amount, orderInfo } = req.body;

        const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
        const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
        const secretkey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
        const orderId = partnerCode + new Date().getTime();
        const requestId = orderId;
        const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
        const ipnUrl = process.env.MOMO_IPN_URL || 'https://callback.url/api/payment/momo/callback';

        const requestType = "captureWallet";
        const extraData = "";
        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

        const signature = crypto.createHmac('sha256', secretkey)
            .update(rawSignature)
            .digest('hex');

        const momoPayload = {
            partnerCode,
            partnerName: "TinaCamera",
            storeId: "TinaCameraStore",
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl,
            ipnUrl,
            lang: "vi",
            requestType,
            autoCapture: true,
            extraData,
            signature
        };

        const axios = require('axios');
        const response = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', momoPayload, {
            headers: { 'Content-Type': 'application/json' }
        });

        const newPayment = new Payment({
            booking_id,
            amount,
            payment_method: 'momo',
            payment_type: 'booking',
            transaction_id: orderId,
            status: 'pending'
        });
        await newPayment.save();

        console.log('✅ MoMo URL created:', response.data.payUrl);
        // Trả về cả payUrl và qrCodeUrl để React Native hiển thị tuỳ ý
        res.json({ 
            payUrl: response.data.payUrl, 
            qrCodeUrl: response.data.qrCodeUrl, // Link ảnh QR native của MoMo
            deeplink: response.data.deeplink, // Link mở app MoMo
            transactionId: orderId 
        });
    } catch (error) {
        console.error('MoMo Create Error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Lỗi khi tạo giao dịch MoMo', error: error.message });
    }
});

router.post('/momo/callback', async (req, res) => {
    console.log('MoMo IPN Callback received:', req.body);
    try {
        const { orderId, resultCode } = req.body;
        const payment = await Payment.findOne({ transaction_id: orderId });
        if (payment) {
            if (resultCode === 0) {
                payment.status = 'completed';
                payment.paid_at = new Date();
                await payment.save();

                const booking = await Booking.findById(payment.booking_id);
                if (booking) {
                    booking.status = 'paid';
                    booking.paid_amount += payment.amount;
                    booking.remaining_amount = Math.max(0, booking.total_amount - booking.paid_amount);
                    await booking.save();
                }
            } else {
                payment.status = 'failed';
                await payment.save();
            }
        }
        res.status(200).json({ message: 'Success' });
    } catch (err) {
        console.error('MoMo IPN Error:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

/**
 * ============================================
 * PAYMENT STATUS POLLING
 * ============================================
 */
router.get('/status/:transaction_id', async (req, res) => {
    try {
        const payment = await Payment.findOne({ transaction_id: req.params.transaction_id });
        if (!payment) {
            return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
        }
        res.json({ status: payment.status });
    } catch (error) {
        console.error('Lỗi khi tra cứu trạng thái thanh toán:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;
