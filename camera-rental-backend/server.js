require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
// Cấu hình CORS
const allowedOrigins = [
    'https://camera-rental-alpha.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
];

if (process.env.FRONTEND_URL) {
    const envOrigins = process.env.FRONTEND_URL.split(',').map(o => o.trim());
    envOrigins.forEach(o => {
        if (o && !allowedOrigins.includes(o)) allowedOrigins.push(o);
    });
}

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Global Request Logger
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST') console.log('📦 Body type:', typeof req.body);
    next();
});

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected!'))
    .catch(err => console.log('❌ Lỗi:', err));

// Routes
const authRoutes = require('./src/routes/authRoutes');
const cameraRoutes = require('./src/routes/cameraRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const sepayRoutes = require('./src/routes/sepayRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const superAdminRoutes = require('./src/routes/superAdminRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');

const { startCronJobs } = require('./src/cron/reminders');

app.use('/api/auth', authRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payment/sepay', sepayRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/notifications', notificationRoutes);

// Khởi động các cron jobs ngầm
startCronJobs();

// Test route
app.get('/', (req, res) => {
    res.json({ message: '🎉 Camera Rental API đang chạy!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
}); 
