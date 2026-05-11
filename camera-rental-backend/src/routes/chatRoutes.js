const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Camera = require('../models/camera');

// Khởi tạo Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Cache danh sách sản phẩm (refresh mỗi 10 phút)
let cachedProducts = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 phút

async function getProductContext(userMessage = "") {
  const now = Date.now();

  // 1. Lấy toàn bộ sản phẩm từ DB (hoặc Cache)
  let allCameras = [];
  if (cachedProducts && now - cacheTime < CACHE_TTL) {
    allCameras = cachedProducts;
  } else {
    allCameras = await Camera.find({ status: 'available' })
      .select('name brand category price_per_day deposit_amount')
      .lean();
    cachedProducts = allCameras;
    cacheTime = now;
  }

  // 2. Lọc sản phẩm dựa trên từ khóa trong tin nhắn người dùng
  const query = userMessage.toLowerCase();
  let filtered = allCameras;

  if (query) {
    filtered = allCameras.filter(cam =>
      query.includes(cam.brand.toLowerCase()) ||
      query.includes(cam.category.toLowerCase()) ||
      cam.name.toLowerCase().split(' ').some(word => query.includes(word))
    );
  }

  // 3. Nếu không tìm thấy máy nào khớp, lấy đại diện 5 máy hot nhất để gợi ý
  if (filtered.length === 0) {
    filtered = allCameras.slice(0, 5);
  }

  // 4. Format lại thành chuỗi (Giới hạn tối đa 10 máy để tiết kiệm Token)
  return filtered.slice(0, 10).map(cam =>
    `- ${cam.name} (${cam.brand}): ${cam.price_per_day?.toLocaleString('vi-VN')}đ/ngày (Cọc: ${cam.deposit_amount?.toLocaleString('vi-VN')}đ)`
  ).join('\n');
}

// Helper: gọi Gemini với retry khi bị rate limit
async function callGeminiWithRetry(chat, message, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await chat.sendMessage(message);
      return result.response.text();
    } catch (error) {
      const isRateLimit = error.status === 429 ||
        error.message?.includes('RESOURCE_EXHAUSTED') ||
        error.message?.includes('429');

      if (isRateLimit && attempt < maxRetries) {
        // Chờ trước khi retry (3s, rồi 6s)
        const waitTime = (attempt + 1) * 3000;
        console.log(`⏳ Rate limited, retrying in ${waitTime / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
}

// ─────────────────────────────────────
//  POST /api/chat
//  Gửi tin nhắn cho ChatBot
//  Body: { message: string, history: [{ role, text }] }
// ─────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Tin nhắn không được để trống.' });
    }

    // Lấy dữ liệu sản phẩm làm ngữ cảnh
    const productList = await getProductContext(message);

    const systemPrompt = `Bạn là TinaBot – trợ lý tư vấn của TinaCamera, dịch vụ cho thuê máy ảnh.

QUY TẮC:
- Trả lời tiếng Việt, thân thiện, ngắn gọn.
- Tư vấn thuê máy ảnh, lens, phụ kiện dựa trên nhu cầu (loại chụp, ngân sách, kinh nghiệm).
- Trả lời cực kỳ ngắn gọn (dưới 3 câu).
- Chỉ tập trung vào thông tin thuê máy.
- Ngoài phạm vi → hướng dẫn gọi hotline 0899259410.

SẢN PHẨM:
${productList || 'Chưa có sản phẩm.'}

DỊCH VỤ: Hotline 0899259410 (8h-22h), đặt cọc hoàn trả, phụ kiện miễn phí, giao nhận tận nơi.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      }
    });
    // Chuyển đổi lịch sử chat sang format Gemini
    const chatHistory = history.map(msg => ({
      role: msg.role === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({
      history: chatHistory
    });

    const response = await callGeminiWithRetry(chat, message);
    res.json({ reply: response });
  } catch (error) {
    console.error('Chat API error:', error.message);

    // Trả lỗi cụ thể hơn cho rate limit
    const isRateLimit = error.status === 429 ||
      error.message?.includes('RESOURCE_EXHAUSTED');

    if (isRateLimit) {
      return res.status(429).json({
        message: 'Hệ thống đang bận, vui lòng thử lại sau vài giây nhé! ⏳',
      });
    }

    res.status(500).json({
      message: 'Xin lỗi, hệ thống chatbot đang gặp sự cố. Vui lòng thử lại sau hoặc gọi hotline 0899259410.',
    });
  }
});

module.exports = router;
