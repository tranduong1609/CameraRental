require('dotenv').config();
const mongoose = require('mongoose');
const Camera = require('./src/models/camera');
const Store = require('./src/models/store');
const User = require('./src/models/user');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected!');

    await User.deleteMany({});
    await Store.deleteMany({});
    await Camera.deleteMany({});
    console.log('🗑️  Đã xóa data cũ');

    // ─────────────────────────────────────────
    //  TẠO CHỦ CỬA HÀNG
    // ─────────────────────────────────────────
    const owner = await User.create({
      username: 'tinacamera_owner',
      email: 'owner@tinacamera.com',
      password_hash: '$2b$10$example_hash',
      auth_provider: 'local',
      full_name: 'Chủ cửa hàng Tina Camera',
      role: 'store_owner',
      is_email_verified: true,
      is_active: true,
    });
    console.log('👤 Đã tạo tài khoản chủ cửa hàng');

    // ─────────────────────────────────────────
    //  TẠO CỬA HÀNG TINA CAMERA
    // ─────────────────────────────────────────
    const store = await Store.create({
      owner_id: owner._id,
      name: 'Tina Camera',
      description: 'Cửa hàng cho thuê máy ảnh chuyên nghiệp tại Thanh Xuân, Hà Nội. Đa dạng thiết bị từ máy ảnh mirrorless, DSLR, film đến ống kính và phụ kiện.',
      address: 'Thanh Xuân, Hà Nội',
      latitude: 20.9956,
      longitude: 105.8142,
      phone: '0901234567',
      email: 'info@tinacamera.com',
      open_time: '08:00',
      close_time: '21:00',
      working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      rating_avg: 0,
      total_reviews: 0,
      is_verified: true,
      is_active: true,
    });
    console.log('🏪 Đã tạo cửa hàng Tina Camera - Thanh Xuân');

    // ─────────────────────────────────────────
    //  DANH SÁCH SẢN PHẨM (25 sản phẩm)
    // ─────────────────────────────────────────
    const cameras = await Camera.insertMany([

      // ── MIRRORLESS (7) ──────────────────────
      {
        store_id: store._id,
        name: 'Sony Alpha A7 III',
        brand: 'Sony', model: 'ILCE-7M3', category: 'mirrorless',
        description: 'Máy ảnh full-frame mirrorless xuất sắc cho cả ảnh và video. Lý tưởng cho chụp cưới, sự kiện và chân dung.',
        specs: { sensor: 'Full Frame 24.2MP', iso: '100-51200', fps: '10fps', video: '4K 30fps', autofocus: '693 điểm', battery: '610 ảnh/sạc', weight: '650g', mount: 'Sony E-mount' },
        included_items: ['Pin NP-FZ100', 'Sạc', 'Dây đeo', 'Túi máy'],
        price_per_day: 500000, price_per_week: 2800000, deposit_amount: 5000000,
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80', 'https://res.cloudinary.com/diarntcyv/image/upload/v1775315882/93_hnlm46.jpg'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Sony Alpha A7R V',
        brand: 'Sony', model: 'ILCE-7RM5', category: 'mirrorless',
        description: 'Máy ảnh độ phân giải cực cao 61MP. Lý tưởng cho phong cảnh, kiến trúc và in ảnh khổ lớn.',
        specs: { sensor: 'Full Frame 61MP', iso: '100-32000', fps: '10fps', video: '8K 24fps', autofocus: '693 điểm', battery: '530 ảnh/sạc', weight: '723g', mount: 'Sony E-mount' },
        included_items: ['Pin NP-FZ100', 'Sạc', 'Dây đeo', 'Túi máy'],
        price_per_day: 800000, price_per_week: 4500000, deposit_amount: 8000000,
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Canon EOS R6 Mark II',
        brand: 'Canon', model: 'EOS R6 Mark II', category: 'mirrorless',
        description: 'Mirrorless tốc độ cao 40fps, lý tưởng cho thể thao và wildlife.',
        specs: { sensor: 'Full Frame 24.2MP', iso: '100-102400', fps: '40fps', video: '4K 60fps', autofocus: 'Dual Pixel CMOS AF II', battery: '760 ảnh/sạc', weight: '670g', mount: 'Canon RF' },
        included_items: ['Pin LP-E6NH', 'Sạc', 'Dây đeo', 'Túi máy'],
        price_per_day: 600000, price_per_week: 3500000, deposit_amount: 6000000,
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Canon EOS R5',
        brand: 'Canon', model: 'EOS R5', category: 'mirrorless',
        description: 'Flagship mirrorless Canon 45MP, quay 8K RAW. Lý tưởng cho nhiếp ảnh gia chuyên nghiệp.',
        specs: { sensor: 'Full Frame 45MP', iso: '100-51200', fps: '20fps', video: '8K RAW 30fps', autofocus: 'Dual Pixel CMOS AF II', battery: '490 ảnh/sạc', weight: '738g', mount: 'Canon RF' },
        included_items: ['Pin LP-E6NH x2', 'Sạc đôi', 'Dây đeo', 'Túi máy cao cấp'],
        price_per_day: 900000, price_per_week: 5000000, deposit_amount: 9000000,
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Nikon Z6 II',
        brand: 'Nikon', model: 'Z6 II', category: 'mirrorless',
        description: 'Mirrorless đa năng với hiệu năng cao trong điều kiện ánh sáng yếu.',
        specs: { sensor: 'Full Frame 24.5MP', iso: '100-51200', fps: '14fps', video: '4K 30fps', autofocus: '273 điểm', battery: '410 ảnh/sạc', weight: '705g', mount: 'Nikon Z' },
        included_items: ['Pin EN-EL15c', 'Sạc', 'Dây đeo', 'Túi máy'],
        price_per_day: 550000, price_per_week: 3000000, deposit_amount: 5500000,
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Fujifilm X-T5',
        brand: 'Fujifilm', model: 'X-T5', category: 'mirrorless',
        description: 'APS-C 40MP với màu sắc film simulation đặc trưng Fujifilm. Nhỏ gọn, chất lượng xuất sắc.',
        specs: { sensor: 'APS-C 40.2MP', iso: '125-12800', fps: '15fps', video: '6.2K 30fps', autofocus: '425 điểm', battery: '580 ảnh/sạc', weight: '557g', mount: 'Fujifilm X' },
        included_items: ['Pin NP-W235', 'Sạc', 'Dây đeo', 'Túi máy'],
        price_per_day: 450000, price_per_week: 2500000, deposit_amount: 4500000,
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Fujifilm X100V',
        brand: 'Fujifilm', model: 'X100V', category: 'mirrorless',
        description: 'Compact cao cấp ống kính cố định 23mm f/2. Thiết kế retro, lý tưởng cho street photography.',
        specs: { sensor: 'APS-C 26.1MP', iso: '160-12800', fps: '11fps', video: '4K 30fps', lens: '23mm f/2', battery: '420 ảnh/sạc', weight: '478g', mount: 'Fixed lens' },
        included_items: ['Pin NP-W126S', 'Sạc', 'Dây đeo', 'Filter UV'],
        price_per_day: 400000, price_per_week: 2200000, deposit_amount: 4000000,
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },

      // ── DSLR (4) ────────────────────────────
      {
        store_id: store._id,
        name: 'Canon EOS 5D Mark IV',
        brand: 'Canon', model: 'EOS 5D Mark IV', category: 'dslr',
        description: 'DSLR full-frame huyền thoại. Tin cậy, đa năng cho mọi thể loại nhiếp ảnh.',
        specs: { sensor: 'Full Frame 30.4MP', iso: '100-32000', fps: '7fps', video: '4K 30fps', autofocus: '61 điểm', battery: '900 ảnh/sạc', weight: '890g', mount: 'Canon EF' },
        included_items: ['Pin LP-E6N x2', 'Sạc đôi', 'Dây đeo', 'Túi máy'],
        price_per_day: 450000, price_per_week: 2500000, deposit_amount: 4500000,
        images: ['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Canon EOS 90D',
        brand: 'Canon', model: 'EOS 90D', category: 'dslr',
        description: 'DSLR APS-C 32.5MP, 10fps. Phù hợp cho người mới và semi-pro.',
        specs: { sensor: 'APS-C 32.5MP', iso: '100-25600', fps: '10fps', video: '4K 30fps', autofocus: '45 điểm', battery: '1300 ảnh/sạc', weight: '701g', mount: 'Canon EF/EF-S' },
        included_items: ['Pin LP-E6N', 'Sạc', 'Dây đeo', 'Túi máy'],
        price_per_day: 300000, price_per_week: 1700000, deposit_amount: 3000000,
        images: ['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Nikon D850',
        brand: 'Nikon', model: 'D850', category: 'dslr',
        description: 'DSLR full-frame 45.7MP, dynamic range xuất sắc. Lý tưởng cho phong cảnh và studio.',
        specs: { sensor: 'Full Frame 45.7MP', iso: '64-25600', fps: '7fps', video: '4K 30fps', autofocus: '153 điểm', battery: '1840 ảnh/sạc', weight: '1005g', mount: 'Nikon F' },
        included_items: ['Pin EN-EL15b x2', 'Sạc', 'Dây đeo', 'Túi máy cao cấp'],
        price_per_day: 500000, price_per_week: 2800000, deposit_amount: 5000000,
        images: ['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Nikon D7500',
        brand: 'Nikon', model: 'D7500', category: 'dslr',
        description: 'DSLR APS-C giá tốt. Phù hợp cho người mới và nhiếp ảnh gia nghiệp dư.',
        specs: { sensor: 'APS-C 20.9MP', iso: '100-51200', fps: '8fps', video: '4K 30fps', autofocus: '51 điểm', battery: '950 ảnh/sạc', weight: '720g', mount: 'Nikon F' },
        included_items: ['Pin EN-EL15a', 'Sạc', 'Dây đeo'],
        price_per_day: 250000, price_per_week: 1400000, deposit_amount: 2500000,
        images: ['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },

      // ── FILM (3) ────────────────────────────
      {
        store_id: store._id,
        name: 'Canon AE-1',
        brand: 'Canon', model: 'AE-1', category: 'film',
        description: 'Máy ảnh film huyền thoại thập niên 70. Dễ sử dụng, lý tưởng cho người mới chụp film.',
        specs: { type: 'SLR Film 35mm', shutter: '1/1000s-2s', mount: 'Canon FD', lens: '50mm f/1.8', film: '35mm ISO 25-3200', battery: '6V lithium', weight: '590g' },
        included_items: ['Ống kính 50mm f/1.8', 'Pin', 'Dây đeo', 'Cuộn film Kodak 200'],
        price_per_day: 150000, price_per_week: 800000, deposit_amount: 1500000,
        images: ['https://images.unsplash.com/photo-1520390138845-fd2d229dd553?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Nikon FM2',
        brand: 'Nikon', model: 'FM2', category: 'film',
        description: 'Máy ảnh film cơ học hoàn toàn, không cần pin để chụp. Bền bỉ và đáng tin cậy.',
        specs: { type: 'SLR Film 35mm', shutter: '1/4000s-Bulb', mount: 'Nikon F', lens: '50mm f/1.4', film: '35mm ISO 12-4000', weight: '540g' },
        included_items: ['Ống kính 50mm f/1.4', 'Dây đeo', 'Cuộn film Fuji 400'],
        price_per_day: 200000, price_per_week: 1100000, deposit_amount: 2000000,
        images: ['https://images.unsplash.com/photo-1520390138845-fd2d229dd553?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Contax T2',
        brand: 'Contax', model: 'T2', category: 'film',
        description: 'Compact film cao cấp huyền thoại với ống kính Carl Zeiss 38mm f/2.8.',
        specs: { type: 'Compact Film 35mm', lens: 'Carl Zeiss 38mm f/2.8', shutter: '1/500s-1s', film: '35mm ISO 25-1600', battery: 'CR2', weight: '350g' },
        included_items: ['Pin CR2', 'Dây đeo', 'Cuộn film Kodak Portra 400', 'Túi đựng'],
        price_per_day: 300000, price_per_week: 1700000, deposit_amount: 5000000,
        images: ['https://images.unsplash.com/photo-1520390138845-fd2d229dd553?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },

      // ── ỐNG KÍNH (6) ────────────────────────
      {
        store_id: store._id,
        name: 'Canon RF 24-70mm f/2.8 L IS USM',
        brand: 'Canon', model: 'RF 24-70mm f/2.8', category: 'lens',
        description: 'Ống kính zoom tiêu chuẩn chuyên nghiệp Canon RF. Sắc nét, chống rung 5 stop.',
        specs: { focal_length: '24-70mm', aperture: 'f/2.8', mount: 'Canon RF', stabilization: 'IS 5 stop', filter: '82mm', weight: '900g' },
        included_items: ['Nắp trước/sau', 'Hood', 'Túi đựng'],
        price_per_day: 300000, price_per_week: 1700000, deposit_amount: 8000000,
        images: ['https://images.unsplash.com/photo-1617005082833-1eb5856b3b24?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Sony FE 24-70mm f/2.8 GM II',
        brand: 'Sony', model: 'FE 24-70mm f/2.8 GM II', category: 'lens',
        description: 'Ống kính zoom G Master thế hệ 2, nhẹ hơn 20%. Sắc nét và nhanh.',
        specs: { focal_length: '24-70mm', aperture: 'f/2.8', mount: 'Sony E-mount', autofocus: 'XD Linear Motor', filter: '82mm', weight: '695g' },
        included_items: ['Nắp trước/sau', 'Hood', 'Túi đựng'],
        price_per_day: 350000, price_per_week: 2000000, deposit_amount: 9000000,
        images: ['https://images.unsplash.com/photo-1617005082833-1eb5856b3b24?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Sigma 35mm f/1.4 DG DN Art',
        brand: 'Sigma', model: '35mm f/1.4 DG DN Art', category: 'lens',
        description: 'Prime 35mm cực sắc nét f/1.4. Lý tưởng cho street và chân dung.',
        specs: { focal_length: '35mm', aperture: 'f/1.4', mount: 'Sony E / Leica L', filter: '67mm', weight: '645g' },
        included_items: ['Nắp trước/sau', 'Hood', 'Túi đựng'],
        price_per_day: 200000, price_per_week: 1100000, deposit_amount: 4000000,
        images: ['https://images.unsplash.com/photo-1617005082833-1eb5856b3b24?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Sony FE 85mm f/1.4 GM',
        brand: 'Sony', model: 'FE 85mm f/1.4 GM', category: 'lens',
        description: 'Ống kính chân dung G Master huyền thoại. Bokeh cực đẹp.',
        specs: { focal_length: '85mm', aperture: 'f/1.4', mount: 'Sony E-mount', filter: '77mm', weight: '820g' },
        included_items: ['Nắp trước/sau', 'Hood', 'Túi đựng'],
        price_per_day: 250000, price_per_week: 1400000, deposit_amount: 6000000,
        images: ['https://images.unsplash.com/photo-1617005082833-1eb5856b3b24?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Canon RF 70-200mm f/2.8 L IS USM',
        brand: 'Canon', model: 'RF 70-200mm f/2.8', category: 'lens',
        description: 'Tele zoom chuyên nghiệp cho thể thao, chụp cưới và sự kiện.',
        specs: { focal_length: '70-200mm', aperture: 'f/2.8', mount: 'Canon RF', stabilization: 'IS 5 stop', filter: '77mm', weight: '1070g' },
        included_items: ['Nắp trước/sau', 'Hood', 'Túi đựng', 'Collar'],
        price_per_day: 350000, price_per_week: 2000000, deposit_amount: 9000000,
        images: ['https://images.unsplash.com/photo-1617005082833-1eb5856b3b24?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Tamron 17-28mm f/2.8 Di III RXD',
        brand: 'Tamron', model: '17-28mm f/2.8', category: 'lens',
        description: 'Góc rộng zoom f/2.8 nhỏ gọn cho Sony E-mount. Lý tưởng cho phong cảnh.',
        specs: { focal_length: '17-28mm', aperture: 'f/2.8', mount: 'Sony E-mount', filter: '67mm', weight: '420g' },
        included_items: ['Nắp trước/sau', 'Hood'],
        price_per_day: 180000, price_per_week: 1000000, deposit_amount: 3500000,
        images: ['https://images.unsplash.com/photo-1617005082833-1eb5856b3b24?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },

      // ── PHỤ KIỆN (5) ────────────────────────
      {
        store_id: store._id,
        name: 'Tripod Manfrotto MT055CXPRO4',
        brand: 'Manfrotto', model: 'MT055CXPRO4', category: 'accessory',
        description: 'Chân máy carbon fiber cao cấp. Tải trọng 9kg, chiều cao 170cm.',
        specs: { material: 'Carbon Fiber', max_height: '170cm', weight: '1.9kg', load_capacity: '9kg', head: 'Ball head 498RC2' },
        included_items: ['Đầu ball head', 'Túi đựng'],
        price_per_day: 100000, price_per_week: 550000, deposit_amount: 1500000,
        images: ['https://images.unsplash.com/photo-1589803028392-411a0bbbfefb?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Flash Godox V860III',
        brand: 'Godox', model: 'V860III', category: 'accessory',
        description: 'Flash TTL Li-ion HSS 1/8000s. Hỗ trợ Canon, Nikon, Sony.',
        specs: { guide_number: 'GN60', hss: '1/8000s', recycle_time: '1.5s', battery: 'Li-ion 2000mAh', flash_times: '650 lần/sạc', weight: '500g' },
        included_items: ['Pin Li-ion', 'Sạc USB-C', 'Diffuser', 'Túi đựng'],
        price_per_day: 80000, price_per_week: 450000, deposit_amount: 1200000,
        images: ['https://images.unsplash.com/photo-1589803028392-411a0bbbfefb?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'DJI RS 3 Pro Gimbal',
        brand: 'DJI', model: 'RS 3 Pro', category: 'accessory',
        description: 'Gimbal 3 trục chuyên nghiệp. Tải trọng 4.5kg, pin 12 tiếng.',
        specs: { payload: '4.5kg', battery_life: '12 tiếng', axis: '3 trục', display: 'OLED 1.8"', weight: '1.3kg' },
        included_items: ['Sạc USB-C', 'Phụ kiện gắn', 'Túi đựng', 'Focus Motor'],
        price_per_day: 200000, price_per_week: 1100000, deposit_amount: 4000000,
        images: ['https://images.unsplash.com/photo-1589803028392-411a0bbbfefb?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Balo Lowepro ProTactic 450 AW II',
        brand: 'Lowepro', model: 'ProTactic 450 AW II', category: 'accessory',
        description: 'Balo chuyên nghiệp chứa 2 thân + 4-6 ống kính. Chống nước.',
        specs: { dimensions: '34×25×50cm', laptop: '15"', material: 'Nylon chống nước', weight: '1.9kg' },
        included_items: ['Rain Cover', 'Dây đeo ngực', 'Dây đeo hông'],
        price_per_day: 80000, price_per_week: 450000, deposit_amount: 800000,
        images: ['https://images.unsplash.com/photo-1589803028392-411a0bbbfefb?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
      {
        store_id: store._id,
        name: 'Rode VideoMic Pro+',
        brand: 'Rode', model: 'VideoMic Pro+', category: 'accessory',
        description: 'Micro shotgun gắn máy ảnh. Âm thanh sắc nét cho quay video.',
        specs: { type: 'Shotgun condenser', frequency: '20Hz-20kHz', battery: 'AA hoặc USB-C', battery_life: '100 tiếng', weight: '122g' },
        included_items: ['Dây 3.5mm', 'Dead cat windshield', 'Shock mount', 'Túi đựng'],
        price_per_day: 80000, price_per_week: 450000, deposit_amount: 1000000,
        images: ['https://images.unsplash.com/photo-1589803028392-411a0bbbfefb?w=800&q=80'], status: 'available', rating_avg: 0, total_reviews: 0, total_rented: 0,
      },
    ]);

    console.log('📷 Đã tạo', cameras.length, 'sản phẩm');
    console.log('\n🎉 Seed data hoàn tất!');
    console.log('─────────────────────────────────────');
    console.log('🏪 Cửa hàng: Tina Camera - Thanh Xuân, Hà Nội');
    console.log('📷 Tổng sản phẩm:', cameras.length);
    console.log('   ├── Mirrorless: 7');
    console.log('   ├── DSLR:       4');
    console.log('   ├── Film:       3');
    console.log('   ├── Ống kính:   6');
    console.log('   └── Phụ kiện:   5');
    console.log('─────────────────────────────────────');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi seed data:', error);
    process.exit(1);
  }
};

seedData();
