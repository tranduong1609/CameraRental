const express = require('express');
const router = express.Router();
const Booking = require('../models/booking');
const Camera = require('../models/camera');
const User = require('../models/user');
const authMiddleware = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// ─────────────────────────────────────
//  Middleware: Chỉ cho phép store_owner
// ─────────────────────────────────────
const storeOwnerOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'store_owner') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập.' });
    }
    req.storeOwner = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server.' });
  }
};

// Áp dụng cả 2 middleware cho tất cả routes
router.use(authMiddleware, storeOwnerOnly);

// ─────────────────────────────────────
//  GET /api/admin/stats
//  Thống kê tổng quan
// ─────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [
      totalBookings,
      pendingBookings,
      activeBookings,
      completedBookings,
      cancelledBookings,
      paidBookings,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'active' }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.countDocuments({ status: { $in: ['paid', 'verified', 'active', 'returned', 'completed'] } }),
    ]);

    // Tính tổng doanh thu từ các đơn (Net Revenue = paid_amount - refund_amount)
    const revenueResult = await Booking.aggregate([
      { $match: { status: { $in: ['paid', 'verified', 'active', 'returned', 'completed', 'cancelled', 'refunded'] } } },
      { 
        $group: { 
          _id: null, 
          total: { $sum: { $subtract: [{ $ifNull: ['$paid_amount', 0] }, { $ifNull: ['$refund_amount', 0] }] } } 
        } 
      },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Đơn quá hạn (end_date < now và status vẫn là active)
    const overdueBookings = await Booking.countDocuments({
      status: 'active',
      end_date: { $lt: new Date() },
    });

    res.json({
      totalBookings,
      pendingBookings,
      activeBookings,
      completedBookings,
      cancelledBookings,
      paidBookings,
      totalRevenue,
      overdueBookings,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  GET /api/admin/revenue?period=day|week|month
//  Thống kê doanh thu theo ngày/tuần/tháng
// ─────────────────────────────────────
router.get('/revenue', async (req, res) => {
  try {
    const { period = 'day', start_date, end_date } = req.query;
    console.log(`[Revenue API] Request for period: ${period}, start: ${start_date}, end: ${end_date}`);
    const now = new Date();
    let groupFormat, startDate;

    const monthMatch = period.match(/^month(\d+)$/);
    if (period === 'today') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      groupFormat = { $dateToString: { format: '%H:00', date: '$createdAt', timezone: '+07:00' } };
    } else if (period === 'month_current') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+07:00' } };
    } else if (period === 'day') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+07:00' } };
    } else if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 55);
      startDate.setHours(0, 0, 0, 0);
      groupFormat = { $dateToString: { format: '%Y-W%V', date: '$createdAt', timezone: '+07:00' } };
    } else if (monthMatch || period === 'month') {
      const months = monthMatch ? parseInt(monthMatch[1], 10) : 6;
      startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      startDate.setHours(0, 0, 0, 0);
      groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: '+07:00' } };
    } else if (period === 'all') {
      // Toàn bộ thời gian, group theo tháng
      startDate = null;
      groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: '+07:00' } };
    } else if (period === 'custom') {
      startDate = start_date ? new Date(start_date) : new Date(now);
      startDate.setHours(0, 0, 0, 0);
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+07:00' } };
    } else {
      groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: '+07:00' } };
    }

    const matchCondition = {
      status: { $in: ['paid', 'verified', 'active', 'returned', 'completed', 'cancelled', 'refunded'] },
    };
    if (startDate) {
      matchCondition.createdAt = { $gte: startDate };
    }

    if (period === 'custom' && end_date) {
      const customEndDate = new Date(end_date);
      customEndDate.setHours(23, 59, 59, 999);
      if (!matchCondition.createdAt) matchCondition.createdAt = {};
      matchCondition.createdAt.$lte = customEndDate;
    }

    // Doanh thu theo thời gian
    const revenueData = await Booking.aggregate([
      {
        $match: matchCondition,
      },
      {
        $group: {
          _id: groupFormat,
          revenue: { 
            $sum: { 
              $subtract: [
                { $ifNull: ['$paid_amount', 0] }, 
                { $ifNull: ['$refund_amount', 0] }
              ] 
            } 
          },
          count: { 
            $sum: { 
              $cond: [
                { 
                  $gt: [
                    { $subtract: [{ $ifNull: ['$paid_amount', 0] }, { $ifNull: ['$refund_amount', 0] }] }, 
                    0
                  ] 
                }, 
                1, 
                { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, 1] }
              ]
            } 
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Tổng doanh thu trong khoảng
    const totalInPeriod = revenueData.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = revenueData.reduce((sum, d) => sum + d.count, 0);

    // Tổng doanh thu tất cả thời gian
    const allTimeResult = await Booking.aggregate([
      { $match: { status: { $in: ['paid', 'verified', 'active', 'returned', 'completed', 'cancelled', 'refunded'] } } },
      { $group: { _id: null, total: { $sum: { $subtract: ['$paid_amount', { $ifNull: ['$refund_amount', 0] }] } }, count: { $sum: 1 } } },
    ]);

    res.json({
      period,
      data: revenueData.map(d => ({
        label: d._id,
        revenue: d.revenue,
        orders: d.count,
      })),
      totalInPeriod,
      totalOrders,
      allTimeRevenue: allTimeResult[0]?.total || 0,
      allTimeOrders: allTimeResult[0]?.count || 0,
    });
  } catch (error) {
    console.error('Admin revenue error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  GET /api/admin/equipment-stats
//  Thống kê thiết bị được thuê nhiều và danh mục
// ─────────────────────────────────────
router.get('/equipment-stats', async (req, res) => {
  try {
    const { period = 'all', start_date, end_date } = req.query;
    const now = new Date();
    let startDateFilter = null;
    let endDateFilter = null;

    if (period === 'today') {
      startDateFilter = new Date(now);
      startDateFilter.setHours(0, 0, 0, 0);
    } else if (period === 'month_current') {
      startDateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
      startDateFilter.setHours(0, 0, 0, 0);
    } else if (period === 'month3') {
      startDateFilter = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      startDateFilter.setHours(0, 0, 0, 0);
    } else if (period === 'custom') {
      if (start_date) {
        startDateFilter = new Date(start_date);
        startDateFilter.setHours(0, 0, 0, 0);
      }
      if (end_date) {
        endDateFilter = new Date(end_date);
        endDateFilter.setHours(23, 59, 59, 999);
      }
    }

    const validStatuses = ['paid', 'verified', 'active', 'returned', 'completed', 'cancelled', 'refunded'];
    
    const matchCondition = { status: { $in: validStatuses }, camera_id: { $exists: true, $ne: null } };
    if (startDateFilter || endDateFilter) {
      matchCondition.createdAt = {};
      if (startDateFilter) matchCondition.createdAt.$gte = startDateFilter;
      if (endDateFilter) matchCondition.createdAt.$lte = endDateFilter;
    }

    // Top cameras
    const topCamerasRaw = await Booking.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$camera_id',
          count: { 
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, 1] } 
          },
          revenue: {
            $sum: {
              $subtract: [
                { $ifNull: ['$paid_amount', 0] },
                { $ifNull: ['$refund_amount', 0] }
              ]
            }
          }
        }
      },
      { $sort: { count: -1, revenue: -1 } },
      {
        $lookup: {
          from: 'cameras',
          localField: '_id',
          foreignField: '_id',
          as: 'cameraInfo'
        }
      },
      { $unwind: '$cameraInfo' }
    ]);

    const topCameras = topCamerasRaw.map(item => ({
      camera_id: item._id,
      name: item.cameraInfo.name,
      brand: item.cameraInfo.brand,
      category: item.cameraInfo.category,
      image: item.cameraInfo.images && item.cameraInfo.images.length > 0 ? item.cameraInfo.images[0] : null,
      total_bookings: item.count,
      total_revenue: item.revenue,
      avg_rating: item.cameraInfo.rating_avg || 0
    }));

    // Category stats
    const categoryStats = topCameras.reduce((acc, curr) => {
      const cat = curr.category || 'other';
      if (!acc[cat]) {
        acc[cat] = { category: cat, count: 0, revenue: 0 };
      }
      acc[cat].count += curr.total_bookings;
      acc[cat].revenue += curr.total_revenue;
      return acc;
    }, {});

    const categoryArray = Object.values(categoryStats).sort((a, b) => b.count - a.count);

    // Summary
    const totalEquipment = await Camera.countDocuments();
    const currentlyRented = await Booking.countDocuments({ status: 'active', camera_id: { $exists: true, $ne: null } });
    
    // Tổng số lượng máy (cộng dồn available_quantity ban đầu nếu có lưu, tạm thời lấy countDocuments)
    // Tỉ lệ sử dụng = (máy đang thuê / tổng máy) * 100
    const utilization_rate = totalEquipment > 0 ? Math.round((currentlyRented / totalEquipment) * 100) : 0;

    res.json({
      topCameras,
      categoryStats: categoryArray,
      summary: {
        total_equipment: totalEquipment,
        currently_rented: currentlyRented,
        utilization_rate
      }
    });
  } catch (error) {
    console.error('Equipment stats error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  GET /api/admin/bookings
//  Lấy tất cả đơn hàng (hỗ trợ filter + tìm kiếm)
// ─────────────────────────────────────
router.get('/bookings', async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    let bookings = await Booking.find(filter)
      .populate('camera_id', 'name brand images price_per_day category')
      .populate('user_id', 'full_name email phone avatar_url')
      .sort({ createdAt: -1 });

    // Tìm kiếm theo tên khách hàng, mã đơn, tên thiết bị
    if (search) {
      const keyword = search.toLowerCase();
      bookings = bookings.filter(b => {
        const customerName = (b.user_id?.full_name || b.customer_info?.full_name || '').toLowerCase();
        const cameraName = (b.camera_id?.name || '').toLowerCase();
        const code = (b.booking_code || '').toLowerCase();
        const phone = (b.user_id?.phone || b.customer_info?.phone || '').toLowerCase();
        return customerName.includes(keyword) || cameraName.includes(keyword) || code.includes(keyword) || phone.includes(keyword);
      });
    }

    res.json({ bookings });
  } catch (error) {
    console.error('Admin get bookings error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  GET /api/admin/bookings/:id
//  Chi tiết 1 đơn hàng
// ─────────────────────────────────────
router.get('/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('camera_id', 'name brand images price_per_day category specs included_items')
      .populate('user_id', 'full_name email phone avatar_url');

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Admin get booking detail error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  PUT /api/admin/bookings/:id/status
//  Cập nhật trạng thái đơn hàng
// ─────────────────────────────────────
router.put('/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'paid', 'verified', 'active', 'returned', 'completed', 'cancelled', 'refunded'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    const oldStatus = booking.status;
    booking.status = status;
    if (status === 'active') {
      booking.picked_up_at = new Date();
    } else if (status === 'returned') {
      booking.returned_at = new Date();
    } else if (status === 'cancelled') {
      booking.cancelled_at = new Date();
    }
    await booking.save();

    // Cập nhật lại số lượng còn trống của camera
    const camera = await Camera.findById(booking.camera_id);
    if (camera) {
      const activeBookings = await Booking.countDocuments({
        camera_id: camera._id,
        status: { $nin: ['cancelled', 'refunded', 'completed'] },
      });
      camera.available_quantity = Math.max(0, (camera.quantity || 1) - activeBookings);
      // Cập nhật trạng thái camera
      if (camera.available_quantity === 0) {
        camera.status = 'rented';
      } else if (camera.status === 'rented') {
        camera.status = 'available';
      }
      await camera.save();
    }

    res.json({ message: 'Đã cập nhật trạng thái.', booking });
  } catch (error) {
    console.error('Admin update booking status error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  PUT /api/admin/bookings/:id/cccd
//  Quét QR CCCD + lưu thông tin vào đơn hàng
// ─────────────────────────────────────
router.put('/bookings/:id/cccd', async (req, res) => {
  try {
    const { cccd_info } = req.body;

    if (!cccd_info || !cccd_info.cccd_number) {
      return res.status(400).json({ message: 'Thiếu thông tin CCCD.' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    booking.cccd_info = cccd_info;
    booking.cccd_scanned_at = new Date();
    await booking.save();

    res.json({ message: 'Đã lưu thông tin CCCD.', booking });
  } catch (error) {
    console.error('Admin CCCD scan error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  PUT /api/admin/bookings/:id/pickup
//  Xác nhận khách nhận máy (CCCD + chuyển trạng thái active)
// ─────────────────────────────────────
router.put('/bookings/:id/pickup', async (req, res) => {
  try {
    const { cccd_info } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    if (cccd_info && cccd_info.cccd_number) {
      booking.cccd_info = cccd_info;
      booking.cccd_scanned_at = new Date();
    }
    booking.status = 'active';
    booking.picked_up_at = new Date();
    await booking.save();

    res.json({ message: 'Khách đã nhận máy thành công.', booking });
  } catch (error) {
    console.error('Admin pickup error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  PUT /api/admin/bookings/:id/return
//  Xác nhận khách trả máy (chuyển trạng thái returned)
// ─────────────────────────────────────
router.put('/bookings/:id/return', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    booking.status = 'returned';
    booking.returned_at = new Date();
    await booking.save();

    res.json({ message: 'Đã xác nhận trả máy.', booking });
  } catch (error) {
    console.error('Admin return error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ═══════════════════════════════════════
//  QUẢN LÝ THIẾT BỊ (CRUD)
// ═══════════════════════════════════════

// ─────────────────────────────────────
//  GET /api/admin/cameras
//  Danh sách thiết bị kèm trạng thái cho thuê
// ─────────────────────────────────────
router.get('/cameras', async (req, res) => {
  try {
    const cameras = await Camera.find().sort({ name: 1 });

    const camerasWithStatus = cameras.map(cam => {
      const camObj = cam.toObject();
      // Trạng thái cho thuê dựa trên số lượng còn trống
      if (cam.status === 'maintenance') {
        camObj.rental_status = 'maintenance';
      } else if ((cam.available_quantity || 0) <= 0) {
        camObj.rental_status = 'rented';
      } else {
        camObj.rental_status = 'available';
      }
      return camObj;
    });

    res.json({ cameras: camerasWithStatus });
  } catch (error) {
    console.error('Admin get cameras error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  POST /api/admin/cameras
//  Thêm thiết bị mới
// ─────────────────────────────────────
router.post('/cameras', upload.array('images', 5), async (req, res) => {
  try {
    const { name, brand, model, category, description, price_per_day, price_per_week, deposit_amount, store_id, included_items, specs, quantity } = req.body;

    if (!name || !category || !price_per_day || !deposit_amount) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
    }

    const imageUrls = req.files ? req.files.map(file => file.secure_url || file.url || file.path) : [];
    const qty = quantity ? Math.max(1, parseInt(quantity)) : 1;

    // Tìm store của user đang đăng nhập, nếu không có thì lấy store đầu tiên trong DB
    const Store = require('../models/store');
    let store = await Store.findOne({ owner_id: req.user.id });
    if (!store) {
      store = await Store.findOne(); // Lấy đại 1 cái nếu không thấy cái của mình
    }
    const finalStoreId = store ? store._id : '000000000000000000000000';

    const newCamera = new Camera({
      name, brand, model, category, description,
      price_per_day, price_per_week, deposit_amount,
      store_id: finalStoreId,
      included_items: included_items ? JSON.parse(included_items) : [],
      specs: specs ? JSON.parse(specs) : {},
      images: imageUrls,
      quantity: qty,
      available_quantity: qty,
    });

    await newCamera.save();
    res.status(201).json({ message: 'Thêm thiết bị thành công.', camera: newCamera });
  } catch (error) {
    console.error('Admin create camera error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  PUT /api/admin/cameras/:id
//  Cập nhật thông tin thiết bị
// ─────────────────────────────────────
router.put('/cameras/:id', upload.array('images', 5), async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });
    }

    const allowedFields = ['name', 'brand', 'model', 'category', 'description', 'price_per_day', 'price_per_week', 'deposit_amount', 'status', 'included_items', 'specs'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'included_items' || field === 'specs') {
           try { camera[field] = JSON.parse(req.body[field]); } catch(e) {}
        } else {
           camera[field] = req.body[field];
        }
      }
    });

    // Xử lý số lượng: khi thay đổi quantity, tính lại available_quantity
    if (req.body.quantity !== undefined) {
      const newQty = Math.max(1, parseInt(req.body.quantity));
      const oldQty = camera.quantity || 1;
      const diff = newQty - oldQty;
      camera.quantity = newQty;
      camera.available_quantity = Math.max(0, (camera.available_quantity || 0) + diff);
      // Cập nhật trạng thái dựa trên available_quantity
      if (camera.available_quantity > 0 && camera.status === 'rented') {
        camera.status = 'available';
      } else if (camera.available_quantity === 0 && camera.status === 'available') {
        camera.status = 'rented';
      }
    }

    let finalImages = camera.images || [];
    if (req.body.existing_images !== undefined) {
      try { finalImages = JSON.parse(req.body.existing_images); } catch(e) {}
    }

    const newImageUrls = req.files ? req.files.map(file => file.secure_url || file.url || file.path) : [];
    if (newImageUrls.length > 0 || req.body.existing_images !== undefined) {
      camera.images = [...finalImages, ...newImageUrls];
    }

    await camera.save();
    res.json({ message: 'Cập nhật thiết bị thành công.', camera });
  } catch (error) {
    console.error('Admin update camera error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  DELETE /api/admin/cameras/:id
//  Xóa thiết bị
// ─────────────────────────────────────
router.delete('/cameras/:id', async (req, res) => {
  try {
    // Kiểm tra có đơn hàng active nào không
    const activeBooking = await Booking.findOne({
      camera_id: req.params.id,
      status: { $in: ['active', 'paid', 'verified'] },
    });

    if (activeBooking) {
      return res.status(400).json({ message: 'Không thể xóa thiết bị đang có đơn hàng hoạt động.' });
    }

    const camera = await Camera.findByIdAndDelete(req.params.id);
    if (!camera) {
      return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });
    }

    res.json({ message: 'Đã xóa thiết bị.' });
  } catch (error) {
    console.error('Admin delete camera error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ═══════════════════════════════════════
//  QUẢN LÝ ĐÁNH GIÁ
// ═══════════════════════════════════════

const Review = require('../models/review');

// ─────────────────────────────────────
//  GET /api/admin/reviews
//  Danh sách tất cả đánh giá
// ─────────────────────────────────────
router.get('/reviews', async (req, res) => {
  try {
    const { rating, replied, camera_id } = req.query;
    const filter = {};

    if (rating) filter.rating = parseInt(rating);
    if (replied === 'yes') filter.reply_comment = { $ne: null };
    if (replied === 'no') filter.reply_comment = null;
    if (camera_id) filter.camera_id = camera_id;

    const reviews = await Review.find(filter)
      .populate('user_id', 'full_name avatar_url')
      .populate('camera_id', 'name brand images')
      .sort({ createdAt: -1 });

    // Thống kê tổng quan
    const allReviews = await Review.find();
    const stats = {
      total: allReviews.length,
      avgRating: allReviews.length > 0 ? Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 10) / 10 : 0,
      replied: allReviews.filter(r => r.reply_comment).length,
      unreplied: allReviews.filter(r => !r.reply_comment).length,
      rating5: allReviews.filter(r => r.rating === 5).length,
      rating4: allReviews.filter(r => r.rating === 4).length,
      rating3: allReviews.filter(r => r.rating === 3).length,
      rating2: allReviews.filter(r => r.rating === 2).length,
      rating1: allReviews.filter(r => r.rating === 1).length,
    };

    res.json({ reviews, stats });
  } catch (error) {
    console.error('Admin get reviews error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  PUT /api/admin/reviews/:id/reply
//  Phản hồi đánh giá
// ─────────────────────────────────────
router.put('/reviews/:id/reply', async (req, res) => {
  try {
    const { reply_comment } = req.body;
    if (!reply_comment || !reply_comment.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung phản hồi.' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá.' });
    }

    review.reply_comment = reply_comment.trim();
    review.reply_at = new Date();
    await review.save();

    res.json({ message: 'Đã phản hồi đánh giá.', review });
  } catch (error) {
    console.error('Admin reply review error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  PUT /api/admin/reviews/:id/visibility
//  Ẩn/hiện đánh giá
// ─────────────────────────────────────
router.put('/reviews/:id/visibility', async (req, res) => {
  try {
    const { is_visible } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá.' });
    }

    review.is_visible = is_visible;
    await review.save();

    res.json({ message: is_visible ? 'Đã hiện đánh giá.' : 'Đã ẩn đánh giá.', review });
  } catch (error) {
    console.error('Admin toggle review visibility error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;

