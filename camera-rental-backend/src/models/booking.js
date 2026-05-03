const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    booking_code: {
      type: String,
      unique: true,
      required: true,
      // VD: CR20240001
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    camera_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Camera',
      required: true,
    },
    camera_snapshot: {
      // Lưu snapshot tên/hãng camera lúc đặt → không mất info khi camera bị xóa
      name: { type: String, default: null },
      brand: { type: String, default: null },
    },
    store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: false,
      default: null,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    total_days: {
      type: Number,
      required: true,
      min: 1,
    },
    price_per_day: {
      type: Number,
      default: 0,
    },
    subtotal: {
      // Tiền thuê gốc = price_per_day × total_days
      type: Number,
      default: 0,
    },
    deposit_amount: {
      // Tiền đặt cọc
      type: Number,
      default: 0,
    },
    total_amount: {
      // Tổng tiền = subtotal + deposit_amount
      type: Number,
      default: 0,
    },
    paid_amount: {
      // Đã thanh toán
      type: Number,
      default: 0,
    },
    remaining_amount: {
      // Còn lại phải trả
      type: Number,
      default: 0,
    },
    payment_type: {
      type: String,
      enum: ['deposit', 'full'], // Cọc 30% hay thanh toán full
      required: true,
    },
    status: {
      type: String,
      enum: [
        'pending',    // Chờ thanh toán
        'paid',       // Đã thanh toán
        'verified',   // Đã xác minh CCCD
        'active',     // Đang thuê
        'returned',   // Đã trả máy
        'completed',  // Hoàn tất
        'cancelled',  // Đã hủy
        'refunded',   // Đã hoàn tiền
      ],
      default: 'pending',
    },
    qr_code: {
      // Mã QR unique để cửa hàng quét
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
    },
    note: {
      type: String,
      default: null,
    },
    customer_info: {
      full_name: { type: String, default: null },
      phone: { type: String, default: null },
      email: { type: String, default: null },
    },
    cccd_info: {
      // Thông tin CCCD quét từ QR khi giao máy
      cccd_number: { type: String, default: null },    // Số CCCD (12 số)
      cmnd_number: { type: String, default: null },    // Số CMND cũ (9 số, nếu có)
      full_name: { type: String, default: null },      // Họ và tên
      date_of_birth: { type: String, default: null },  // Ngày sinh
      gender: { type: String, default: null },         // Giới tính
      address: { type: String, default: null },        // Địa chỉ thường trú
      issue_date: { type: String, default: null },     // Ngày cấp
      raw_data: { type: String, default: null },       // Dữ liệu QR gốc
    },
    cccd_scanned_at: {
      type: Date,
      default: null,
    },
    picked_up_at: {
      // Thời điểm khách nhận máy
      type: Date,
      default: null,
    },
    returned_at: {
      // Thời điểm khách trả máy
      type: Date,
      default: null,
    },
    cancelled_at: {
      type: Date,
      default: null,
    },
    cancel_reason: {
      type: String,
      default: null,
    },
    pickup_reminded: {
      type: Boolean,
      default: false,
    },
    return_reminded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Booking', BookingSchema);
