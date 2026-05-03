const mongoose = require('mongoose');

const CameraSchema = new mongoose.Schema(
  {
    store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
      default: null,
    },
    model: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      enum: ['dslr', 'mirrorless', 'film', 'lens', 'accessory'],
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    specs: {
      // Thông số kỹ thuật dạng object
      // VD: { resolution: "45MP", sensor: "Full Frame", iso: "100-51200" }
      type: Object,
      default: {},
    },
    included_items: {
      // Phụ kiện đi kèm khi thuê
      // VD: ["Pin dự phòng", "Túi máy", "Thẻ nhớ 64GB"]
      type: [String],
      default: [],
    },
    price_per_day: {
      type: Number,
      required: true,
      min: 0,
    },
    price_per_week: {
      type: Number,
      default: null,
      min: 0,
    },
    deposit_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      // Tổng số lượng thiết bị cùng loại
      type: Number,
      default: 1,
      min: 1,
    },
    available_quantity: {
      // Số lượng còn trống (chưa cho thuê)
      type: Number,
      default: 1,
      min: 0,
    },
    images: {
      // Mảng URL ảnh lưu trên Cloudinary
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['available', 'rented', 'maintenance', 'inactive'],
      default: 'available',
    },
    rating_avg: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    total_reviews: {
      type: Number,
      default: 0,
    },
    total_rented: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Camera', CameraSchema);
