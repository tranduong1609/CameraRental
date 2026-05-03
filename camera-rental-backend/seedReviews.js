require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const Camera = require('./src/models/camera');
const Booking = require('./src/models/booking');
const Review = require('./src/models/review');
const Store = require('./src/models/store');

// ─────────────────────────────────────
//  Dữ liệu tài khoản ảo
// ─────────────────────────────────────
const fakeUsers = [
  { username: 'nguyenvanan', email: 'an.nguyen@gmail.com', full_name: 'Nguyễn Văn An', phone: '0912345678' },
  { username: 'tranthimai', email: 'mai.tran@gmail.com', full_name: 'Trần Thị Mai', phone: '0923456789' },
  { username: 'lehoangnam', email: 'nam.le@gmail.com', full_name: 'Lê Hoàng Nam', phone: '0934567890' },
  { username: 'phamducminh', email: 'minh.pham@gmail.com', full_name: 'Phạm Đức Minh', phone: '0945678901' },
  { username: 'vothihuong', email: 'huong.vo@gmail.com', full_name: 'Võ Thị Hương', phone: '0956789012' },
  { username: 'doanquocbao', email: 'bao.doan@gmail.com', full_name: 'Đoàn Quốc Bảo', phone: '0967890123' },
  { username: 'ngothanhthao', email: 'thao.ngo@gmail.com', full_name: 'Ngô Thanh Thảo', phone: '0978901234' },
  { username: 'buigiahuy', email: 'huy.bui@gmail.com', full_name: 'Bùi Gia Huy', phone: '0989012345' },
];

// ─────────────────────────────────────
//  Mẫu đánh giá tích cực theo loại sản phẩm
// ─────────────────────────────────────
const reviewTemplates = {
  mirrorless: [
    { rating: 5, comment: 'Máy chụp rất đẹp, lấy nét cực nhanh. Mình thuê để chụp cưới rất ưng ý!' },
    { rating: 5, comment: 'Chất lượng ảnh xuất sắc, đặc biệt trong điều kiện ánh sáng yếu. Sẽ thuê lại!' },
    { rating: 4, comment: 'Máy mới, sạch sẽ. Phụ kiện đi kèm đầy đủ. Chủ shop nhiệt tình.' },
    { rating: 5, comment: 'Thuê để đi du lịch Đà Lạt, ảnh ra quá đẹp! Cảm ơn shop rất nhiều.' },
    { rating: 4, comment: 'Máy hoạt động tốt, màu sắc chính xác. Giao nhận nhanh chóng.' },
    { rating: 5, comment: 'Lần đầu thuê mirrorless, rất hài lòng. Autofocus nhanh, video 4K mượt mà.' },
  ],
  dslr: [
    { rating: 5, comment: 'Máy DSLR chất lượng, pin trâu. Chụp cả ngày không lo hết pin.' },
    { rating: 4, comment: 'Chất lượng ảnh rất tốt, cầm chắc tay. Phù hợp cho người mới.' },
    { rating: 5, comment: 'Thuê chụp sự kiện rất ổn. Máy bền, không gặp lỗi gì.' },
    { rating: 5, comment: 'Giá thuê hợp lý, máy trong tình trạng tốt. Highly recommend!' },
    { rating: 4, comment: 'Ảnh sắc nét, dynamic range tốt. Chụp phong cảnh đẹp ngất ngây.' },
  ],
  film: [
    { rating: 5, comment: 'Máy film chất lượng, tone ảnh cực đẹp! Rất thích phong cách retro.' },
    { rating: 5, comment: 'Thuê chụp film lần đầu, ra ảnh đẹp bất ngờ. Shop tư vấn nhiệt tình.' },
    { rating: 4, comment: 'Máy cũ nhưng hoạt động tốt, có cả cuộn film đi kèm. Trải nghiệm thú vị.' },
    { rating: 5, comment: 'Ảnh film có soul riêng, không filter nào bằng. Sẽ thuê thêm!' },
  ],
  lens: [
    { rating: 5, comment: 'Ống kính cực sắc, bokeh mượt. Chụp chân dung xóa phông đẹp lắm!' },
    { rating: 5, comment: 'Lens sạch sẽ, không bụi. AF nhanh và chính xác. Rất hài lòng.' },
    { rating: 4, comment: 'Thuê ống kính test trước khi mua, chất lượng đúng như kỳ vọng.' },
    { rating: 5, comment: 'Build quality tốt, ảnh sắc nét từ góc đến góc. Worth every penny!' },
    { rating: 4, comment: 'Ống kính tốt, giá thuê hợp lý hơn nhiều so với mua. Sẽ quay lại.' },
  ],
  accessory: [
    { rating: 5, comment: 'Phụ kiện chất lượng, hoạt động ổn định. Giao nhận tiện lợi.' },
    { rating: 4, comment: 'Thuê phụ kiện đi kèm máy ảnh, rất tiện. Shop chuyên nghiệp.' },
    { rating: 5, comment: 'Sản phẩm mới, sạch sẽ. Hướng dẫn sử dụng rõ ràng.' },
    { rating: 5, comment: 'Giá thuê rẻ, chất lượng tốt. Sẽ giới thiệu bạn bè thuê.' },
  ],
};

// ─────────────────────────────────────
//  Hàm tạo mã booking ngẫu nhiên
// ─────────────────────────────────────
let bookingCounter = 1000;
const genBookingCode = () => `CR2026${String(++bookingCounter).padStart(4, '0')}`;

const seedReviews = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected!');

    // Xóa review + booking + user ảo cũ (nếu chạy lại)
    const fakeEmails = fakeUsers.map(u => u.email);
    const existingFakeUsers = await User.find({ email: { $in: fakeEmails } });
    const fakeUserIds = existingFakeUsers.map(u => u._id);
    if (fakeUserIds.length > 0) {
      await Review.deleteMany({ user_id: { $in: fakeUserIds } });
      await Booking.deleteMany({ user_id: { $in: fakeUserIds } });
      await User.deleteMany({ _id: { $in: fakeUserIds } });
      console.log('🗑️  Đã dọn dữ liệu ảo cũ');
    }

    // Lấy store
    const store = await Store.findOne();
    if (!store) {
      console.error('❌ Không tìm thấy store nào!');
      process.exit(1);
    }

    // Tạo users ảo
    const createdUsers = await User.insertMany(
      fakeUsers.map(u => ({
        ...u,
        password_hash: '$2b$10$fakeHashForSeedData000000000000000000000000',
        auth_provider: 'local',
        role: 'customer',
        is_email_verified: true,
        is_active: true,
      }))
    );
    console.log(`👤 Đã tạo ${createdUsers.length} tài khoản khách hàng ảo`);

    // Lấy tất cả cameras
    const cameras = await Camera.find();
    console.log(`📷 Tìm thấy ${cameras.length} sản phẩm`);

    let totalBookings = 0;
    let totalReviews = 0;

    for (const camera of cameras) {
      const templates = reviewTemplates[camera.category] || reviewTemplates.accessory;
      // Mỗi camera lấy 2-3 review ngẫu nhiên
      const numReviews = 2 + Math.floor(Math.random() * 2); // 2 hoặc 3
      const shuffled = [...templates].sort(() => Math.random() - 0.5);
      const selectedReviews = shuffled.slice(0, numReviews);

      for (let i = 0; i < selectedReviews.length; i++) {
        const user = createdUsers[(totalReviews + i) % createdUsers.length];
        const reviewData = selectedReviews[i];

        // Tạo ngày ngẫu nhiên trong 3 tháng qua
        const daysAgo = 7 + Math.floor(Math.random() * 80);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1 + Math.floor(Math.random() * 4));
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

        // Tạo booking hoàn tất
        const booking = await Booking.create({
          booking_code: genBookingCode(),
          user_id: user._id,
          camera_id: camera._id,
          camera_snapshot: { name: camera.name, brand: camera.brand },
          store_id: store._id,
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          price_per_day: camera.price_per_day,
          subtotal: camera.price_per_day * totalDays,
          deposit_amount: camera.deposit_amount,
          total_amount: camera.price_per_day * totalDays,
          paid_amount: camera.price_per_day * totalDays,
          remaining_amount: 0,
          payment_type: 'full',
          status: 'completed',
          picked_up_at: startDate,
          returned_at: endDate,
          customer_info: { full_name: user.full_name, phone: user.phone, email: user.email },
        });
        totalBookings++;

        // Tạo review
        const reviewDate = new Date(endDate);
        reviewDate.setDate(reviewDate.getDate() + Math.floor(Math.random() * 3));
        await Review.create({
          booking_id: booking._id,
          user_id: user._id,
          camera_id: camera._id,
          store_id: store._id,
          rating: reviewData.rating,
          comment: reviewData.comment,
          is_visible: true,
          createdAt: reviewDate,
          updatedAt: reviewDate,
        });
        totalReviews++;
      }

      // Cập nhật rating_avg và total_reviews cho camera
      const cameraReviews = await Review.find({ camera_id: camera._id });
      const avgRating = cameraReviews.reduce((sum, r) => sum + r.rating, 0) / cameraReviews.length;
      await Camera.findByIdAndUpdate(camera._id, {
        rating_avg: Math.round(avgRating * 10) / 10,
        total_reviews: cameraReviews.length,
        total_rented: cameraReviews.length,
      });
    }

    // Cập nhật rating cho store
    const allReviews = await Review.find({ store_id: store._id });
    if (allReviews.length > 0) {
      const storeAvg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await Store.findByIdAndUpdate(store._id, {
        rating_avg: Math.round(storeAvg * 10) / 10,
        total_reviews: allReviews.length,
      });
    }

    console.log('\n🎉 Seed reviews hoàn tất!');
    console.log('─────────────────────────────────────');
    console.log(`👤 Tài khoản ảo: ${createdUsers.length}`);
    console.log(`📦 Đơn hàng ảo:  ${totalBookings}`);
    console.log(`⭐ Đánh giá:     ${totalReviews}`);
    console.log('─────────────────────────────────────');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
};

seedReviews();
