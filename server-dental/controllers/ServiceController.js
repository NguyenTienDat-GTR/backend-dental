const Service = require("../models/Service");
const ServiceType = require("../models/ServiceType");

const createService = async (req, res) => {
    try {
        const { name, price, description, serviceTypeName, discount, duration } = req.body;

        if (!name || !price || !description || !serviceTypeName || !discount || !duration) {
            return res.status(400).json({ message: "Cần điền đầy đủ thông tin" });
        }

        if (name.match(/[^A-Za-zÀ-ỹà-ỹ0-9 ]/g)) {
            return res.status(400).json({ message: "Tên dịch vụ không hợp lệ" });
        } else if (await Service.findOne({ name })) {
            return res.status(400).json({ message: "Tên dịch vụ đã tồn tại" });
        }

        if (price < 0) {
            return res.status(400).json({ message: "Giá dịch vụ không hợp lệ" });
        }

        if (discount < 0 || discount > 100) {
            return res.status(400).json({ message: "Giảm giá không hợp lệ" });
        }

        if (duration < 0) {
            return res.status(400).json({ message: "Thời gian không hợp lệ" });
        }

        // Lấy danh sách URL ảnh từ các file đã upload
        const imageUrls = req.files.map(file => file.path);

        if (imageUrls.length === 0) {
            return res
                .status(400)
                .json({ message: "Cần có ít nhất một hình ảnh minh họa cho dịch vụ" });
        }

        // Tạo dịch vụ mới
        const service = new Service({ name, price, description, imageUrls, discount, duration });
        await service.save();

        // Tìm ServiceType theo tên và cập nhật serviceList
        const type = await ServiceType.findOne({ typeName: serviceTypeName });
        if (!type) {
            return res.status(404).json({ message: "Loại dịch vụ không tồn tại" });
        }

        type.serviceList.push(service._id); // Thêm ID dịch vụ vào serviceList
        await type.save();

        return res.status(200).json(service);
    } catch (error) {
        console.error("Error in create service", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { createService };
