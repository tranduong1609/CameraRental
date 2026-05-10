const express = require('express');
const router = express.Router();
const Booking = require('../models/booking');
const Camera = require('../models/camera');
const User = require('../models/user');
const authMiddleware = require('../middleware/auth');

// Helper: tạo booking code tự tăng
async function generateBookingCode() {
  const year = new Date().getFullYear();
  const prefix = `CR${year}`;
  const lastBooking = await Booking.findOne({ booking_code: { $regex: `^${prefix}` } })
    .sort({ booking_code: -1 });
  
  let nextNum = 1;
  if (lastBooking) {
    const lastNum = parseInt(lastBooking.booking_code.replace(prefix, ''), 10);
    nextNum = lastNum + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// ─────────────────────────────────────
//  POST /api/bookings
//  Tạo đơn thuê mới
// ─────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { camera_id, start_date, end_date, payment_type = 'full', customer_info, note } = req.body;

    // Validate
    if (!camera_id || !start_date || !end_date) {
      return res.status(400).json({ message: 'Thiếu thông tin camera, ngày bắt đầu hoặc ngày kết thúc.' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (endDate <= startDate) {
      return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu.' });
    }

    // Tính số ngày
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Lấy thông tin camera
    const camera = await Camera.findById(camera_id).populate('store_id');
    if (!camera) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    }

    // Kiểm tra camera còn số lượng trống trong khoảng ngày này không
    // Đếm tất cả đơn không ở trạng thái huỷ/hoàn/hoàn thành/đã trả
    const conflictCount = await Booking.countDocuments({
      camera_id,
      status: { $nin: ['cancelled', 'refunded', 'completed', 'returned'] },
      start_date: { $lt: endDate },
      end_date: { $gt: startDate },
    });

    const totalQty = camera.quantity || 1;
    if (conflictCount >= totalQty) {
      return res.status(409).json({ message: 'Sản phẩm này đã hết hàng trong khoảng thời gian bạn chọn.' });
    }

    // Tính tiền
    const pricePerDay = camera.price_per_day;
    const subtotal = pricePerDay * totalDays;
    const depositAmount = camera.deposit_amount || 0;
    const totalAmount = subtotal; // Chỉ thanh toán tiền thuê ban đầu, tiền cọc thu sau


    // Tạo booking code
    const bookingCode = await generateBookingCode();

    // Tạo booking
    const booking = await Booking.create({
      booking_code: bookingCode,
      user_id: req.user.id,
      camera_id: camera._id,
      camera_snapshot: {
        name: camera.name,
        brand: camera.brand,
      },
      store_id: camera.store_id?._id || camera.store_id || null,
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      price_per_day: pricePerDay,
      subtotal,
      deposit_amount: depositAmount,
      total_amount: totalAmount,
      paid_amount: 0,
      remaining_amount: totalAmount,
      payment_type,
      status: 'pending',
      customer_info: customer_info || {},
      note: note || null,
    });

    // Cập nhật số lượng còn trống và trạng thái camera
    // Đếm tất cả đơn không ở trạng thái huỷ/hoàn/hoàn thành/đã trả
    const activeBookingsNow = await Booking.countDocuments({
      camera_id: camera._id,
      status: { $nin: ['cancelled', 'refunded', 'completed', 'returned'] },
    });
    camera.available_quantity = Math.max(0, (camera.quantity || 1) - activeBookingsNow);
    if (camera.available_quantity === 0) {
      camera.status = 'rented';
    }
    await camera.save();

    // Populate để trả về thông tin đầy đủ
    await booking.populate('camera_id', 'name brand images price_per_day');

    res.status(201).json({
      message: 'Đặt thuê thành công!',
      booking,
    });
  } catch (error) {
    console.error('Create booking error:', error.message, error.stack);
    res.status(500).json({ message: 'Lỗi server khi tạo đơn thuê: ' + error.message });
  }
});

// ─────────────────────────────────────
//  GET /api/bookings/my
//  Lấy danh sách đơn hàng của user đang đăng nhập
// ─────────────────────────────────────
router.get('/my', authMiddleware, async (req, res) => {
  try {
    // Lấy thông tin email và phone của user hiện tại
    const user = await User.findById(req.user.id).select('email phone');
    
    // Xây dựng filter tìm kiếm
    const filter = [
      { user_id: req.user.id } // Theo ID tài khoản
    ];

    if (user) {
      if (user.email) {
        filter.push({ 'customer_info.email': user.email }); // Theo email
      }
      if (user.phone) {
        filter.push({ 'customer_info.phone': user.phone }); // Theo số điện thoại
      }
    }

    const bookings = await Booking.find({ $or: filter })
      .populate('camera_id', 'name brand images price_per_day')
      .sort({ createdAt: -1 });

    // Kiểm tra booking nào đã được review
    const Review = require('../models/review');
    const bookingIds = bookings.filter(b => b.status === 'completed').map(b => b._id);
    const reviewedBookings = await Review.find({ booking_id: { $in: bookingIds } }).select('booking_id');
    const reviewedSet = new Set(reviewedBookings.map(r => r.booking_id.toString()));

    const bookingsWithReview = bookings.map(b => {
      const obj = b.toObject();
      obj.has_review = reviewedSet.has(b._id.toString());
      return obj;
    });

    res.json({ bookings: bookingsWithReview });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  GET /api/bookings/:id
//  Lấy chi tiết 1 đơn hàng
// ─────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    }).populate('camera_id', 'name brand images price_per_day');

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking detail error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  PUT /api/bookings/:id/cancel
//  Khách hàng tự huỷ đơn (chỉ áp dụng cho đơn 'pending')
// ─────────────────────────────────────
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('email phone');
    const ownerFilter = [{ user_id: req.user.id }];
    if (user?.email) ownerFilter.push({ 'customer_info.email': user.email });
    if (user?.phone) ownerFilter.push({ 'customer_info.phone': user.phone });

    const booking = await Booking.findOne({
      _id: req.params.id,
      $or: ownerFilter,
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Chỉ có thể huỷ đơn hàng đang chờ thanh toán.' });
    }

    booking.status = 'cancelled';
    booking.cancelled_at = new Date();
    booking.cancel_reason = 'Khách hàng tự huỷ';
    await booking.save();

    // Release camera availability if needed
    // Đếm tất cả đơn không ở trạng thái huỷ/hoàn/hoàn thành/đã trả
    const activeBookingsNow = await Booking.countDocuments({
      camera_id: booking.camera_id,
      status: { $nin: ['cancelled', 'refunded', 'completed', 'returned'] },
    });
    
    const camera = await Camera.findById(booking.camera_id);
    if (camera) {
      camera.available_quantity = Math.max(0, (camera.quantity || 1) - activeBookingsNow);
      if (camera.status === 'rented' && camera.available_quantity > 0) {
        camera.status = 'available';
      }
      await camera.save();
    }

    res.json({ message: 'Đã huỷ đơn hàng thành công.', booking });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});
// ─────────────────────────────────────
//  POST /api/bookings/:id/review
//  Khách hàng đánh giá đơn đã hoàn tất
// ─────────────────────────────────────
const Review = require('../models/review');

router.post('/:id/review', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Vui lòng chọn số sao từ 1-5.' });
    }

    // Dùng cùng logic tìm kiếm như getMyBookings
    const user = await User.findById(req.user.id).select('email phone');
    const ownerFilter = [{ user_id: req.user.id }];
    if (user?.email) ownerFilter.push({ 'customer_info.email': user.email });
    if (user?.phone) ownerFilter.push({ 'customer_info.phone': user.phone });

    const booking = await Booking.findOne({
      _id: req.params.id,
      $or: ownerFilter,
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Chỉ đánh giá được đơn đã hoàn tất.' });
    }

    // Kiểm tra đã review chưa
    const existing = await Review.findOne({ booking_id: booking._id });
    if (existing) {
      return res.status(400).json({ message: 'Bạn đã đánh giá đơn hàng này rồi.' });
    }

    const review = await Review.create({
      booking_id: booking._id,
      user_id: req.user.id,
      camera_id: booking.camera_id,
      store_id: booking.store_id,
      rating: parseInt(rating),
      comment: comment || null,
      is_visible: true,
    });

    // Cập nhật rating_avg + total_reviews cho camera
    const cameraReviews = await Review.find({ camera_id: booking.camera_id });
    const avgRating = cameraReviews.reduce((sum, r) => sum + r.rating, 0) / cameraReviews.length;
    await Camera.findByIdAndUpdate(booking.camera_id, {
      rating_avg: Math.round(avgRating * 10) / 10,
      total_reviews: cameraReviews.length,
    });

    res.status(201).json({ message: 'Cảm ơn bạn đã đánh giá!', review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
