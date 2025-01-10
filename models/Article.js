const mongoose = require('mongoose');

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

const ArticleSchema = new mongoose.Schema({
    title: String,
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

module.exports = mongoose.model('Article', ArticleSchema);
