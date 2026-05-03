const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const User = require('../models/user');
const authMiddleware = require('../middleware/auth');

// Yêu cầu đăng nhập cho tất cả
router.use(authMiddleware);

// GET /api/notifications
// Lấy danh sách thông báo của user hiện tại
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50); // Get latest 50
    res.json({ notifications, ok: true });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Lỗi server', ok: false });
  }
});

// PUT /api/notifications/:id/read
// Đánh dấu thông báo đã đọc
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { is_read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo', ok: false });
    }
    res.json({ message: 'Đã cập nhật', ok: true });
  } catch (error) {
    console.error('Read notification error:', error);
    res.status(500).json({ message: 'Lỗi server', ok: false });
  }
});

// PUT /api/notifications/token
// Lưu push token
router.put('/token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Không có token', ok: false });
    }
    await User.findByIdAndUpdate(req.user.id, { expo_push_token: token });
    res.json({ message: 'Đã lưu push token', ok: true });
  } catch (error) {
    console.error('Save notification token error:', error);
    res.status(500).json({ message: 'Lỗi server', ok: false });
  }
});

module.exports = router;
