const cloudinary = require('cloudinary');
const CloudinaryStorage = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = CloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'camera_rental', // Thư mục lưu trên Cloudinary
  allowedFormats: ['jpeg', 'png', 'jpg', 'webp'],
});

const upload = multer({ storage: storage });

module.exports = {
  cloudinary,
  upload
};
