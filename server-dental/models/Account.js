const mongoose = require("mongoose");

// Hàm để lấy thời gian theo múi giờ Việt Nam dưới dạng chuỗi
const getVietnamTimeString = () => {
    const now = new Date();
    return now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
};

const accountSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["admin", "doctor", "employee"],
        required: true,
    },
    createBy: {
        type: String,
        required: true,
    },
    createAt: {
        type: String,  // Thay đổi từ Date sang String
        required: true,
        default: getVietnamTimeString, // Sử dụng chuỗi thời gian Việt Nam
    },

});

module.exports = mongoose.model("Account", accountSchema);
