const { cloudinary } = require("../config/cloudinaryConfig");
const multer = require("multer");
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Hàm tạo middleware upload với thư mục tùy chỉnh
const uploadAvatarMiddleware = (folderName = 'Avatar') => {
    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        allowedFormats: ['jpeg', 'jpg', 'png'],
        params: {
            folder: folderName, // Đặt tên thư mục từ tham số đầu vào
        },
    });

    return multer({
        storage: storage,
        limits: { fileSize: 1024 * 1024 * 10 }, // 10MB
    });
};

// Middleware để xử lý lỗi khi file vượt quá kích thước
const handleFileSizeError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "File size exceeds the limit of 10MB" });
        }
    }
    next(err);
};

module.exports = {
    uploadAvatarMiddleware,
    handleFileSizeError
};
