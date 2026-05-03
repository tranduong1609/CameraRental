const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    booking_id: {
      type: String, // Can store ObjectId or 'temp' or list
      required: false,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    payment_method: {
      type: String,
      enum: ['zalopay', 'momo', 'bank_transfer', 'cash', 'vnpay', 'sepay'],
      required: true,
    },
    payment_type: {
      type: String,
      enum: ['booking', 'deposit_refund', 'remaining'],
      // booking        → Thanh toán đặt lịch
      // deposit_refund → Hoàn cọc
      // remaining      → Thanh toán phần còn lại
      required: true,
    },
    transaction_id: {
      // Mã giao dịch từ cổng thanh toán (ZaloPay/MoMo)
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paid_at: {
      type: Date,
      default: null,
    },
    refunded_at: {
      type: Date,
      default: null,
    },
    refund_amount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Payment', PaymentSchema);
