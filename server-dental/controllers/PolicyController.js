const Policy = require('../models/Policy'); // Import mô hình Policy

// Hàm lấy tất cả chính sách
const getAllPolicy = async (req, res) => {
    try {
        const policies = await Policy.find();


        if (!policies || policies.length === 0) {
            return res.status(404).json({ message: "Không có chính sách nào được tìm thấy." });
        }
        return res.status(200).json({ policies });
    } catch (error) {
        console.error("Error in get all policy", error);
        return res.status(400).json({ message: error.message });
    }
   
}
// Hàm lấy chính sách theo ID
const getPolicyById = async (req, res) => {
    const { id } = req.params;

    try {
        const policy = await Policy.findById(id);
        if (!policy) {
            return res.status(404).json({ message: "Chính sách không tồn tại" });
        }
        return res.status(200).json({ policy });
    } catch (error) {
        console.error("Lỗi khi lấy chính sách theo ID", error);
        return res.status(500).json({ message: "Lỗi khi lấy chính sách theo ID" });
    }
};

// Hàm tạo Policy
const createPolicy = async (req, res) => {
    let { title,summary, mainHeadings, createBy, createAt } = req.body;
    try {
        if (typeof mainHeadings === 'string') {
            mainHeadings = JSON.parse(mainHeadings);
        }
        const createAtDate = new Date(createAt);
        if (!title ||!summary || !mainHeadings || !createBy ||! createAt) {
            return res.status(400).json({ message: "Cần điền đầy đủ thông tin" });
        }

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

        const policy = new Policy({
            title,
            mainHeadings,
            summary,
            createBy,
            createAt: createAtDate 
        });

        await policy.save();
        return res.status(201).json({ message: "Tạo chính sách thành công", policy });
    } catch (error) {
        console.error("Lỗi khi tạo chính sách", error);
        return res.status(400).json({ message: error.message });
    }
};

// Hàm cập nhật policy
const updatePolicy = async (req, res) => {
    const { id } = req.params;
    let { title, summary, mainHeadings, createBy } = req.body;

    try {
        // Chuyển đổi mainHeadings từ chuỗi sang đối tượng nếu cần
        if (typeof mainHeadings === "string") {
            mainHeadings = JSON.parse(mainHeadings);
        }

        // Tìm chính sách theo ID
        const policy = await Policy.findById(id);
        if (!policy) {
            return res.status(404).json({ message: "Chính sách không tồn tại" });
        }

        // Cập nhật các trường mà không cần kiểm tra sự thay đổi
        policy.title = title !== undefined ? title : policy.title;
        policy.summary = summary !== undefined ? summary : policy.summary;
        policy.mainHeadings = mainHeadings !== undefined ? mainHeadings : policy.mainHeadings;
        policy.createBy = createBy !== undefined ? createBy : policy.createBy;

        // Kiểm tra và khởi tạo req.files nếu cần
        req.files = req.files || [];
        
        // Xử lý ảnh
        const imageUrls = req.files
            .filter(file => file.fieldname === "imageUrls")
            .map(file => file.path);

        // Kết hợp ảnh mới vào mảng ảnh hiện tại
        policy.imageUrls = policy.imageUrls.concat(imageUrls);

        // Kiểm tra và xử lý mainHeadings
        if (policy.mainHeadings && Array.isArray(policy.mainHeadings)) {
            req.files.forEach(file => {
                const { fieldname, path } = file;
                const [level, mainIndex, subIndex, subSubIndex] = fieldname.split("_");

                if (level === "main") {
                    policy.mainHeadings[mainIndex].imageUrls = policy.mainHeadings[mainIndex].imageUrls || [];
                    policy.mainHeadings[mainIndex].imageUrls.push(path);
                } else if (level === "sub" && subIndex !== undefined) {
                    policy.mainHeadings[mainIndex].subheadings[subIndex].imageUrls = policy.mainHeadings[mainIndex].subheadings[subIndex].imageUrls || [];
                    policy.mainHeadings[mainIndex].subheadings[subIndex].imageUrls.push(path);
                } else if (level === "subSub" && subSubIndex !== undefined) {
                    policy.mainHeadings[mainIndex].subheadings[subIndex].subSubheadings[subSubIndex].imageUrls = policy.mainHeadings[mainIndex].subheadings[subIndex].subSubheadings[subSubIndex].imageUrls || [];
                    policy.mainHeadings[mainIndex].subheadings[subIndex].subSubheadings[subSubIndex].imageUrls.push(path);
                }
            });
        }

        // Lưu chính sách đã cập nhật
        await policy.save();
        return res.status(200).json({ message: "Cập nhật chính sách thành công", policy });
    } catch (error) {
        console.error("Lỗi khi cập nhật chính sách", error);
        return res.status(400).json({ message: error.message });
    }
};





// Hàm xóa chính sách
const deletePolicy = async (req, res) => {
    const { id } = req.params;

    try {
        const policy = await Policy.findById(id);
        if (!policy) {
            return res.status(404).json({ message: "Chính sách không tồn tại" });
        }

        policy.mainHeadings.forEach(mainHeading => {
            if (mainHeading.imageUrls) {
                mainHeading.imageUrls.forEach(imagePath => {
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                });
            }

            mainHeading.subheadings?.forEach(subheading => {
                if (subheading.imageUrls) {
                    subheading.imageUrls.forEach(imagePath => {
                        if (fs.existsSync(imagePath)) {
                            fs.unlinkSync(imagePath);
                        }
                    });
                }

                subheading.subSubheadings?.forEach(subSubheading => {
                    if (subSubheading.imageUrls) {
                        subSubheading.imageUrls.forEach(imagePath => {
                            if (fs.existsSync(imagePath)) {
                                fs.unlinkSync(imagePath);
                            }
                        });
                    }
                });
            });
        });

        await Policy.findByIdAndDelete(id);
        return res.status(200).json({ message: "Chính sách đã được xóa thành công" });
    } catch (error) {
        console.error("Lỗi khi xóa chính sách", error);
        return res.status(500).json({ message: "Lỗi khi xóa chính sách" });
    }
};

module.exports = { createPolicy, updatePolicy, deletePolicy, getAllPolicy , getPolicyById};
