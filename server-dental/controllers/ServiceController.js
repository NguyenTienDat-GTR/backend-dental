const Service = require("../models/Service");
const Article = require("../models/Article");
const ServiceType = require("../models/ServiceType");
const AppointmentTicket = require("../models/AppointmentTicket");

const validateServiceData = ({ name, price, description, serviceTypeName, discount, duration, priceRange, unit, res }) => {
    if (!name || !price || !description || !serviceTypeName || !discount || !duration) {
        return res.status(400).json("Cần điền đầy đủ thông tin");
    }

    if (name.match(/[^A-Za-zÀ-ỹà-ỹ0-9 ]/g)) {
        return res.status(400).json("Tên dịch vụ không hợp lệ");
    }

    if (price < 0) {
        return res.status(400).json("Giá dịch vụ không hợp lệ");
    }

    if (discount < 0 || discount > 100) {
        return res.status(400).json("Giảm giá không hợp lệ");
    }

    if (duration < 0) {
        return res.status(400).json("Thời gian không hợp lệ");
    }
};

const getImageUrls = (files, res) => {
    const imageUrls = files.map(file => file.path);
    if (imageUrls.length === 0) {
        return res.status(400).json("Cần có ít nhất một hình ảnh minh họa cho dịch vụ");
    }
    return imageUrls;
};

const createService = async (req, res) => {
    try {
        const { name, price, description, serviceTypeName, discount, duration, priceRange, unit } = req.body;

        let { blogId } = req.body;

        // Validate service data
        validateServiceData({ name, price, description, serviceTypeName, discount, duration, priceRange, unit, res });

        // Check if service name already exists
        if (await Service.findOne({ name })) {
            return res.status(400).json({ message: "Tên dịch vụ đã tồn tại" });
        }

        // Get image URLs
        const imageUrls = getImageUrls(req.files, res);

        if (!blogId) {
            blogId = null
        }

        // Create the service
        const service = new Service({
            name,
            price,
            description,
            imageUrls,
            discount,
            duration,
            priceRange,
            unit,
            blog: blogId
        });
        await service.save();

        // Find the service type and add the service to it
        const type = await ServiceType.findOne({ typeName: serviceTypeName });
        if (!type) {
            return res.status(404).json({ message: "Loại dịch vụ không tồn tại" });
        }

        type.serviceList.push(service._id);
        await type.save();

        return res.status(200).json({
            message: "Tạo dịch vụ thành công",
            service
        });
    } catch (error) {
        console.error("Error in create service", error);
        return res.status(400).json({ message: error.message });
    }
};

const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findById(id).populate("blog");

        if (!service) {
            return res.status(404).json({ message: "Dịch vụ không tồn tại" });
        }

        return res.status(200).json({ service });
    } catch (error) {
        console.error("Error in get service by id", error);
        return res.status(400).json({ message: error.message });
    }
}

const getAllServices = async (req, res) => {
    try {
        const services = await Service.find().populate("blog");

        return res.status(200).json({ services });
    } catch (error) {
        console.error("Error in get all services", error);
        return res.status(400).json({ message: error.message });
    }
}

const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, description, serviceTypeName, discount, duration, priceRange, unit, blogId } = req.body;

        validateServiceData({ name, price, description, serviceTypeName, discount, duration, priceRange, unit, res });

        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({ message: "Dịch vụ không tồn tại" });
        }

        if (name && name !== service.name && await Service.findOne({ name })) {
            return res.status(400).json({ message: "Tên dịch vụ đã tồn tại" });
        }

        service.name = name || service.name;
        service.price = price || service.price;
        service.description = description || service.description;
        service.discount = discount || service.discount;
        service.duration = duration || service.duration;
        service.priceRange = priceRange || service.priceRange;
        service.unit = unit || service.unit;

        if (req.files) {
            const imageUrls = getImageUrls(req.files, res);
            service.imageUrls = imageUrls;
        }

        if (blogId !== undefined) {
            service.blog = blogId || null; // Set to null if no blogId is provided
        }

        // Save the updated service
        await service.save();

        // Find and update the service type
        const type = await ServiceType.findOne({ typeName: serviceTypeName });
        if (type && !type.serviceList.includes(service._id)) {
            type.serviceList.push(service._id);
            await type.save();
        }

        // Optionally, update the blog if the blogId is provided
        if (blogId) {
            // Assume you have a Blog model and a method to update blog
            const blog = await Blog.findById(blogId);
            if (!blog) {
                return res.status(404).json({ message: "Bài viết không tồn tại" });
            }

            // Update blog fields as necessary
            blog.title = req.body.blogTitle || blog.title;
            blog.content = req.body.blogContent || blog.content;

            await blog.save();
        }

        return res.status(200).json({
            message: "Cập nhật dịch vụ thành công",
            service
        });
    } catch (error) {
        console.error("Error in update service", error);
        return res.status(400).json({ message: error.message });
    }
}
const deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({ message: "Dịch vụ không tồn tại" });
        }

        // Xóa bài viết nếu có liên kết thông qua blogId
        if (service.blog) {
            const blog = await Article.findById(service.blog);
            if (blog) {
                await blog.deleteOne(); // Xóa bài viết liên kết
            } else {
                console.log("Không tìm thấy bài viết liên kết với dịch vụ này");
            }
        }

        // Xóa dịch vụ
        await service.deleteOne();

        // Cập nhật lại loại dịch vụ (ServiceType)
        const type = await ServiceType.findOne({ serviceList: service._id });
        if (type) {
            type.serviceList = type.serviceList.filter(serviceId => !serviceId.equals(service._id));
            await type.save();
        }

        return res.status(200).json({
            message: "Dịch vụ và bài viết đã được xóa thành công"
        });
    } catch (error) {
        console.error("Error in delete service", error);
        return res.status(400).json({ message: error.message });
    }
}

//các dịch vụ được đặt lịch nhiều nhất dựa theo phieu dat lich
const getTopServices = async (req, res) => {
    try {
        // Lấy tất cả các dịch vụ
        const services = await Service.find();

        // Tạo map để lưu số lần đặt hẹn theo từng dịch vụ
        const serviceCount = {};

        // Lấy tất cả phiếu hẹn
        const tickets = await AppointmentTicket.find();

        // Đếm số lần đặt hẹn cho mỗi dịch vụ
        tickets.forEach(ticket => {
            if (serviceCount[ticket.requestedService]) {// nếu đã có dịch vụ này trong map thì tăng số lần đặt lên 1
                serviceCount[ticket.requestedService]++;
            } else {
                serviceCount[ticket.requestedService] = 1;// nếu chưa có thì tạo mới và gán số lần đặt là 1
            }
        });

        // Tạo danh sách dịch vụ với số lần đặt
        const serviceStats = services.map(service => ({
            name: service.name,
            count: serviceCount[service.name] || 0,
        }));

        // Sắp xếp theo số lần đặt hẹn giảm dần và lấy top 5
        const topServices = serviceStats
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return res.status(200).json({ topServices });
    } catch (error) {
        console.error("Error in get top services:", error);
        return res.status(400).json({ message: error.message });
    }
};


module.exports = { createService, getServiceById, getAllServices, updateService, deleteService, getTopServices };
