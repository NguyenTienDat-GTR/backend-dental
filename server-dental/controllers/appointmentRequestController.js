const AppointmentRequest = require("../models/AppointmentRequest");
const { io } = require("../socket");
const moment = require('moment');
const Service = require('../models/Service');
const Doctor = require('../models/Employee');
const Employee = require("../models/Employee");
const AppointmentTicket = require("../models/AppointmentTicket");
const { sendResponsAppointmentRequest, sendCreateAppointmentRequest } = require("../middlewares/sendMessage");

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
        await sendCreateAppointmentRequest(customerEmail, customerName, appointmentDate, appointmentTime, service, note, concern);
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
        const request = await AppointmentRequest.find();
        return res
            .status(200)
            .json({ request, message: "Lấy danh sách thành công" });
    } catch { error } {
        console.error("Error in get all appointment request", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Hàm kiểm tra lịch bác sĩ
// Hàm kiểm tra lịch bác sĩ
const checkDoctorAvailability = async (appointmentRequest, res) => {
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
        if (appointmentRequest.genderDoctor !== 'all' && doctor.gender !== appointmentRequest.genderDoctor) {
            continue;
        }

        const service = await Service.findOne({ name: appointmentRequest.service });
        if (!service) {
            return res.status(400).json({ message: 'Không tìm thấy dịch vụ yêu cầu' });
        }

        const doctorWorkSlots = doctor.workingTime.find(slot => slot.day === appointmentDayOfWeek).timeSlots;
        const doctorAvailableTimes = [];
        let allWorkSlots = [];

        for (let timeSlot of doctorWorkSlots) {
            const [workStartTime, workEndTime] = timeSlot.split(' - ').map(t => moment(t, 'HH:mm'));
            allWorkSlots.push({ start: workStartTime, end: workEndTime });
        }

        const overlappingAppointments = await AppointmentTicket.find({
            appointmentDate: appointmentRequest.appointmentDate,
            employeeID: doctor.employeeID,
            status: { $ne: 'cancelled' },
        });

        const busyTimes = overlappingAppointments.map(appointment => ({
            startTime: moment(appointment.appointmentTime, 'HH:mm'),
            endTime: moment(appointment.appointmentTime, 'HH:mm').add(service.duration, 'minutes')
        }));

        let freeSlots = [];
        allWorkSlots.forEach(slot => {
            let currentStart = slot.start.clone();

            busyTimes.forEach(busyTime => {
                if (currentStart.isBefore(busyTime.startTime)) {
                    freeSlots.push([currentStart, busyTime.startTime]);
                }
                currentStart = busyTime.endTime.isAfter(currentStart) ? busyTime.endTime : currentStart;
            });

            if (currentStart.isBefore(slot.end)) {
                freeSlots.push([currentStart, slot.end]);
            }
        });

        const serviceDuration = moment.duration(service.duration, 'minutes');
        freeSlots.forEach(slot => {
            let slotStart = slot[0];
            const slotEnd = slot[1];

            while (slotStart.clone().add(serviceDuration).isBefore(slotEnd) || slotStart.clone().add(serviceDuration).isSame(slotEnd)) {
                let potentialEndTime = slotStart.clone().add(serviceDuration);

                let isConflicting = busyTimes.some(busyTime =>
                    slotStart.isBetween(busyTime.startTime, busyTime.endTime, null, '[)') ||
                    potentialEndTime.isBetween(busyTime.startTime, busyTime.endTime, null, '(]')
                );

                // Chỉ thêm giờ chẵn (phút là 00) vào mảng availableTimes
                if (!isConflicting && slotStart.minutes() === 0) {
                    doctorAvailableTimes.push(slotStart.format('HH:mm'));
                }

                slotStart.add(serviceDuration);
            }
        });

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
        const { id } = req.params;
        const appointmentRequest = await AppointmentRequest.findById(id);
        if (!appointmentRequest) {
            return res.status(404).json({ message: 'Yêu cầu không tồn tại' });
        }
        const availableDoctors = await checkDoctorAvailability(appointmentRequest, res);
        res.status(200).json({ availableDoctors });
    } catch (error) {
        console.error('Error checking doctor availability:', error);
        res.status(500).json({ message: 'Error checking doctor availability' });
    }
};

const getRequestById = async (req, res) => {
    const { id } = req.params
    try {
        const request = await AppointmentRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Yêu cầu không tồn tại' });
        }

        return res.status(200).json({ message: "Lấy yêu cầu thành công", request })

    } catch (error) {
        console.log("Error in get request  by id", error)
        return res.status(500).json({ message: "Error getting request by id" })
    }
}


const changeRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { appointmentDate, appointmentTime, service, genderDoctor, note, editBy } = req.body;
        const parsedEditBy = JSON.parse(editBy);
        console.log(appointmentDate, appointmentTime, service, genderDoctor, note, editBy);

        if (!appointmentDate || !appointmentTime || !service || !genderDoctor) {
            return res.status(400).json({ message: "Cần điền đầy đủ thông tin" });
        }

        const appointmentRequest = await AppointmentRequest.findById(id);

        if (!appointmentRequest) {
            return res.status(404).json({ message: "Yêu cầu không tồn tại" });
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

        // Chuyển đổi appointmentDate từ yyyy-MM-dd sang DD/MM/YYYY
        const convertedAppointmentDate = moment(appointmentDate).format('DD/MM/YYYY');
        // update các trường trên 
        const updated = {
            appointmentDate: convertedAppointmentDate,
            appointmentTime: appointmentTime,
            service: service,
            genderDoctor: genderDoctor,
            note: note,
            editBy: parsedEditBy,
        };

        const updatedRequest = await AppointmentRequest.findByIdAndUpdate(id, updated);

        res.status(200).json({ message: "Cập nhật thành công", updatedRequest });
    } catch (error) {
        console.error("Error in change appointment request", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const responseRequest = async (req, res) => {
    const { id } = req.params;
    const { status, acceptBy, reasonReject, rejectBy, doctorID } = req.body;
    try {
        const request = await AppointmentRequest.findById(id);

        if (!request) {
            return res.status(404).json({ message: "Yêu cầu không tồn tại" })
        }

        if (request.status !== "pending") {
            return res.status(400).json({ message: "Yêu cầu đã được xử lý" })
        }

        if (status === "accepted") {
            request.status = "accepted";
            request.acceptBy = acceptBy;

            const doctor = await Employee.findOne({ employeeID: doctorID }).select("employeeID employeeName employeePhone employeeEmail");

            if (!doctor) {
                return res.status(404).json({ message: "Bác sĩ không tồn tại" });
            }

            const service = await Service.findOne({ name: request.service });

            if (!service) {
                return res.status(404).json({ message: "Dịch vụ không tồn tại" });
            }

            const time = moment(`${request.appointmentTime}`, "HH:mm");
            const endTime = time.add(service.duration, 'minutes').format("HH:mm");

            const ticket = new AppointmentTicket({
                customerName: request.customerName,
                customerPhone: request.customerPhone,
                customerEmail: request.customerEmail,
                requestedDate: request.appointmentDate,
                requestedTime: request.appointmentTime,
                endTime: endTime.toString(),
                requestedService: request.service,
                doctorId: doctor.employeeID,
                createBy: request.acceptBy,
                note: request.note,
                concern: request.concern,
            })
            await request.save();
            await ticket.save();
            await sendResponsAppointmentRequest(request.customerEmail, request.customerName, status, request.appointmentDate, request.appointmentTime, request.acceptBy, null, doctor.employeeName);
            io.emit('response');
            io.emit('createTicket', ticket);
            return res.status(200).json({ message: "Xử lý yêu cầu thành công! Đã tạo phiếu hẹn!", request });
        }

        if (status === "rejected") {
            request.status = "rejected";
            request.reasonReject = reasonReject;
            request.rejectBy = rejectBy;

            await request.save();
            await sendResponsAppointmentRequest(request.customerEmail, request.customerName, status, request.appointmentDate, request.appointmentTime, request.rejectBy, request.reasonReject, null);
            io.emit('response');
            return res.status(200).json({ message: "Xử lý yêu cầu thành công! Đã từ chối!", request })
        }

    } catch (error) {
        console.log("Error in response request", error)
        return res.status(500).json({ message: "Error response request" })
    }
}

const autoRejectExpiredRequests = async () => {
    try {
        // Lấy danh sách các yêu cầu có status là 'pending'
        const pendingRequests = await AppointmentRequest.find({ status: "pending" });

        // Lặp qua từng yêu cầu để kiểm tra thời gian
        for (const request of pendingRequests) {
            const createTime = moment(`${request.createAt}`, "DD/MM/YYYY HH:mm");
            const now = moment();

            // Kiểm tra nếu thời gian hiện tại lớn hơn 15 phút so với thời gian tạo yêu cầu
            if (now.isAfter(createTime.add(15, 'minutes'))) {
                request.status = "rejected";
                request.reasonReject = "Yêu cầu tự động bị từ chối do quá thời gian phản hồi";
                request.rejectBy = "Hệ thống";

                // Lưu lại trạng thái từ chối cho yêu cầu
                await request.save();

                // Gửi email thông báo cho khách hàng
                await sendResponsAppointmentRequest(
                    request.customerEmail,
                    request.customerName,
                    "rejected",
                    request.appointmentDate,
                    request.appointmentTime,
                    "Hệ thống",
                    request.reasonReject
                );

                // Phát sự kiện thông báo cho các client
                io.emit('response', request);
                console.log(`Yêu cầu ${request._id} đã bị từ chối do quá thời gian phản hồi.`);
            }
        }
    } catch (error) {
        console.error("Error in autoRejectExpiredRequests", error);
    }
};

// Chạy kiểm tra định kỳ mỗi 60 giây
setInterval(autoRejectExpiredRequests, 60 * 1000);



module.exports = { createAppointmentRequest, getAllRequest, getListDoctorAvailability, changeRequest, getRequestById, responseRequest, checkDoctorAvailability };
