const AppointmentRequest = require("../models/AppointmentRequest");
const { io } = require("../socket");
const moment = require('moment');
const Service = require('../models/Service');
const Doctor = require('../models/Employee');
const Employee = require("../models/Employee");
const AppointmentTicket = require("../models/AppointmentTicket");

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

// Hàm kiểm tra lịch bác sĩ
const checkDoctorAvailability = async (appointmentRequest) => {
    if (!appointmentRequest.appointmentDate || typeof appointmentRequest.appointmentDate !== 'string') {
        throw new Error('appointmentDate is missing or not a string');
    }

    const appointmentDateMoment = moment(appointmentRequest.appointmentDate, 'DD/MM/YYYY', true);
    if (!appointmentDateMoment.isValid()) {
        throw new Error('Invalid appointment date format. Expected format: DD/MM/YYYY');
    }

    const appointmentDayOfWeek = appointmentDateMoment.format('dddd');
    const availableDoctors = await Employee.find({
        position: 'doctor',
        'workingTime.day': appointmentDayOfWeek,
        isWorking: true,
    });

    const result = [];

    for (const doctor of availableDoctors) {
        // Kiểm tra giới tính bác sĩ so với yêu cầu
        if (appointmentRequest.genderDoctor !== 'all' && doctor.gender !== appointmentRequest.genderDoctor) {
            continue;
        }

        const doctorWorkSlots = doctor.workingTime.find(slot => slot.day === appointmentDayOfWeek).timeSlots;
        const doctorAvailableTimes = [];

        // Mảng lưu các khoảng thời gian làm việc của bác sĩ
        let allWorkSlots = [];

        for (let timeSlot of doctorWorkSlots) {
            const [workStartTime, workEndTime] = timeSlot.split(' - ').map(t => moment(t, 'HH:mm'));
            allWorkSlots.push({ start: workStartTime, end: workEndTime });
        }

        // Lấy tất cả các cuộc hẹn chồng chéo trong ngày yêu cầu
        const overlappingAppointments = await AppointmentTicket.find({
            appointmentDate: appointmentRequest.appointmentDate,
            employeeID: doctor.employeeID,
            status: { $ne: 'cancelled' },
        });

        const busyTimes = overlappingAppointments.map(appointment => ({
            startTime: moment(appointment.appointmentTime, 'HH:mm'),
            endTime: moment(appointment.appointmentTime, 'HH:mm').add(appointment.service.duration, 'minutes')
        }));

        // Tính toán các khoảng thời gian rảnh
        let freeSlots = [];
        allWorkSlots.forEach(slot => {
            let currentStart = slot.start.clone();

            // Xử lý các khoảng thời gian bận
            busyTimes.forEach(busyTime => {
                if (currentStart.isBefore(busyTime.startTime)) {
                    freeSlots.push([currentStart, busyTime.startTime]);
                }
                currentStart = busyTime.endTime.isAfter(currentStart) ? busyTime.endTime : currentStart;
            });

            // Kiểm tra thời gian còn lại sau khi hết thời gian bận
            if (currentStart.isBefore(slot.end)) {
                freeSlots.push([currentStart, slot.end]);
            }
        });

        // Duyệt qua các khoảng thời gian rảnh và trả về các khoảng thời gian hợp lệ
        const serviceDuration = moment.duration(appointmentRequest.service.duration, 'minutes');
        freeSlots.forEach(slot => {
            let slotStart = slot[0];
            const slotEnd = slot[1];

            while (slotStart.clone().add(serviceDuration).isBefore(slotEnd) || slotStart.clone().add(serviceDuration).isSame(slotEnd)) {
                let potentialEndTime = slotStart.clone().add(serviceDuration);

                // Kiểm tra xem thời gian yêu cầu có trùng với cuộc hẹn khác không
                let isConflicting = busyTimes.some(busyTime =>
                    slotStart.isBetween(busyTime.startTime, busyTime.endTime, null, '[)') ||
                    potentialEndTime.isBetween(busyTime.startTime, busyTime.endTime, null, '(]')
                );

                if (!isConflicting) {
                    doctorAvailableTimes.push(slotStart.format('HH:mm'));
                }

                slotStart.add(serviceDuration);
            }
        });

        // Nếu có thời gian rảnh, thêm bác sĩ vào kết quả
        if (doctorAvailableTimes.length > 0) {
            result.push({
                doctor,
                availableTimes: doctorAvailableTimes,
            });
        }
    }

    return result;
};


const getListDoctorAvailability = async (req, res) => {
    try {
        const appointmentRequest = req.body.appointmentRequest;
        const availableDoctors = await checkDoctorAvailability(appointmentRequest);
        res.status(200).json({ availableDoctors });
    } catch (error) {
        console.error('Error checking doctor availability:', error);
        res.status(500).json({ message: 'Error checking doctor availability' });
    }
};

const changeRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { apppointmentDate, appointmentTime, service, genderDoctor, note } = req.body;

        if (!apppointmentDate || !appointmentTime || !service || !genderDoctor) {
            return res.status(400).json({ message: "Cần điền đầy đủ thông tin" });
        }

        const appointmentRequest = await AppointmentRequest.findById(id);

        if (!appointmentRequest) {
            return res.status(404).json({ message: "Yêu cầu không tồn tại" });
        }

        // update các trường trên 
        const updatedRequest = {
            appointmentDate: apppointmentDate,
            appointmentTime: appointmentTime,
            service: service,
            genderDoctor: genderDoctor,
            note: note,
        }

        await AppointmentRequest.findByIdAndUpdate(id, updateRequest);

        res.status(200).json({ message: "Cập nhật thành công", updatedRequest });
    } catch (error) {
        console.error("Error in change appointment request", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


module.exports = { createAppointmentRequest, getAllRequest, getListDoctorAvailability, changeRequest };
