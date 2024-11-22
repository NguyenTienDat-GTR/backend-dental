const mongoose = require("mongoose");

// Hàm để lấy thời gian theo múi giờ Việt Nam dưới dạng chuỗi
const getVietnamTimeString = () => {
  const now = new Date();
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  return now.toLocaleString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", ...options }).replace(',', '');
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
  isActive: {
    type: Boolean,
    require: true,
    default: true,
  },
  createBy: {
    type: String,
    required: true,
  },
  createAt: {
    type: String, // Thay đổi từ Date sang String
    required: true,
    default: getVietnamTimeString, // Sử dụng chuỗi thời gian Việt Nam
  },
});

module.exports = mongoose.model("Account", accountSchema);
