const cron = require('node-cron');
const Booking = require('../models/booking');
const User = require('../models/user');
const Notification = require('../models/notification');
const { sendPushNotifications, expo } = require('../configs/expoPush');

// Helper để push + tạo db notification
const notifyUsers = async (userIds, title, body, type, data) => {
  const users = await User.find({ _id: { $in: userIds } });
  
  const dbNotifs = [];
  const pushMessages = [];

  users.forEach((user) => {
    dbNotifs.push({
      user_id: user._id,
      title,
      body,
      type,
      data,
    });

    if (user.expo_push_token && expo.isExpoPushToken(user.expo_push_token)) {
      pushMessages.push({
        to: user.expo_push_token,
        sound: 'default',
        title,
        body,
        data,
      });
    }
  });

  if (dbNotifs.length > 0) {
    await Notification.insertMany(dbNotifs);
  }
  
  if (pushMessages.length > 0) {
    await sendPushNotifications(pushMessages);
  }
};

const startCronJobs = () => {
  console.log('Cron jobs started...');
  
  // Chạy mỗi giờ một lần: '0 * * * *'
  // Chạy mỗi phút (để test dễ): '* * * * *'
  // Khuyến nghị prod: chạy mỗi 30 phút -> '*/30 * * * *'
  cron.schedule('*/30 * * * *', async () => {
    try {
      const now = new Date();
      // Nhắc lấy máy (24h tới)
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const pickupBookings = await Booking.find({
        status: { $in: ['paid', 'verified'] },
        pickup_reminded: false,
        start_date: { $lte: next24h, $gte: now },
      }).populate('camera_id');

      if (pickupBookings.length > 0) {
        const storeOwners = await User.find({ role: 'store_owner' }).select('_id');
        const ownerIds = storeOwners.map(u => u._id);

        for (const booking of pickupBookings) {
          const cameraName = booking.camera_id?.name || 'thiết bị';

          // Thông báo cho khách hàng
          await notifyUsers(
            [booking.user_id],
            'Đến hạn nhận máy',
            `Đơn thuê ${cameraName} của bạn sẽ đến hạn nhận máy trong vòng 24H tới.`,
            'pickup_reminder',
            { booking_id: booking._id }
          );

          // Thông báo cho chủ cửa hàng
          await notifyUsers(
            ownerIds,
            'Sắp đến thời gian giao máy',
            `Đơn thuê ${cameraName} (Mã: ${booking.booking_code}) sắp đến hạn giao máy cho khách trong vòng 24H tới. Vui lòng chuẩn bị thiết bị.`,
            'pickup_reminder',
            { booking_id: booking._id }
          );

          booking.pickup_reminded = true;
          await booking.save();
        }
      }

      // Nhắc trả máy (24h tới)
      const returnBookings = await Booking.find({
        status: 'active',
        return_reminded: false,
        end_date: { $lte: next24h, $gte: now },
      }).populate('camera_id');

      if (returnBookings.length > 0) {
        const storeOwners = await User.find({ role: 'store_owner' }).select('_id');
        const ownerIds = storeOwners.map(u => u._id);

        for (const booking of returnBookings) {
          const cameraName = booking.camera_id?.name || 'thiết bị';

          // Thông báo cho khách hàng
          await notifyUsers(
            [booking.user_id],
            'Gần đến hạn trả máy',
            `Đơn thuê ${cameraName} sắp đến hạn trả. Vui lòng sắp xếp thời gian trả máy.`,
            'return_reminder',
            { booking_id: booking._id }
          );

          // Thông báo cho chủ cửa hàng
          await notifyUsers(
            ownerIds,
            'Sắp đến thời gian nhận lại máy',
            `Đơn thuê ${cameraName} (Mã: ${booking.booking_code}) sắp đến hạn trả. Vui lòng chuẩn bị tiếp nhận thiết bị từ khách.`,
            'return_reminder',
            { booking_id: booking._id }
          );

          booking.return_reminded = true;
          await booking.save();
        }
      }

    } catch (error) {
      console.error('Cron job error:', error);
    }
  });
};

module.exports = { startCronJobs };
