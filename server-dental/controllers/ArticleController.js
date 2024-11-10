const Article = require('../models/Article');

// Hàm để lấy danh sách URL từ file ảnh
const getImageUrls = (files) => {
    if (!files || files.length === 0) {
        return null;
    }
    return files.map(file => file.path);
};

const createArticle = async (req, res) => {
    let { title, mainHeadings, createBy } = req.body;
    try {
        // Chuyển đổi mainHeadings từ chuỗi JSON sang đối tượng
        if (typeof mainHeadings === 'string') {
            mainHeadings = JSON.parse(mainHeadings);
        }

        // Validate dữ liệu bài viết
        if (!title || !mainHeadings || !createBy) {
            return res.status(400).json({ message: "Cần điền đầy đủ thông tin bài viết" });
        }

        // Xử lý hình ảnh từ req.files và gán URL vào mainHeadings
        req.files.forEach((file) => {
            const { fieldname, path } = file;
            const [level, mainIndex, subIndex, subSubIndex] = fieldname.split("_");

            if (level === "main") {
                mainHeadings[mainIndex].imageUrls = mainHeadings[mainIndex].imageUrls || [];
                mainHeadings[mainIndex].imageUrls.push(path);
            } else if (level === "sub" && subIndex !== undefined) {
                mainHeadings[mainIndex].subheadings[subIndex].imageUrls = mainHeadings[mainIndex].subheadings[subIndex].imageUrls || [];
                mainHeadings[mainIndex].subheadings[subIndex].imageUrls.push(path);
            } else if (level === "subSub" && subSubIndex !== undefined) {
                mainHeadings[mainIndex].subheadings[subIndex].subSubheadings[subSubIndex].imageUrls = mainHeadings[mainIndex].subheadings[subIndex].subSubheadings[subSubIndex].imageUrls || [];
                mainHeadings[mainIndex].subheadings[subIndex].subSubheadings[subSubIndex].imageUrls.push(path);
            }
        });

        const article = new Article({
            title,
            mainHeadings,
            createBy,
        });

        await article.save();
        return res.status(201).json({ message: "Tạo bài viết thành công", article });
    } catch (error) {
        console.error("Error in createArticle", error);
        return res.status(400).json({ message: error.message });
    }
};


module.exports = { createArticle };
