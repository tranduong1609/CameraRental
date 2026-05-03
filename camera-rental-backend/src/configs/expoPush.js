const { Expo } = require('expo-server-sdk');

// Tạo object Expo
let expo = new Expo();

/**
 * Hàm gửi mảng các thông báo push
 * @param {Array<{to: string, sound: string, title: string, body: string, data: object}>} messages 
 */
const sendPushNotifications = async (messages) => {
  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];
  
  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Core push notification error:', error);
    }
  }

  // Tùy chọn: Xử lý ExpoReceipts sau này nếu cấu hình chuyên sâu
  return tickets;
};

module.exports = {
  expo,
  sendPushNotifications,
};
