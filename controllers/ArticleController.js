const Article = require('../models/Article');
const Service = require('../models/Service')
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
const updateArticle = async (req, res) => {
    const { id } = req.params; // ID của dịch vụ
    let { title, mainHeadings, createBy } = req.body;

    try {
        // Chuyển đổi mainHeadings từ chuỗi JSON sang đối tượng nếu cần
        if (typeof mainHeadings === 'string') {
            mainHeadings = JSON.parse(mainHeadings);
        }

        // Tìm dịch vụ dựa vào ID
        const service = await Service.findById(id).populate('blog'); // Populate để lấy bài viết liên quan
        if (!service) {
            return res.status(404).json({ message: "Dịch vụ hoặc bài viết không tồn tại" });
        }

        // Lấy bài viết liên quan đến dịch vụ
        const article = await Article.findById(service.blog._id);

        if (!article) {
            return res.status(404).json({ message: "bài viết không tồn tại" });
        }

        // Cập nhật thông tin bài viết, giữ giá trị cũ nếu không có dữ liệu mới
        article.title = title || article.title;
        article.mainHeadings = mainHeadings || article.mainHeadings;
        article.createBy = createBy || article.createBy;

        // Xử lý hình ảnh từ req.files và cập nhật vào mainHeadings
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach((file) => {
                const { fieldname, path } = file;
                const [level, mainIndex, subIndex, subSubIndex] = fieldname.split("_");

                if (level === "main") {
                    article.mainHeadings[mainIndex].imageUrls = article.mainHeadings[mainIndex].imageUrls || [];
                    article.mainHeadings[mainIndex].imageUrls.push(path);
                } else if (level === "sub" && subIndex !== undefined) {
                    article.mainHeadings[mainIndex].subheadings[subIndex].imageUrls = article.mainHeadings[mainIndex].subheadings[subIndex].imageUrls || [];
                    article.mainHeadings[mainIndex].subheadings[subIndex].imageUrls.push(path);
                } else if (level === "subSub" && subSubIndex !== undefined) {
                    article.mainHeadings[mainIndex].subheadings[subIndex].subSubheadings[subSubIndex].imageUrls = article.mainHeadings[mainIndex].subheadings[subIndex].subSubheadings[subSubIndex].imageUrls || [];
                    article.mainHeadings[mainIndex].subheadings[subIndex].subSubheadings[subSubIndex].imageUrls.push(path);
                }
            });
        }

        // Lưu bài viết đã được cập nhật
        await article.save();

        return res.status(200).json({ message: "Cập nhật bài viết thành công", article });
    } catch (error) {
        console.error("Error in updateArticle", error);
        return res.status(400).json({ message: error.message });
    }
};


const deleteArticle = async (req, res) => {
    const { id } = req.params; // Lấy id của bài viết từ URL

    try {
        // Tìm bài viết theo id
        const article = await Article.findById(id);
        if (!article) {
            return res.status(404).json({ message: "Bài viết không tồn tại" });
        }

        // Xóa các hình ảnh đã lưu trong hệ thống (nếu có)
        article.mainHeadings.forEach(mainHeading => {
            if (mainHeading.imageUrls) {
                mainHeading.imageUrls.forEach(imagePath => {
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath); // Xóa file ảnh
                    }
                });
            }

            // Xử lý hình ảnh trong subheadings và subSubheadings
            mainHeading.subheadings?.forEach(subheading => {
                if (subheading.imageUrls) {
                    subheading.imageUrls.forEach(imagePath => {
                        if (fs.existsSync(imagePath)) {
                            fs.unlinkSync(imagePath); // Xóa file ảnh
                        }
                    });
                }

                subheading.subSubheadings?.forEach(subSubheading => {
                    if (subSubheading.imageUrls) {
                        subSubheading.imageUrls.forEach(imagePath => {
                            if (fs.existsSync(imagePath)) {
                                fs.unlinkSync(imagePath); // Xóa file ảnh
                            }
                        });
                    }
                });
            });
        });

        // Xóa bài viết khỏi cơ sở dữ liệu
        await Article.findByIdAndDelete(id);

        return res.status(200).json({ message: "Bài viết đã được xóa thành công" });
    } catch (error) {
        console.error("Lỗi khi xóa bài viết:", error);
        return res.status(500).json({ message: "Lỗi khi xóa bài viết" });
    }
};


module.exports = { createArticle, updateArticle , deleteArticle};