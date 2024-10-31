const AppointmentRequest = require("../models/AppointmentRequest");
const { io } = require("../socket");

// Hàm để kiểm tra định dạng email
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// Hàm để kiểm tra tên bác sĩ
const validateName = (name) => {
    const regex = /^[A-Za-zÀ-ỹ\s]+$/; // Chỉ cho phép ký tự chữ cái và khoảng trắng
    return regex.test(name);
};

// Hàm để kiểm tra số điện thoại
const validatePhone = (phone) => {
    const regex = /^0[0-9]{9}$/; // Bắt đầu bằng 0 và có 10 số
    return regex.test(phone);
};

const createAppointmentRequest = async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            customerEmail,
            appointmentDate,
            appointmentTime,
            service,
            genderDoctor,
            note,
            concern,
            createBy,
            editBy,
        } = req.body;

        // Kiểm tra xem các trường thông tin có hợp lệ không
        if (!customerName || !customerPhone || !customerEmail || !appointmentDate || !appointmentTime || !service || !genderDoctor) {
            return res.status(400).json({ message: "Cần điền đầy đủ thông tin" });
        }

        if (!validateName(customerName)) {
            return res.status(400).json({ message: "Tên không hợp lệ" });
        }

        if (!validatePhone(customerPhone)) {
            return res.status(400).json({ message: "Số điện thoại không hợp lệ" });
        }

        if (!validateEmail(customerEmail)) {
            return res.status(400).json({ message: "Email không hợp lệ" });
        }

        if (concern && concern.length > 2) {
            return res.status(400).json({ message: "Chỉ được chọn tối đa 2 vấn đề" });
        }

        // Kết hợp appointmentDate và appointmentTime
        const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`); // Định dạng ISO 8601

        // Lấy thời gian hiện tại
        const now = new Date();

        // Kiểm tra thời gian hẹn
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Thời gian hiện tại + 2 giờ
        const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Thời gian hiện tại + 30 ngày

        // Kiểm tra điều kiện
        if (appointmentDateTime <= twoHoursLater) {
            return res.status(400).json({ message: "Thời gian hẹn phải lớn hơn 2 giờ so với thời gian hiện tại." });
        }

        if (appointmentDateTime > oneMonthLater) {
            return res.status(400).json({ message: "Thời gian hẹn không được vượt quá 1 tháng kể từ thời điểm hiện tại." });
        }

        const newAppointmentRequest = new AppointmentRequest({
            customerName,
            customerPhone,
            customerEmail,
            appointmentDate,
            appointmentTime,
            service,
            genderDoctor,
            note,
            concern,
            createBy,
            editBy,
        });

        await newAppointmentRequest.save();

        // Gửi thông báo đến tất cả client
        io.emit('newAppointmentRequest', newAppointmentRequest);

        res.status(201).json({ message: "Tạo yêu cầu thành công", newRequest: newAppointmentRequest });

    } catch (error) {
        console.error("Error in create appointment request", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const getAllRequest = async (req, res) => {
    try {
        const request = await AppointmentRequest.find().populate("service");
        return res
            .status(200)
            .json({ request, message: "Lấy danh sách thành công" });
    } catch { error } {
        console.error("Error in get all appointment request", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


module.exports = { createAppointmentRequest, getAllRequest };
