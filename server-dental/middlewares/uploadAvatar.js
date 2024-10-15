const { cloudinary, uploadPreset } = require("../config/cloudinaryConfig")
const multer = require("multer")
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    allowedFormats: ['jpeg', 'jpg', 'png'],
    params: {
        folder: 'Avatar',
    },

});

const uploadAvatarMiddleware = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 10 }, // 10MB
});

// Middleware để xử lý lỗi khi file vượt quá kích thước
const handleFileSizeError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Kiểm tra nếu lỗi là do file quá lớn
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "File size exceeds the limit of 10MB" });
        }
    }
    // Chuyển lỗi cho middleware error tiếp theo xử lý (nếu có)
    next(err);
};

module.exports = {
    uploadAvatarMiddleware, handleFileSizeError
};