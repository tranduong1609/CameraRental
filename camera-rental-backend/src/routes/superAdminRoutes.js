const express = require('express');
const router = express.Router();
const User = require('../models/user');
const authMiddleware = require('../middleware/auth');

// ─────────────────────────────────────
//  Middleware: Chỉ cho phép admin (super_admin)
// ─────────────────────────────────────
const superAdminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập. Yêu cầu quyền quản trị viên hệ thống.' });
    }
    req.superAdmin = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server.' });
  }
};

// Áp dụng middleware
router.use(authMiddleware, superAdminOnly);

// ─────────────────────────────────────
//  GET /api/superadmin/users
//  Lấy danh sách người dùng
// ─────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { role, search, status } = req.query;
    const filter = {};

    if (role && role !== 'all') {
      filter.role = role;
    }
    
    if (status && status !== 'all') {
      if (status === 'active') filter.is_active = true;
      if (status === 'inactive') filter.is_active = false;
    }

    let users = await User.find(filter).sort({ createdAt: -1 }).select('-password_hash');

    if (search) {
      const keyword = search.toLowerCase();
      users = users.filter(u => 
        (u.full_name && u.full_name.toLowerCase().includes(keyword)) ||
        (u.email && u.email.toLowerCase().includes(keyword)) ||
        (u.phone && u.phone.includes(keyword))
      );
    }

    // Đếm thống kê nhanh
    const stats = {
      total: await User.countDocuments(),
      admins: await User.countDocuments({ role: 'admin' }),
      storeOwners: await User.countDocuments({ role: 'store_owner' }),
      customers: await User.countDocuments({ role: 'customer' }),
      inactive: await User.countDocuments({ is_active: false })
    };

    res.json({ users, stats });
  } catch (error) {
    console.error('Super Admin get users error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  PUT /api/superadmin/users/:id/role
//  Cập nhật thông tin & phân quyền
// ─────────────────────────────────────
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;

    const validRoles = ['customer', 'store_owner', 'staff', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Quyền không hợp lệ.' });
    }

    // Không cho phép tự đổi quyền của chính mình (để tránh rủi ro mất quyền admin)
    if (req.params.id === req.user.id) {
       return res.status(400).json({ message: 'Bạn không thể tự thay đổi quyền của chính mình.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    user.role = role;
    await user.save();

    res.json({ message: 'Phân quyền thành công.', user });
  } catch (error) {
    console.error('Super Admin update role error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  PUT /api/superadmin/users/:id/status
//  Vô hiệu hoá/Khóa hoặc Mở khóa tài khoản (Thay vì xóa)
// ─────────────────────────────────────
router.put('/users/:id/status', async (req, res) => {
  try {
    const { is_active } = req.body;
    
    // Không cho phép tự khóa chính mình
    if (req.params.id === req.user.id) {
       return res.status(400).json({ message: 'Bạn không thể tự vô hiệu hoá tài khoản của chính mình.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    user.is_active = is_active;
    await user.save();

    res.json({ message: is_active ? 'Đã mở khóa tài khoản.' : 'Đã vô hiệu hoá tài khoản.', user });
  } catch (error) {
    console.error('Super Admin toggle status error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
