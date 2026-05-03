const mongoose = require('mongoose');

const CameraHandoverSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    staff_id: {
      // Nhân viên thực hiện bàn giao
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    handover_type: {
      type: String,
      enum: ['checkout', 'return'],
      // checkout → Giao máy cho khách
      // return   → Nhận máy từ khách trả
      required: true,
    },
    condition: {
      type: String,
      enum: ['perfect', 'good', 'damaged'],
      // perfect → Hoàn hảo
      // good    → Tốt, có vài xước nhỏ
      // damaged → Hư hỏng
      required: true,
    },
    condition_note: {
      // Ghi chú tình trạng máy
      type: String,
      default: null,
    },
    images: {
      // Ảnh chụp tình trạng máy lúc giao/nhận
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CameraHandover', CameraHandoverSchema);
