const express = require('express');
const router = express.Router();
const Camera = require('../models/camera');
const Store = require('../models/store'); // Cần import để populate() hoạt động
const { upload } = require('../config/cloudinary'); // Import cấu hình upload ảnh

// ─────────────────────────────────────
//  GET /api/cameras/categories
//  Lấy danh sách danh mục + số lượng sản phẩm mỗi danh mục
// ─────────────────────────────────────
const CATEGORY_INFO = {
  mirrorless: { name: 'Mirrorless', icon: '📷', description: 'Máy ảnh mirrorless không gương lật' },
  dslr:       { name: 'DSLR',       icon: '📸', description: 'Máy ảnh DSLR gương lật truyền thống' },
  film:       { name: 'Film',       icon: '🎞️', description: 'Máy ảnh film cổ điển' },
  lens:       { name: 'Ống kính',   icon: '🔭', description: 'Ống kính rời các loại ngàm' },
  accessory:  { name: 'Phụ kiện',   icon: '🎒', description: 'Phụ kiện hỗ trợ chụp ảnh và quay phim' },
};

router.get('/categories', async (req, res) => {
  try {
    // Đếm số sản phẩm mỗi danh mục (chỉ đếm available và còn số lượng)
    const counts = await Camera.aggregate([
      { $match: { status: 'available', available_quantity: { $gt: 0 } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    counts.forEach(c => { countMap[c._id] = c.count; });

    const categories = Object.keys(CATEGORY_INFO).map(key => ({
      id: key,
      ...CATEGORY_INFO[key],
      productCount: countMap[key] || 0,
    }));

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  GET /api/cameras
//  Lấy danh sách sản phẩm (hỗ trợ filter, search, sort, pagination)
// ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      category,       // Lọc theo danh mục: mirrorless, dslr, film, lens, accessory
      brand,          // Lọc theo hãng: Sony, Canon, Nikon, ...
      search,         // Tìm kiếm theo tên / mô tả
      sort,           // Sắp xếp: price_asc, price_desc, rating, newest
      min_price,      // Giá tối thiểu (theo ngày)
      max_price,      // Giá tối đa (theo ngày)
      status,         // Trạng thái: available, rented, maintenance
      start_date,     // Ngày bắt đầu thuê (lọc máy trống)
      end_date,       // Ngày kết thúc thuê (lọc máy trống)
      page = 1,       // Trang hiện tại
      limit = 20,     // Số sản phẩm mỗi trang
    } = req.query;

    // Xây dựng filter
    const filter = {};

    if (category) filter.category = category;
    if (brand) filter.brand = { $regex: brand, $options: 'i' };
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ['available', 'rented'] }; // Hiện cả available và rented
    }

    // Lọc theo khoảng giá
    if (min_price || max_price) {
      filter.price_per_day = {};
      if (min_price) filter.price_per_day.$gte = Number(min_price);
      if (max_price) filter.price_per_day.$lte = Number(max_price);
    }

    // Tìm kiếm text
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    let conflictMap = {};
    // Lọc máy trống theo khoảng ngày (loại bỏ máy đã cho thuê hết số lượng trùng ngày)
    if (start_date && end_date) {
      const Booking = require('../models/booking');
      // Đếm số booking trùng ngày cho từng camera
      const conflictAgg = await Booking.aggregate([
        {
          $match: {
            status: { $nin: ['cancelled', 'refunded', 'completed', 'returned'] },
            start_date: { $lt: new Date(end_date) },
            end_date: { $gt: new Date(start_date) },
          }
        },
        { $group: { _id: '$camera_id', count: { $sum: 1 } } },
      ]);
      // Tìm những camera mà số booking trùng ngày >= quantity
      const fullyBookedIds = [];
      for (const agg of conflictAgg) {
        conflictMap[agg._id.toString()] = agg.count;
        const cam = await Camera.findById(agg._id).select('quantity');
        if (cam && agg.count >= (cam.quantity || 1)) {
          fullyBookedIds.push(agg._id);
        }
      }
      if (fullyBookedIds.length > 0) {
        filter._id = { $nin: fullyBookedIds };
      }
    }

    // Sắp xếp
    let sortOption = { createdAt: -1 }; // Mặc định: mới nhất
    if (sort === 'price_asc') sortOption = { price_per_day: 1 };
    else if (sort === 'price_desc') sortOption = { price_per_day: -1 };
    else if (sort === 'rating') sortOption = { rating_avg: -1 };
    else if (sort === 'popular') sortOption = { total_rented: -1 };

    // Phân trang
    const skip = (Number(page) - 1) * Number(limit);
    const total = await Camera.countDocuments(filter);

    const cameras = await Camera.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('store_id', 'name address');

    const processedCameras = cameras.map(cam => {
      const camObj = cam.toObject();
      if (start_date && end_date) {
        const conflictCount = conflictMap[cam._id.toString()] || 0;
        camObj.dynamic_available_quantity = Math.max(0, (cam.quantity || 1) - conflictCount);
      } else {
        camObj.dynamic_available_quantity = cam.quantity || 1;
      }
      return camObj;
    });

    res.json({
      cameras: processedCameras,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get cameras error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  GET /api/cameras/:id
//  Lấy chi tiết 1 sản phẩm
// ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const camera = await Camera.findById(req.params.id)
      .populate('store_id', 'name address phone email open_time close_time working_days');

    if (!camera) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    }

    const camObj = camera.toObject();

    if (start_date && end_date) {
      const Booking = require('../models/booking');
      const conflictCount = await Booking.countDocuments({
        camera_id: camera._id,
        status: { $nin: ['cancelled', 'refunded', 'completed', 'returned'] },
        start_date: { $lt: new Date(end_date) },
        end_date: { $gt: new Date(start_date) },
      });
      camObj.dynamic_available_quantity = Math.max(0, (camera.quantity || 1) - conflictCount);
    } else {
      camObj.dynamic_available_quantity = camera.quantity || 1;
    }

    // Lấy danh sách review
    const Review = require('../models/review');
    const reviews = await Review.find({ camera_id: camera._id, is_visible: true })
      .populate('user_id', 'full_name avatar_url')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ camera: camObj, reviews });
  } catch (error) {
    console.error('Get camera detail error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  POST /api/cameras
//  Tạo sản phẩm mới (Có hỗ trợ upload nhiều ảnh)
// ─────────────────────────────────────
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    const { 
      name, brand, model, category, description, 
      price_per_day, price_per_week, deposit_amount, store_id, 
      included_items, specs 
    } = req.body;
    
    // Lấy danh sách URL ảnh từ Cloudinary sau khi upload
    const imageUrls = req.files ? req.files.map(file => file.path) : [];

    const newCamera = new Camera({
      name,
      brand,
      model,
      category,
      description,
      price_per_day,
      price_per_week,
      deposit_amount,
      store_id, 
      images: imageUrls,
      included_items: included_items ? JSON.parse(included_items) : [],
      specs: specs ? JSON.parse(specs) : {}
    });

    await newCamera.save();
    res.status(201).json({ message: 'Thêm sản phẩm thành công', camera: newCamera });
  } catch (error) {
    console.error('Create camera error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────
//  POST /api/cameras/:id/images
//  Thêm ảnh vào sản phẩm đã có sẵn
// ─────────────────────────────────────
router.post('/:id/images', upload.array('images', 5), async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    }

    const newImageUrls = req.files ? req.files.map(file => file.path) : [];
    
    if (newImageUrls.length === 0) {
      return res.status(400).json({ message: 'Không có ảnh nào được gửi lên.' });
    }

    camera.images.push(...newImageUrls);
    await camera.save();
    
    res.json({ message: 'Thêm ảnh thành công', images: camera.images });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
