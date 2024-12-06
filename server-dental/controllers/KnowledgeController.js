const Knowledge = require("../models/Knowledge");

const createKnowledge = async (req, res) => {
    try {
        let {title, summary, mainHeadings, createBy, createAt} = req.body;


        const imageUrls = getImageUrls(req.files, res, 'categoryImages');
        if (!imageUrls) return;

        const knowledgeImages = getImageUrls(req.files, res, 'knowledgeImages');
        if (!knowledgeImages) return;

        if (typeof mainHeadings === 'string') {
            mainHeadings = JSON.parse(mainHeadings);
        }

        const createAtDate = new Date(createAt);
        if (!title || !summary || !mainHeadings || !createBy || !createAt) {
            return res.status(400).json({message: "Cần điền đầy đủ thông tin"});
        }

        req.files.forEach((file) => {
            const {fieldname, path} = file;
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
        mainHeadings.forEach((heading) => {
            heading.imageUrls = heading.imageUrls.filter((url) => typeof url === "string"); // Chỉ giữ các chuỗi
            heading.subheadings?.forEach((sub) => {
                sub.imageUrls = sub.imageUrls.filter((url) => typeof url === "string");
                sub.subSubheadings?.forEach((subSub) => {
                    subSub.imageUrls = subSub.imageUrls.filter((url) => typeof url === "string");
                });
            });
        });

        const knowledge = new Knowledge({
            title,
            summary,
            mainHeadings,
            createBy,
            imageUrls,
            knowledgeImages,
            createAt: createAtDate,
        });

        await knowledge.save();

        res.status(201).json({
            message: 'Kiến thức đã được tạo thành công!',
            data: knowledge,
        });
    } catch (error) {
        console.error("Error in create service", error);
        return res.status(400).json({message: error.message});
    }
};


const getImageUrls = (files, res) => {
    // Kiểm tra nếu có tệp tin được tải lên
    if (!files || files.length === 0) {
        return res.status(400).json("Cần có ít nhất một hình ảnh minh họa cho dịch vụ");
    }

    // Lấy URL hình ảnh từ các tệp tin
    const imageUrls = files.map(file => file.path);
    return imageUrls;
};

const getVietnamTimeString = () => {
    const now = new Date();
    return now.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"});
};

const getAllKnowledge = async (req, res) => {
    try {
        const konwledges = await Knowledge.find();
        res.status(200).json({
            message: "Lấy danh sách kiến thức thành công",
            data: konwledges,
        });
    } catch (error) {
        console.error("Error in getAllKnowledge", error);
        res.status(500).json({message: error.message});
    }
};

const getKnowledgeById = async (req, res) => {
    try {
        const {id} = req.params;
        const knowledge = await Knowledge.findById(id);

        if (!knowledge) {
            return res.status(404).json({message: "Không tìm thấy kiến thức"});
        }

        res.status(200).json({
            message: "Lấy kiến thức thành công",
            data: knowledge,
        });
    } catch (error) {
        console.error("Error in getKnowledgeById", error);
        res.status(500).json({message: error.message});
    }
};

const deleteKnowledge = async (req, res) => {
    try {
        const {id} = req.params;
        const deletedKnowledge = await Knowledge.findByIdAndDelete(id);

        if (!deletedKnowledge) {
            return res.status(404).json({message: "Không tìm thấy kiến thức để xóa"});
        }

        res.status(200).json({
            message: "Xóa kiến thức thành công",
            data: deletedKnowledge,
        });
    } catch (error) {
        console.error("Error in deleteKnowledge", error);
        res.status(500).json({message: error.message});
    }
};

const updateKnowledge = async (req, res) => {
    try {
        const {id} = req.params;
        const {title, summary, mainHeadings, createBy} = req.body;

        // Kiểm tra nếu có tệp tin mới được tải lên
        const newImageUrls = req.files ? getImageUrls(req.files, res) : null;

        // Tìm và cập nhật kiến thức
        const updatedKnowledge = await Knowledge.findByIdAndUpdate(
            id,
            {
                $set: {
                    title: title || undefined, // Giữ nguyên nếu không thay đổi
                    summary: summary || undefined,
                    mainHeadings: mainHeadings || undefined,
                    createBy: createBy || undefined,
                    imageUrls: newImageUrls || undefined, // Cập nhật nếu có tệp tin mới
                },
            },
            {new: true, omitUndefined: true} // Trả về bản ghi sau khi cập nhật, bỏ qua các trường không thay đổi
        );

        if (!updatedKnowledge) {
            return res.status(404).json({message: "Không tìm thấy kiến thức để cập nhật"});
        }

        res.status(200).json({
            message: "Cập nhật kiến thức thành công",
            data: updatedKnowledge,
        });
    } catch (error) {
        console.error("Error in updateKnowledge", error);
        res.status(500).json({message: error.message});
    }
};

module.exports = {
    createKnowledge, getAllKnowledge, getKnowledgeById,
    deleteKnowledge, updateKnowledge

};