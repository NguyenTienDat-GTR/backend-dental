const mongoose = require('mongoose');

const getVietnamTimeString = () => {
    const now = new Date();
    return now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
};

const SubSubheadingSchema = new mongoose.Schema({
    title: String,
    content: String,
    imageUrls: [String]  // Hình ảnh cho tiểu mục cấp ba
});

const SubheadingSchema = new mongoose.Schema({
    title: String,
    content: String,
    subSubheadings: [SubSubheadingSchema],
    imageUrls: [String]  // Hình ảnh cho tiểu mục cấp hai
});

const MainHeadingSchema = new mongoose.Schema({
    title: String,
    content: String,
    subheadings: [SubheadingSchema],
    imageUrls: [String]  // Hình ảnh cho mục lớn
});

const PolicySchema = new mongoose.Schema({
    title: String,
    summary:String,
    mainHeadings: [MainHeadingSchema],
    createBy: {
        type: String,
        required: true,
    },
    createAt: {
        type: String,
        required: true,
        default: getVietnamTimeString,
    },
    imageUrls: [String]  // Hình ảnh cho toàn bài viết
});

module.exports = mongoose.model('Policy', PolicySchema);