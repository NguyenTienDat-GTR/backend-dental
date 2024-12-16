const Service = require("../models/Service");
const Article = require("../models/Article");
const ServiceType = require("../models/ServiceType");
const AppointmentTicket = require("../models/AppointmentTicket");
const Tooth = require("../models/Tooth");
const Jaw = require("../models/Jaw");

const validateServiceData = ({
                                 name,
                                 price,
                                 description,
                                 serviceTypeName,
                                 discount,
                                 duration,
                                 priceRange,
                                 unit,
                                 res
                             }) => {
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
        const {name, price, description, serviceTypeName, discount, duration, priceRange, unit} = req.body;

        let {blogId} = req.body;

        // Validate service data
        validateServiceData({name, price, description, serviceTypeName, discount, duration, priceRange, unit, res});

        // Check if service name already exists
        if (await Service.findOne({name})) {
            return res.status(400).json({message: "Tên dịch vụ đã tồn tại"});
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
        const type = await ServiceType.findOne({typeName: serviceTypeName});
        if (!type) {
            return res.status(404).json({message: "Loại dịch vụ không tồn tại"});
        }

        type.serviceList.push(service._id);
        await type.save();

        return res.status(200).json({
            message: "Tạo dịch vụ thành công",
            service
        });
    } catch (error) {
        console.error("Error in create service", error);
        return res.status(400).json({message: error.message});
    }
};

const getServiceById = async (req, res) => {
    try {
        const {id} = req.params;

        const service = await Service.findById(id).populate("blog");

        if (!service) {
            return res.status(404).json({message: "Dịch vụ không tồn tại"});
        }

        return res.status(200).json({service});
    } catch (error) {
        console.error("Error in get service by id", error);
        return res.status(400).json({message: error.message});
    }
}

const getAllServices = async (req, res) => {
    try {
        const services = await Service.find().populate("blog");

        return res.status(200).json({services});
    } catch (error) {
        console.error("Error in get all services", error);
        return res.status(400).json({message: error.message});
    }
}

const updateService = async (req, res) => {
    try {
        const {id} = req.params; // Lấy ID dịch vụ
        const {name,price, description, priceRange, unit, discount, duration} = req.body;
        // Tìm dịch vụ cần cập nhật
        const service = await Service.findByIdAndUpdate(id, {
            name,
            price,
            description,
            priceRange,
            unit,
            discount,
            duration
        }, {
            new: true
        });
        if (!service) {
            return res.status(404).json({message: "Dịch vụ không tồn tại"});
        }

        return res.status(200).json({
            message: "Cập nhật dịch vụ thành công",
            service,
        });
    } catch (error) {
        console.error("Error in update service:", error);
        return res.status(500).json({message: "Lỗi hệ thống. Vui lòng thử lại sau."});
    }
};


const deleteService = async (req, res) => {
    try {
        const {id} = req.params;

        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({message: "Dịch vụ không tồn tại"});
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
        const type = await ServiceType.findOne({serviceList: service._id});
        if (type) {
            type.serviceList = type.serviceList.filter(serviceId => !serviceId.equals(service._id));
            await type.save();
            console.log("Dịch vụ đã được xóa khỏi loại dịch vụ");

        } else {
            console.log("Không tim thấy loại dịch vụ liên kết với dịch vụ này");

        }

        return res.status(200).json({
            message: "Dịch vụ và bài viết đã được xóa thành công"
        });
    } catch (error) {
        console.error("Error in delete service", error);
        return res.status(400).json({message: error.message});
    }
}

//các dịch vụ được đặt lịch nhiều nhất dựa theo phieu dat lich
const getTopServices = async (req, res) => {
    try {
        const {year, quarter, month} = req.query;

        // Xây dựng bộ lọc
        const filter = {};

        // Lọc theo năm
        if (year && year !== "all") {
            filter.requestedDate = {
                $regex: `^.*${year}.*$`, // Tìm kiếm năm trong chuỗi
            };
        }

        // Lọc theo quý
        if (year && year !== "all" && quarter) {
            const quarters = {
                "1": ["01", "02", "03"], // Quý 1: Tháng 1, 2, 3
                "2": ["04", "05", "06"], // Quý 2: Tháng 4, 5, 6
                "3": ["07", "08", "09"], // Quý 3: Tháng 7, 8, 9
                "4": ["10", "11", "12"], // Quý 4: Tháng 10, 11, 12
            };

            const monthsInQuarter = quarters[quarter];
            if (monthsInQuarter) {
                filter.requestedDate = {
                    $regex: `^(?:.*\\/(${monthsInQuarter.join("|")})\\/.*)${year}$`,
                };
            }
        }

        // Lọc theo tháng
        if (month && year && year !== "all") {
            filter.requestedDate = {
                $regex: `^.*${month.padStart(2, '0')}/${year}.*$`, // Tìm tháng trong năm
            };
        }

        // Lấy tất cả các phiếu hẹn phù hợp với bộ lọc
        const tickets = await AppointmentTicket.find(filter);

        // Tạo map để lưu số lần đặt hẹn theo từng dịch vụ
        const serviceCount = {};

        // Đếm số lần đặt hẹn cho mỗi dịch vụ
        tickets.forEach(ticket => {
            if (serviceCount[ticket.requestedService]) {
                serviceCount[ticket.requestedService]++;
            } else {
                serviceCount[ticket.requestedService] = 1;
            }
        });

        // Lấy tất cả các dịch vụ từ DB
        const services = await Service.find();

        // Tạo danh sách dịch vụ với số lần đặt
        const serviceStats = services.map(service => ({
            name: service.name,
            count: serviceCount[service.name] || 0,
        }));

        // Sắp xếp theo số lần đặt hẹn giảm dần và lấy top 5
        const topServices = serviceStats
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return res.status(200).json({topServices});
    } catch (error) {
        console.error("Error in getTopServices:", error);
        return res.status(400).json({message: error.message});
    }
};

const getTooth = async (req, res) => {
    try {
        const tooth = await Tooth.find();
        return res.status(200).json({tooth});

    } catch (error) {
        console.error("Error in get tooth:", error);
        return res.status(400).json({message: error.message});
    }

}
const getJaw = async (req, res) => {
    try {
        const jaw = await Jaw.find();
        return res.status(200).json({jaw});

    } catch (error) {
        console.error("Error in get jaw:", error);
        return res.status(400).json({
            message: error.message
        });
    }
}

module.exports = {
    createService,
    getServiceById,
    getAllServices,
    updateService,
    deleteService,
    getTopServices,
    getTooth,
    getJaw
};
