require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user');

async function setupOwner() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to DB');

  const email = 'owner@tinacamera.com';
  const password = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // Tìm tài khoản owner hiện tại
  let owner = await User.findOne({ email });

  if (owner) {
    // Cập nhật mật khẩu + role
    owner.password_hash = password_hash;
    owner.role = 'store_owner';
    owner.auth_provider = 'local';
    await owner.save();
    console.log(`🔄 Đã cập nhật tài khoản: ${email}`);
  } else {
    // Tạo mới
    owner = await User.create({
      email,
      password_hash,
      full_name: 'Chủ cửa hàng Tina Camera',
      role: 'store_owner',
      auth_provider: 'local',
      is_email_verified: true,
      is_active: true,
    });
    console.log(`✨ Đã tạo tài khoản mới: ${email}`);
  }

  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`👤 Role: ${owner.role}`);
  console.log(`🆔 ID: ${owner._id}`);

  process.exit(0);
}

setupOwner().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
