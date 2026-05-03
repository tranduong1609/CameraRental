const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-zA-Z0-9_]+$/, 'Username chỉ được chứa chữ cái, số và dấu _'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    password_hash: {
      type: String,
      default: null,
    },
    google_id: {
      type: String,
      unique: true,
      sparse: true,
    },
    facebook_id: {
      type: String,
      unique: true,
      sparse: true,
    },
    auth_provider: {
      type: String,
      enum: ['local', 'google', 'facebook', 'clerk'],
      required: true,
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    avatar_url: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['customer', 'store_owner', 'staff', 'admin'],
      default: 'customer',
    },
    is_email_verified: {
      type: Boolean,
      default: false,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    last_login_at: {
      type: Date,
      default: null,
    },
    expo_push_token: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // Tự tạo createdAt và updatedAt
  }
);

module.exports = mongoose.model('User', UserSchema);
