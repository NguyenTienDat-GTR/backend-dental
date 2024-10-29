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

module.exports = { getAllServiceTypes, createServiceType };
