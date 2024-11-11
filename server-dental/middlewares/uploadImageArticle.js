const { cloudinary } = require("../config/cloudinaryConfig");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Hàm tạo middleware upload cho ảnh bài viết
const uploadImageArticle = (folderName = 'Article') => {
    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        allowedFormats: ['jpeg', 'jpg', 'png'],
        params: {
            folder: folderName, // Thư mục lưu trữ trên Cloudinary
        },
    });

    return multer({
        storage: storage,
        limits: { fileSize: 1024 * 1024 * 10 }, // Giới hạn kích thước file là 10MB
    }).any(); // Sử dụng .any() để chấp nhận tất cả các file không phân biệt tên trường
};


module.exports = {
    uploadImageArticle,
};
