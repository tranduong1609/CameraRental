const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const authMiddleware = require('../middleware/auth');

// Vui lòng thêm GOOGLE_CLIENT_ID vào biến môi trường (.env)
// Client ID này phải lấy từ Google Developer Console trùng khớp với cấu hình Frontend
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─────────────────────────────────────
//  POST /api/auth/register
// ─────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    // Validate input
    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được đăng ký.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      full_name,
      email,
      password_hash,
      auth_provider: 'local',
      role: 'customer',
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Đăng ký thành công!',
      token,
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Lỗi server. Vui lòng thử lại.' });
  }
});

// ─────────────────────────────────────
//  POST /api/auth/login
// ─────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    // Update last login
    user.last_login_at = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi server. Vui lòng thử lại.' });
  }
});

// ─────────────────────────────────────
//  POST /api/auth/forgot-password
// ─────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Không tiết lộ email có tồn tại hay không (bảo mật)
      return res.json({
        message: 'Nếu email tồn tại, chúng tôi đã gửi link khôi phục mật khẩu.',
      });
    }

    // TODO: Tích hợp gửi email thực tế (nodemailer, SendGrid, v.v.)
    // Hiện tại chỉ trả về thông báo thành công
    res.json({
      message: 'Nếu email tồn tại, chúng tôi đã gửi link khôi phục mật khẩu.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Lỗi server. Vui lòng thử lại.' });
  }
});

// ─────────────────────────────────────
//  POST /api/auth/google
// ─────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Missing idToken' });
    }

    let google_id, email, full_name, avatar_url;

    // Phân biệt idToken (JWT) và accessToken (bắt đầu bằng ya29.)
    if (idToken.startsWith('ya29.')) {
      // Dùng axios gọi Graph API của Google cho Access Token
      const response = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${idToken}`);
      const payload = response.data;
      google_id = payload.sub;
      email = payload.email;
      full_name = payload.name;
      avatar_url = payload.picture;
    } else {
      // Dùng thư viện auth-library cho ID Token
      const ticket = await googleClient.verifyIdToken({
        idToken,
      });
      const payload = ticket.getPayload();
      google_id = payload.sub;
      email = payload.email;
      full_name = payload.name;
      avatar_url = payload.picture;
    }

    // Tìm User theo Google ID hoặc Email
    let user = await User.findOne({ $or: [{ google_id }, { email }] });

    if (user) {
      // Nếu user đã tồn tại nhưng chưa link google_id (đã đk bằng email trước đó)
      if (!user.google_id) {
        user.google_id = google_id;
        if (!user.avatar_url) user.avatar_url = avatar_url; // Lấy avatar nếu chưa có
        await user.save();
      }
    } else {
      // Tạo mới user
      user = await User.create({
        google_id,
        email,
        full_name,
        avatar_url,
        auth_provider: 'google',
        role: 'customer',
        is_email_verified: true,
      });
    }

    // Cập nhật last login
    user.last_login_at = new Date();
    await user.save();

    // Gen JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Đăng nhập Google thành công!',
      token,
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url,
        auth_provider: user.auth_provider,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Lỗi xác thực Google.' });
  }
});

// ─────────────────────────────────────
//  POST /api/auth/facebook
// ─────────────────────────────────────
router.post('/facebook', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: 'Missing accessToken' });
    }

    // Lấy thông tin user từ Facebook Graph API
    const fbRes = await axios.get(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`);
    
    // Facebook Graph API trả về JSON: { id, name, email, picture: { data: { url: ... } } }
    const { id: facebook_id, name: full_name, email } = fbRes.data;
    const avatar_url = fbRes.data.picture?.data?.url;

    // Email từ facebook có thể không bắt buộc hoặc privacy block
    let filter = [{ facebook_id }];
    if (email) filter.push({ email });

    // Tìm User theo Facebook ID hoặc Email
    let user = await User.findOne({ $or: filter });

    if (user) {
      // Logic liên kết account tương tự
      if (!user.facebook_id) {
        user.facebook_id = facebook_id;
        if (!user.avatar_url && avatar_url) user.avatar_url = avatar_url;
        await user.save();
      }
    } else {
      // Tạo mới
      user = await User.create({
        facebook_id,
        email: email || undefined, // Nếu mảng null sẽ lỗi Unique index rỗng nên ta gán undefined để Mongoose bỏ qua nếu sparse
        full_name,
        avatar_url,
        auth_provider: 'facebook',
        role: 'customer',
        // Vì token fb không bắt lỗi email verification chặt chẽ, ta có thể đánh true
        is_email_verified: !!email, 
      });
    }

    user.last_login_at = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Đăng nhập Facebook thành công!',
      token,
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url,
        auth_provider: user.auth_provider,
      },
    });
  } catch (error) {
    console.error('Facebook login error:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Lỗi xác thực Facebook.' });
  }
});

// ─────────────────────────────────────
//  POST /api/auth/clerk
//  Xác thực session từ Clerk → tạo/tìm user trong DB → trả JWT
// ─────────────────────────────────────
router.post('/clerk', async (req, res) => {
  try {
    const { clerkSessionId } = req.body;

    if (!clerkSessionId) {
      return res.status(400).json({ message: 'Missing clerkSessionId' });
    }

    // Gọi Clerk Backend API để lấy thông tin session
    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
    if (!CLERK_SECRET_KEY) {
      console.error('CLERK_SECRET_KEY chưa được cấu hình trong .env');
      return res.status(500).json({ message: 'Server chưa cấu hình Clerk.' });
    }

    // Lấy thông tin session từ Clerk
    const sessionRes = await axios.get(
      `https://api.clerk.com/v1/sessions/${clerkSessionId}`,
      { headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` } }
    );
    const session = sessionRes.data;
    const clerkUserId = session.user_id;

    // Lấy thông tin user từ Clerk
    const userRes = await axios.get(
      `https://api.clerk.com/v1/users/${clerkUserId}`,
      { headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` } }
    );
    const clerkUser = userRes.data;

    // Trích xuất thông tin
    const email = clerkUser.email_addresses?.[0]?.email_address;
    const full_name = `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim() || 'User';
    const avatar_url = clerkUser.image_url;

    // Xác định provider (Google, Facebook, hay email)
    let auth_provider = 'clerk';
    let google_id = null;
    let facebook_id = null;

    if (clerkUser.external_accounts && clerkUser.external_accounts.length > 0) {
      const primaryAccount = clerkUser.external_accounts[0];
      if (primaryAccount.provider === 'google') {
        auth_provider = 'google';
        google_id = primaryAccount.provider_user_id;
      } else if (primaryAccount.provider === 'facebook') {
        auth_provider = 'facebook';
        facebook_id = primaryAccount.provider_user_id;
      }
    }

    // Tìm user trong DB theo nhiều tiêu chí
    let filter = [];
    if (google_id) filter.push({ google_id });
    if (facebook_id) filter.push({ facebook_id });
    if (email) filter.push({ email });

    let user = filter.length > 0
      ? await User.findOne({ $or: filter })
      : null;

    if (user) {
      // Cập nhật thông tin nếu cần
      if (google_id && !user.google_id) user.google_id = google_id;
      if (facebook_id && !user.facebook_id) user.facebook_id = facebook_id;
      if (!user.avatar_url && avatar_url) user.avatar_url = avatar_url;
      user.last_login_at = new Date();
      await user.save();
    } else {
      // Tạo user mới
      user = await User.create({
        google_id,
        facebook_id,
        email: email || undefined,
        full_name,
        avatar_url,
        auth_provider,
        role: 'customer',
        is_email_verified: !!email,
      });
    }

    // Gen JWT cho backend riêng
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: `Đăng nhập ${auth_provider} qua Clerk thành công!`,
      token,
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url,
        auth_provider: user.auth_provider,
      },
    });
  } catch (error) {
    console.error('Clerk login error:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Lỗi xác thực Clerk.' });
  }
});

// ─────────────────────────────────────
//  GET /api/auth/profile
//  Lấy thông tin user đang đăng nhập
// ─────────────────────────────────────
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    res.json({
      user: {
        _id: user._id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role,
        auth_provider: user.auth_provider,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  PUT /api/auth/profile
//  Cập nhật thông tin cá nhân
// ─────────────────────────────────────
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name, phone, email } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    // Validate email nếu thay đổi
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email này đã được sử dụng bởi tài khoản khác.' });
      }
      user.email = email;
    }

    if (full_name) user.full_name = full_name;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.json({
      message: 'Cập nhật thông tin thành công!',
      user: {
        _id: user._id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role,
        auth_provider: user.auth_provider,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
