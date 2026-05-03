const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    booking_id: {
      // 1 booking chỉ được đánh giá 1 lần
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
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
    store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: null,
    },
    images: {
      // Ảnh đính kèm trong review
      type: [String],
      default: [],
    },
    reply_comment: {
      // Phản hồi từ chủ cửa hàng
      type: String,
      default: null,
    },
    reply_at: {
      type: Date,
      default: null,
    },
    is_visible: {
      // Admin có thể ẩn review vi phạm
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Review', ReviewSchema);
