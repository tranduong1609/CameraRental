const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'booking_confirmed',  // Đặt lịch thành công
        'payment_success',    // Thanh toán thành công
        'ready_to_pickup',    // Máy sẵn sàng để nhận
        'pickup_reminder',    // Nhắc nhở nhận máy
        'return_reminder',    // Nhắc nhở trả máy
        'refund_completed',   // Hoàn tiền thành công
        'system',             // Cảnh báo hệ thống chung
      ],
      required: true,
    },
    data: {
      // Dữ liệu kèm theo thông báo
      // VD: { booking_id: "xxx", camera_id: "yyy" }
      type: Object,
      default: {},
    },
    is_read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', NotificationSchema);
