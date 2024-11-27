const ServiceType = require("../models/ServiceType");

const getAllServiceTypes = async (req, res) => {
    try {
        const category = await ServiceType.find().populate("serviceList");
        if (!category) {
            return res
                .status(400)
                .json({ message: "Không tìm thấy loại dịch vụ nào" });
        }
        return res.status(200).json(category);
    } catch (error) {
        console.error("Error in get all service type", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const createServiceType = async (req, res) => {
    try {
        const { typeName, serviceList = [] } = req.body;

        if (!typeName) {
            return res.status(400).json({ message: "Cần điền đầy đủ thông tin" });
        }

        if (await ServiceType.findOne({ typeName })) {
            return res.status(400).json({ message: "Loại dịch vụ đã tồn tại" });
        }

        const serviceType = new ServiceType({ typeName, serviceList });
        await serviceType.save();
        return res.status(200).json({ serviceType, message: "Thêm loại dịch vụ mới thành công" });
    } catch (error) {
        console.error("Error in create service type", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
const deleteServiceType = async (req, res) => {
    try {
        const { id } = req.params;

        // Tìm loại dịch vụ theo ID
        const serviceType = await ServiceType.findById(id).populate("serviceList");
        if (!serviceType) {
            return res.status(404).json({ message: "Loại dịch vụ không tồn tại" });
        }

        // Xóa tất cả dịch vụ trong serviceList
        for (const service of serviceType.serviceList) {
            // Xóa bài viết liên kết nếu có
            if (service.blog) {
                const article = await Article.findById(service.blog);
                if (article) {
                    await article.deleteOne();
                    console.log(`Bài viết ${service.blog} đã được xóa`);
                }
            }

            // Xóa dịch vụ
            await Service.findByIdAndDelete(service._id);
            console.log(`Dịch vụ ${service._id} đã được xóa`);
        }

        // Xóa loại dịch vụ
        await serviceType.deleteOne();
        console.log(`Loại dịch vụ ${id} đã được xóa`);

        return res.status(200).json({ message: "Loại dịch vụ và các dữ liệu liên quan đã được xóa thành công" });
    } catch (error) {
        console.error("Error in delete service type:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
const updateServiceType = async (req, res) => {
    try {
        const { id } = req.params;
        const { typeName, serviceList } = req.body;

        // Kiểm tra xem loại dịch vụ có tồn tại không
        const serviceType = await ServiceType.findById(id);
        if (!serviceType) {
            return res.status(404).json({ message: "Loại dịch vụ không tồn tại" });
        }

        // Kiểm tra trùng tên loại dịch vụ (trừ loại dịch vụ hiện tại)
        if (typeName && typeName !== serviceType.typeName) {
            const existingType = await ServiceType.findOne({ typeName });
            if (existingType) {
                return res.status(400).json({ message: "Tên loại dịch vụ đã tồn tại" });
            }
        }

        // Cập nhật tên loại dịch vụ
        if (typeName) {
            serviceType.typeName = typeName;
        }

        // Cập nhật danh sách dịch vụ
        if (serviceList) {
            serviceType.serviceList = serviceList;
        }

        // Lưu lại thay đổi
        await serviceType.save();

        return res.status(200).json({
            serviceType,
            message: "Cập nhật loại dịch vụ thành công",
        });
    } catch (error) {
        console.error("Error in update service type:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
module.exports = { getAllServiceTypes, createServiceType, deleteServiceType, updateServiceType };
 