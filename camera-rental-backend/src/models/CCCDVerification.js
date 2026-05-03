const mongoose = require('mongoose');

const CCCDVerificationSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    verified_by: {
      // Nhân viên thực hiện quét NFC
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cccd_number: {
      // Số CCCD 12 số
      type: String,
      required: true,
      minlength: 12,
      maxlength: 12,
    },
    full_name: {
      // Tên đọc từ chip NFC
      type: String,
      required: true,
    },
    date_of_birth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      default: null,
    },
    nationality: {
      type: String,
      default: 'Việt Nam',
    },
    place_of_origin: {
      // Quê quán
      type: String,
      default: null,
    },
    place_of_residence: {
      // Nơi thường trú
      type: String,
      default: null,
    },
    issue_date: {
      // Ngày cấp CCCD
      type: Date,
      default: null,
    },
    expiry_date: {
      // Ngày hết hạn CCCD
      type: Date,
      default: null,
    },
    face_image_url: {
      // Ảnh mặt đọc từ chip NFC (lưu lên Cloudinary)
      type: String,
      default: null,
    },
    device_id: {
      // ID thiết bị Android dùng để quét
      type: String,
      default: null,
    },
    nfc_raw_data: {
      // Dữ liệu thô từ chip NFC (dùng để debug)
      type: Object,
      default: {},
    },
    verified_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CCCDVerification', CCCDVerificationSchema);
