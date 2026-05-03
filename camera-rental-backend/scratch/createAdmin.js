require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected!');

    const adminEmail = 'admin@tinacamera.com';
    let admin = await User.findOne({ email: adminEmail });
    
    if (admin) {
      console.log('Tài khoản admin đã tồn tại. Cập nhật quyền...!');
      admin.role = 'admin';
      await admin.save();
    } else {
      console.log('Tạo tài khoản admin mới...');
      // Mật khẩu mặt định sẽ là: admin123
      const passHash = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        username: 'superadmin',
        email: adminEmail,
        password_hash: passHash,
        auth_provider: 'local',
        full_name: 'Quản trị viên Hệ thống',
        role: 'admin',
        is_email_verified: true,
        is_active: true,
      });
    }

    console.log('✅ XONG! Giao diện đăng nhập admin:');
    console.log('   Email: admin@tinacamera.com');
    console.log('   Mật khẩu: admin123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
};

createAdmin();
