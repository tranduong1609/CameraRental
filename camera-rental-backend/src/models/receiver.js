const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('./transaction');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const app = express();
app.use(express.json());

// Kết nối MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => {
        console.error('MongoDB connection failed:', err.message);
        process.exit(1);
    });

// Endpoint nhận webhook từ SePay
app.post('/webhook', async (req, res) => {
    const data = req.body;

    if (!data || !data.gateway) {
        return res.json({ success: false, message: 'No data' });
    }

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

        console.log('💾 Transaction saved to MongoDB');
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Insert error:', err.message);
        res.json({
            success: false,
            message: 'Cannot insert record to MongoDB: ' + err.message
        });
    }
});

app.listen(3000, () => {
    console.log('Webhook receiver running on port 3000');
});