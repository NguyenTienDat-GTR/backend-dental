const AppointmentRequest = require("../models/AppointmentRequest");
const {io} = require("../socket");
const moment = require('moment');
const Service = require('../models/Service');
const Doctor = require('../models/Employee');
const Employee = require("../models/Employee");
const AppointmentTicket = require("../models/AppointmentTicket");
const Customer = require('../models/Customer');
const {sendResponseAppointmentRequest, sendCreateAppointmentRequest} = require("../middlewares/sendMessage");

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
            doctorId,
            note,
            createBy,
            editBy,
            gender
        } = req.body;


        // Kiểm tra xem các trường thông tin có hợp lệ không
        if (!customerName || !customerPhone || !customerEmail || !appointmentDate || !appointmentTime || !service || !doctorId || !gender) {
            return res.status(400).json({message: "Cần điền đầy đủ thông tin"});
        }

        if (!validateName(customerName)) {
            return res.status(400).json({message: "Tên không hợp lệ"});
        }

        if (!validatePhone(customerPhone)) {
            return res.status(400).json({message: "Số điện thoại không hợp lệ"});
        }

        if (!validateEmail(customerEmail)) {
            return res.status(400).json({message: "Email không hợp lệ"});
        }


        const existingDoctor = await Employee.findOne({employeeID: doctorId}).select("employeeID employeeName employeePhone employeeEmail");

        if (!existingDoctor) {
            return res.status(404).json({message: "Bác sĩ không tồn tại"});
        }

        // Kết hợp appointmentDate và appointmentTime
        const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`); // Định dạng ISO 8601

        // Lấy thời gian hiện tại
        const now = new Date();

        // Kiểm tra thời gian hẹn
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Thời gian hiện tại + 2 giờ
        const oneMonthLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Thời gian hiện tại + 7 ngày

        // Kiểm tra điều kiện
        if (appointmentDateTime <= twoHoursLater) {
            return res.status(400).json({message: "Thời gian hẹn phải lớn hơn 2 giờ so với thời gian hiện tại."});
        }

        if (appointmentDateTime > oneMonthLater) {
            return res.status(400).json({message: "Thời gian hẹn không được vượt quá 7 ngày kể từ thời điểm hiện tại."});
        }

        const newAppointmentRequest = new AppointmentRequest({
            customerName,
            customerPhone,
            customerEmail,
            appointmentDate,
            appointmentTime,
            service,
            doctorId,
            note,
            createBy: createBy || "customer",
            editBy,
            gender,
        });

        await newAppointmentRequest.save();
        await sendCreateAppointmentRequest(customerEmail, customerName, appointmentDate, appointmentTime, service, existingDoctor.employeeName, note);
        // Gửi thông báo đến tất cả client
        io.emit('newAppointmentRequest', newAppointmentRequest);

        res.status(201).json({
            message: "Tạo yêu cầu thành công. Chúng tôi sẽ liên hệ với bận sớm nhất có thể!",
            newRequest: newAppointmentRequest
        });

    } catch (error) {
        console.error("Error in create appointment request", error);
        return res.status(500).json({message: "Internal server error"});
    }
};

const getAllRequest = async (req, res) => {
    try {
        const {year, quarter, month, doctorId} = req.query;

        // Xây dựng bộ lọc cho AppointmentRequest
        const filter = {};

        if (doctorId) {
            filter.doctorId = doctorId;
        }

        // Lọc theo năm
        if (year && year !== "all") {
            filter.createAt = {
                $regex: `.*${year} .*`,  // Tìm kiếm năm trong chuỗi dd/mm/yyyy hh:mm:ss
            };
        }

        // Lọc theo quý
        if (year && year !== "all" && quarter) {
            const quarters = {
                "1": ["01", "02", "03"],  // Quý 1 có các tháng 01, 02, 03
                "2": ["04", "05", "06"],  // Quý 2 có các tháng 04, 05, 06
                "3": ["07", "08", "09"],  // Quý 3 có các tháng 07, 08, 09
                "4": ["10", "11", "12"],  // Quý 4 có các tháng 10, 11, 12
            };

            const monthsInQuarter = quarters[quarter];

            if (monthsInQuarter) {
                filter.createAt = {
                    $regex: `.*(${monthsInQuarter.join("|")})/${year} .*`,  // Tìm các tháng trong quý và năm
                };
            }
        }

        // Lọc theo tháng và năm
        if (month && year && year !== "all") {
            filter.createAt = {
                $regex: `.*${month.padStart(2, '0')}/${year} .*`,  // Tìm tháng trong năm (dd/mm/yyyy hh:mm:ss)
            };
        }

        // Lấy danh sách yêu cầu theo bộ lọc
        const request = await AppointmentRequest.find(filter);

        return res
            .status(200)
            .json({request, message: "Lấy danh sách thành công"});
    } catch (error) {
        console.error("Error in get all appointment request", error);
        return res.status(500).json({message: "Internal server error"});
    }
};

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

        const service = await Service.findOne({name: appointmentRequest.service});
        if (!service) {
            return res.status(400).json({message: 'Không tìm thấy dịch vụ yêu cầu'});
        }

        const doctorWorkSlots = doctor.workingTime.find(slot => slot.day === appointmentDayOfWeek).timeSlots;
        const doctorAvailableTimes = [];
        let allWorkSlots = [];

        for (let timeSlot of doctorWorkSlots) {
            const [workStartTime, workEndTime] = timeSlot.split(' - ').map(t => moment(t, 'HH:mm'));
            allWorkSlots.push({start: workStartTime, end: workEndTime});
        }

        const overlappingAppointments = await AppointmentTicket.find({
            appointmentDate: appointmentRequest.appointmentDate,
            employeeID: doctor.employeeID,
            status: {$ne: 'cancelled'},
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
        const {id} = req.params;
        const appointmentRequest = await AppointmentRequest.findById(id);
        if (!appointmentRequest) {
            return res.status(404).json({message: 'Yêu cầu không tồn tại'});
        }
        const availableDoctors = await checkDoctorAvailability(appointmentRequest, res);
        res.status(200).json({availableDoctors});
    } catch (error) {
        console.error('Error checking doctor availability:', error);
        res.status(500).json({message: 'Error checking doctor availability'});
    }
};

const getRequestById = async (req, res) => {
    const {id} = req.params
    try {
        const request = await AppointmentRequest.findById(id);
        if (!request) {
            return res.status(404).json({message: 'Yêu cầu không tồn tại'});
        }

        return res.status(200).json({message: "Lấy yêu cầu thành công", request})

    } catch (error) {
        console.log("Error in get request  by id", error)
        return res.status(500).json({message: "Error getting request by id"})
    }
}


const changeRequest = async (req, res) => {
    try {
        const {id} = req.params;
        const {appointmentDate, appointmentTime, service, note, editBy, doctorId} = req.body;
        const parsedEditBy = JSON.parse(editBy);

        console.log(appointmentDate, appointmentTime, service, doctorId, note, editBy);

        if (!appointmentDate || !appointmentTime || !service) {
            return res.status(400).json({message: "Cần điền đầy đủ thông tin"});
        }

        const appointmentRequest = await AppointmentRequest.findById(id);

        if (!appointmentRequest) {
            return res.status(404).json({message: "Yêu cầu không tồn tại"});
        }

        // Chuyển đổi appointmentDate sang định dạng DD/MM/YYYY
        const convertedAppointmentDate = moment(appointmentDate, "DD/MM/YYYY").format("DD/MM/YYYY");

        // Kiểm tra thời gian hẹn (kết hợp ngày và giờ)
        const appointmentDateTime = moment(`${convertedAppointmentDate} ${appointmentTime}`, "DD/MM/YYYY HH:mm").toDate();

        const now = new Date();

        // Kiểm tra thời gian hẹn > 2 giờ và <= 7 ngày
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const oneMonthLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        if (appointmentDateTime <= twoHoursLater) {
            return res.status(400).json({message: "Thời gian hẹn phải lớn hơn 2 giờ so với thời gian hiện tại."});
        }

        if (appointmentDateTime > oneMonthLater) {
            return res.status(400).json({message: "Thời gian hẹn không được vượt quá 7 ngày kể từ thời điểm hiện tại."});
        }

        // Chuẩn bị dữ liệu để cập nhật
        const updated = {
            appointmentDate: convertedAppointmentDate, // Lưu dưới dạng chuỗi DD/MM/YYYY
            appointmentTime,
            service,
            doctorId,
            note,
            editBy: parsedEditBy,
        };

        const updatedRequest = await AppointmentRequest.findByIdAndUpdate(id, updated, {new: true});

        res.status(200).json({message: "Cập nhật thành công", updatedRequest});
    } catch (error) {
        console.error("Error in change appointment request", error);
        return res.status(500).json({message: "Internal server error"});
    }
};


const responseRequest = async (req, res) => {
    const {id} = req.params;
    const {status, acceptBy, reasonReject, rejectBy, doctorID} = req.body;
    try {
        const request = await AppointmentRequest.findById(id);

        if (!request) {
            return res.status(404).json({message: "Yêu cầu không tồn tại"})
        }

        if (request.status !== "pending") {
            return res.status(400).json({message: "Yêu cầu đã được xử lý"})
        }

        if (status === "accepted") {
            request.status = "accepted";
            request.acceptBy = acceptBy;

            const doctor = await Employee.findOne({employeeID: doctorID}).select("employeeID employeeName employeePhone employeeEmail");

            if (!doctor) {
                return res.status(404).json({message: "Bác sĩ không tồn tại"});
            }

            const service = await Service.findOne({name: request.service});

            if (!service) {
                return res.status(404).json({message: "Dịch vụ không tồn tại"});
            }

            const time = moment(`${request.appointmentTime}`, "HH:mm");
            const endTime = time.add(service.duration, 'minutes').format("HH:mm");

            // Lưu hoặc tìm thông tin khách hàng
            let savedCustomer = null;

            if (request.customerEmail) {
                savedCustomer = await Customer.findOne({
                    $or: [
                        {phone: request.customerPhone},
                        {email: request.customerEmail}
                    ]
                });
            } else {
                savedCustomer = await Customer.findOne({phone: request.customerPhone});
            }

            if (!savedCustomer) {
                // Nếu không tìm thấy khách hàng, tạo mới
                const newCustomer = new Customer({
                    name: request.customerName,
                    phone: request.customerPhone,
                    email: request.customerEmail || "",
                    gender: request.gender,
                });

                savedCustomer = await newCustomer.save();
                if (!savedCustomer) {
                    return res.status(500).json({message: "Lỗi khi tạo khách hàng"});
                }
            }
            //kiểm tra trùng lịch
            const isDuplicate = await AppointmentTicket.findOne({
                doctorId: doctorID,
                requestedDate: request.appointmentDate,
                requestedTime: request.appointmentTime,
            });

            if (isDuplicate) {
                console.log("Lịch hẹn đã tồn tại!");
                return res.status(409).json({message: "Lịch hẹn đã tồn tại!"});
            }

            const ticket = new AppointmentTicket({
                customer: savedCustomer._id,
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
            await sendResponseAppointmentRequest(request.customerEmail, request.customerName, status, request.appointmentDate, request.appointmentTime, request.acceptBy, null, doctor.employeeName);
            io.emit('response');
            io.emit('createTicket', ticket);
            return res.status(200).json({message: "Xử lý yêu cầu thành công! Đã tạo phiếu hẹn!", request});
        }

        if (status === "rejected") {
            request.status = "rejected";
            request.reasonReject = reasonReject;
            request.rejectBy = rejectBy;

            await request.save();
            await sendResponseAppointmentRequest(request.customerEmail, request.customerName, status, request.appointmentDate, request.appointmentTime, request.rejectBy, request.reasonReject, null);
            io.emit('response');
            return res.status(200).json({message: "Xử lý yêu cầu thành công! Đã từ chối!", request})
        }

    } catch (error) {
        console.log("Error in response request", error)
        return res.status(500).json({message: "Error response request"})
    }
}

//lấy các yêu cầu bị từ chối
const getRequestRejected = async (req, res) => {
    try {
        const {year, quarter, month, rejectBy} = req.query;

        // Xây dựng bộ lọc
        const filter = {
            status: "rejected", // Chỉ lấy các yêu cầu bị từ chối
        };

        // Lọc theo rejectBy (nếu có)
        if (rejectBy) {
            filter.rejectBy = rejectBy;
        }

        // Lọc theo năm
        if (year && year !== "all") {
            const yearRegex = `${year}`;
            filter.createAt = {
                $regex: yearRegex, // Tìm kiếm năm trong chuỗi ngày giờ
            };
        }

        // Lọc theo quý
        if (year && year !== "all" && quarter) {
            const quarters = {
                "1": ["01", "02", "03"], // Quý 1
                "2": ["04", "05", "06"], // Quý 2
                "3": ["07", "08", "09"], // Quý 3
                "4": ["10", "11", "12"], // Quý 4
            };

            const monthsInQuarter = quarters[quarter];
            if (monthsInQuarter) {
                filter.createAt = {
                    $regex: `(${monthsInQuarter.join("|")})/${year}`, // Tìm các tháng trong quý và năm
                };
            }
        }

        // Lọc theo tháng và năm
        if (month && year && year !== "all") {
            const monthRegex = `${month.padStart(2, "0")}/${year}`;
            filter.createAt = {
                $regex: monthRegex, // Tìm tháng trong năm
            };
        }

        // Lấy danh sách yêu cầu từ cơ sở dữ liệu
        const requests = await AppointmentRequest.find(filter);

        // Trả về dữ liệu
        return res.status(200).json({
            requests,
            message: "Lấy danh sách thành công",
        });
    } catch (error) {
        console.error("Error in getRequestRejected:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

const getRequestCountsByUser = async (req, res) => {
    try {
        const {year, quarter, month, rejectBy} = req.query;

        if (!rejectBy) {
            return res.status(400).json({
                message: "Vui lòng cung cấp giá trị 'rejectBy' để lọc dữ liệu.",
            });
        }

        // Xây dựng các bộ lọc chung cho cả accepted và rejected
        const baseFilter = {};

        // Lọc theo năm
        if (year && year !== "all") {
            baseFilter.createAt = {
                $regex: `${year}`, // Lọc theo năm
            };
        }

        // Lọc theo quý
        if (year && year !== "all" && quarter) {
            const quarters = {
                "1": ["01", "02", "03"],
                "2": ["04", "05", "06"],
                "3": ["07", "08", "09"],
                "4": ["10", "11", "12"],
            };
            const monthsInQuarter = quarters[quarter];
            if (monthsInQuarter) {
                baseFilter.createAt = {
                    $regex: `(${monthsInQuarter.join("|")})/${year}`, // Lọc theo tháng trong quý và năm
                };
            }
        }

        // Lọc theo tháng
        if (month && year && year !== "all") {
            const monthRegex = `${month.padStart(2, "0")}/${year}`;
            baseFilter.createAt = {
                $regex: monthRegex, // Lọc theo tháng và năm
            };
        }

        // Bộ lọc cho các yêu cầu bị rejected
        const rejectedFilter = {
            ...baseFilter,
            status: "rejected",
            rejectBy: rejectBy ? rejectBy : null,
        };

        // Bộ lọc cho các yêu cầu được accepted
        const acceptedFilter = {
            ...baseFilter,
            status: "accepted",
            acceptBy: rejectBy ? rejectBy : null,
        };

        // Đếm số lượng yêu cầu rejected và accepted
        const [rejectedCount, acceptedCount] = await Promise.all([
            AppointmentRequest.countDocuments(rejectedFilter),
            AppointmentRequest.countDocuments(acceptedFilter),
        ]);

        // Trả về kết quả
        return res.status(200).json({
            rejectedCount,
            acceptedCount,
            message: `Số lượng yêu cầu rejected và accepted bởi ${rejectBy} được lọc thành công.`,
        });
    } catch (error) {
        console.error("Error in getRequestCountsByUser:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};


module.exports = {
    createAppointmentRequest,
    getAllRequest,
    getListDoctorAvailability,
    changeRequest,
    getRequestById,
    responseRequest,
    checkDoctorAvailability,
    getRequestRejected,
    getRequestCountsByUser
};
