const Article = require('../models/Article');

const getImageUrls = (files, res) => {
    if (!files || files.length === 0) {
        return res.status(400).json("Cần có ít nhất một hình ảnh minh họa cho bài viết");
    }
    return files.map(file => file.path);
};

const createArticle = async (req, res) => {

    let { title, mainHeadings, createBy } = req.body;
    try {


        if (typeof mainHeadings === 'string') {
            mainHeadings = JSON.parse(mainHeadings);
        }

        // Validate article data
        if (!title || !mainHeadings || !createBy) {
            return res.status(400).json({ message: "Cần điền đầy đủ thông tin bài viết" });
        }

        // Get image URLs
        const imageUrls = getImageUrls(req.files, res);


        const article = new Article({
            title,
            mainHeadings,
            createBy,
            imageUrls
        });

        await article.save();
        return res.status(201).json({ message: "tạo bài viết thành công", article });
    } catch (error) {
        console.error("Error in createArticle", error)

        return res.status(400).json({ message: error.message });
    }
};

module.exports = { createArticle };
