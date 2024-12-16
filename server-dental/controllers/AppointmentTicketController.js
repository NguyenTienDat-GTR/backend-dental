const AppointmentTicket = require('../models/AppointmentTicket');
const Employee = require('../models/Employee');
const Service = require('../models/Service');
const Customer = require('../models/Customer');
const {sendCancellAppointmentTicket} = require('../middlewares/sendMessage')
const moment = require('moment');
const {io} = require("../socket");
const {sendResponseAppointmentRequest} = require("../middlewares/sendMessage");

const getVietnamTimeString = () => {
    const now = new Date();
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    return now.toLocaleString("en-GB", {timeZone: "Asia/Ho_Chi_Minh", ...options}).replace(',', '');
};


// Hàm để kiểm tra định dạng email
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// Hàm để kiểm tra tên
const validateName = (name) => {
    const regex = /^[A-Za-zÀ-ỹ\s]+$/; // Chỉ cho phép ký tự chữ cái và khoảng trắng
    return regex.test(name);
};

// Hàm để kiểm tra số điện thoại
const validatePhone = (phone) => {
    const regex = /^0[0-9]{9}$/; // Bắt đầu bằng 0 và có 10 số
    return regex.test(phone);
};

const checkValidDateTime = (date, time, res) => {
    // Kết hợp appointmentDate và appointmentTime
    const appointmentDateTime = new Date(`${date}T${time}`); // Định dạng ISO 8601

    // Lấy thời gian hiện tại
    const now = new Date();

    // Kiểm tra thời gian hẹn
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Thời gian hiện tại + 2 giờ
    const oneMonthLater = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000); // Thời gian hiện tại + 8 ngày

    // Kiểm tra điều kiện
    if (appointmentDateTime <= twoHoursLater) {
        return res.status(400).json({message: "Thời gian hẹn phải lớn hơn 2 giờ so với thời gian hiện tại."});
    }

    if (appointmentDateTime > oneMonthLater) {
        return res.status(400).json({message: "Thời gian hẹn không được vượt quá 8 ngày kể từ thời điểm hiện tại."});
    }

}

const checkAvailableAppointment = async (doctorId, requestedDate, requestedTime) => {
    try {

        //Tìm kiếm xem có phiếu hẹn nào trùng với thông tin đã nhập không
        const appointment = await AppointmentTicket.findOne({
            doctorId: doctorId,
            requestedDate: requestedDate,
            requestedTime: requestedTime
        });

        return !!appointment;

    } catch (error) {
        console.log("Error in checkAvailableAppointment:", error);
        throw new Error("Failed to check available appointment");
    }
}

const createAppointmentTicket = async (req, res) => {
    const {
        doctorId,
        customerName,
        customerPhone,
        customerEmail,
        requestedDate,
        requestedTime,
        service,
        note,
        createBy,
        gender,
        isNewCustomer
    } = req.body;

    const session = await AppointmentTicket.startSession();
    session.startTransaction();

    try {
        // Kiểm tra thông tin đầu vào
        if (!doctorId || !customerName || !customerPhone || !requestedDate || !requestedTime || !service || !gender) {
            return res.status(400).json({message: "Cần điền đầy đủ thông tin"});
        }

        // Kiểm tra bác sĩ
        const doctor = await Employee.findOne({employeeID: doctorId}).session(session);
        if (!doctor) {
            return res.status(404).json({message: "Không tìm thấy bác sĩ"});
        }

        // Kiểm tra dịch vụ
        const serviceInfo = await Service.findOne({name: service}).session(session);
        if (!serviceInfo) {
            return res.status(404).json({message: "Không tìm thấy dịch vụ"});
        }

        // Kiểm tra tính hợp lệ của dữ liệu đầu vào
        if (!validateName(customerName)) {
            return res.status(400).json({message: "Tên không hợp lệ"});
        }

        if (!validatePhone(customerPhone)) {
            return res.status(400).json({message: "Số điện thoại không hợp lệ"});
        }

        if (customerEmail && !validateEmail(customerEmail)) {
            return res.status(400).json({message: "Email không hợp lệ"});
        }

        checkValidDateTime(requestedDate, requestedTime, res);

        // Lưu hoặc tìm thông tin khách hàng
        let savedCustomer = null;

        if (isNewCustomer) {
            if (customerEmail) {
                savedCustomer = await Customer.findOne({
                    $or: [
                        {phone: customerPhone},
                        {email: customerEmail}
                    ]
                }).session(session);
            } else {
                savedCustomer = await Customer.findOne({phone: customerPhone}).session(session);
            }

            if (savedCustomer) {
                return res.status(409).json({message: "Khách hàng đã tồn tại"});
            }
        }

        if (customerEmail) {
            savedCustomer = await Customer.findOne({
                $or: [
                    {phone: customerPhone},
                    {email: customerEmail}
                ]
            }).session(session);
        } else {
            savedCustomer = await Customer.findOne({phone: customerPhone}).session(session);
        }

        if (!savedCustomer) {
            // Nếu không tìm thấy khách hàng, tạo mới
            const newCustomer = new Customer({
                name: customerName,
                phone: customerPhone,
                email: customerEmail || "",
                gender: gender,
            });

            savedCustomer = await newCustomer.save({session});
            if (!savedCustomer) {
                return res.status(500).json({message: "Lỗi khi tạo khách hàng"});
            }
        }

        // Kiểm tra xem có lịch hẹn trùng không
        const isDuplicate = await AppointmentTicket.findOne({
            doctorId,
            requestedDate,
            requestedTime,
            status: { $nin: ["cancelled", "done"] }
        }).session(session);

        if (isDuplicate) {
            console.log("Lịch hẹn đã tồn tại!");
            return res.status(409).json({message: "Lịch hẹn đã tồn tại!"});
        }
        // Lưu lịch hẹn
        const endTime = moment(`${requestedTime}`, "HH:mm")
            .add(serviceInfo.duration, "minutes")
            .format("HH:mm");

        const ticket = new AppointmentTicket({
            customer: savedCustomer._id, // Gán _id của khách hàng
            requestedDate,
            requestedTime: moment(requestedTime, "HH:mm").format("HH:mm"),
            requestedService: service,
            doctorId,
            endTime: endTime.toString(),
            createBy: createBy || "customer",
            note
        });

        const newTicket = await ticket.save({session});

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        io.emit("newAppointment");

        return res.status(201).json({ticket: newTicket, message: "Tạo lịch hẹn thành công"});
    } catch (error) {
        console.error("Error in createAppointmentTicket:", error);
        await session.abortTransaction(); // Hủy giao dịch khi gặp lỗi hoặc exception
        session.endSession();
        return res.status(500).json({message: error.message});
    }
};

// Lấy tất cả phiếu hẹn
const getAllAppointmentTickets = async (req, res) => {
    try {
        const {year, quarter, month, doctorId} = req.query;

        // Xây dựng bộ lọc
        const filter = {}

        // Lọc theo năm
        if (year && year !== "all") {
            filter.requestedDate = {
                $regex: `^.*${year}.*$`,  // Tìm kiếm năm trong chuỗi
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
                // Sử dụng regex để kiểm tra tháng trong quý và năm
                filter.requestedDate = {
                    $regex: `^(?:.*\\/(${monthsInQuarter.join("|")})\\/.*)${year}$`
                };
            }
        }

        // Lọc theo tháng và năm
        if (month && year && year !== "all") {
            filter.requestedDate = {
                $regex: `^.*${month.padStart(2, '0')}/${year}.*$`, // Tìm tháng trong năm
            };
        }


        // Lọc theo doctorId
        if (doctorId) {
            filter.doctorId = doctorId;
        }

        // Lấy dữ liệu từ cơ sở dữ liệu với bộ lọc
        const appointmentTickets = await AppointmentTicket.find(filter).populate({
            path: "customer",
            select: "_id name phone email gender",
        });

        res.status(200).json({appointmentTickets});
    } catch (error) {
        console.log("Error in getAllAppointmentTickets:", error);
        res.status(500).json({message: error.message});
    }
};

// Lấy danh sách bác sĩ cùng thời gian gian rảnh trong 7 ngày từ ngày hiện tại
const getAvailableDoctors = async (req, res) => {
    try {
        const startDate = moment(); // Ngày hiện tại
        const endDate = moment().add(7, "days"); // Sau 7 ngày
        const availableTimeSlots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

        // Lấy danh sách bác sĩ đang làm việc
        const doctors = await Employee.find({
            position: "doctor",
            isWorking: true
        }).select("employeeID employeeName workingTime urlAvatar gender");

        // Lấy danh sách phiếu hẹn trong 7 ngày (so sánh với requestedDate dạng chuỗi)
        const startDateString = startDate.format("DD/MM/YYYY");
        const endDateString = endDate.format("DD/MM/YYYY");

        const appointmentTickets = await AppointmentTicket.find({
            requestedDate: {
                $gte: startDateString,
                $lte: endDateString
            },
            status: {$in: ["waiting"]}
        });

        const doctorAvailability = doctors.map(doctor => {
            const freeTimes = {}; // Object lưu thời gian rảnh theo ngày

            // Duyệt qua từng ngày trong 7 ngày tới
            for (let i = 0; i <= 7; i++) {
                const currentDay = startDate.clone().add(i, "days");
                const currentDayString = currentDay.format("DD/MM/YYYY");
                const currentDayName = currentDay.format("dddd");

                // Kiểm tra bác sĩ làm việc vào ngày này
                const workingDay = doctor.workingTime.find(w => w.day === currentDayName);

                if (!workingDay) continue;

                let timeSlots = [];

                // Phân tách các giờ trong timeSlots từ giờ làm việc của bác sĩ
                workingDay.timeSlots.forEach(slot => {
                    const [start, end] = slot.split(" - ");
                    let startTime = moment(start, "HH:mm");
                    let endTime = moment(end, "HH:mm");

                    // Lặp qua từng giờ trong khoảng thời gian và thêm vào timeSlots
                    while (startTime.isBefore(endTime)) {
                        timeSlots.push(startTime.format("HH:mm"));
                        startTime = startTime.add(1, "hour");
                    }
                });

                // Lọc ra các timeSlots có trong availableTimeSlots
                timeSlots = timeSlots.filter(slot => availableTimeSlots.includes(slot));

                // Lọc các timeSlots trùng với phiếu hẹn của bác sĩ trong ngày
                const appointments = appointmentTickets.filter(ticket =>
                    ticket.doctorId === doctor.employeeID &&
                    ticket.requestedDate === currentDayString // Kiểm tra ngày trùng khớp
                );

                // Lọc các giờ trùng với phiếu hẹn
                appointments.forEach(ticket => {
                    if (ticket.status === "cancelled") return;

                    const appointmentStart = moment(ticket.requestedTime, "HH:mm");
                    const appointmentEnd = moment(ticket.endTime, "HH:mm");

                    // Loại bỏ các giờ nằm trong khoảng thời gian của phiếu hẹn
                    timeSlots = timeSlots.filter(slot => {
                        const currentTime = moment(slot, "HH:mm");
                        return !(
                            currentTime.isSame(appointmentStart, 'minute') || // Loại bỏ giờ bắt đầu của phiếu hẹn
                            currentTime.isBetween(appointmentStart, appointmentEnd, null, '[)') // Loại bỏ các giờ trong khoảng thời gian phiếu hẹn
                        );
                    });
                });

                // Lọc thời gian chỉ cho ngày hiện tại
                const now = moment(); // Lấy thời gian hiện tại
                if (currentDay.isSame(now, "day")) {
                    const timeAfterTwoHours = now.clone().add(2, "hours"); // Cộng thêm 2 giờ vào thời gian hiện tại

                    timeSlots = timeSlots.filter(slot => {
                        const currentTime = moment(slot, "HH:mm");
                        return currentTime.isAfter(timeAfterTwoHours); // Giữ lại các giờ sau thời gian hiện tại + 2 giờ
                    });
                }

                // Lưu thời gian rảnh trong ngày
                freeTimes[currentDayString] = timeSlots;
            }

            return {
                doctorId: doctor.employeeID,
                doctorName: doctor.employeeName,
                doctorAvatar: doctor.urlAvatar,
                doctorGender: doctor.gender,
                availableTimes: freeTimes,
            };
        });

        return res.status(200).json(doctorAvailability);
    } catch (error) {
        console.log("Error in getAvailableDoctors:", error);
        return res.status(500).json({message: error.message});
    }
};

// lấy thời gian làm việc của bác sĩ để khách hàng đặt lịch
const getTimeOfDoctor = async (req, res) => {
    try {
        const startDate = moment(); // Ngày hiện tại
        const endDate = moment().add(7, "days"); // Sau 7 ngày
        const availableTimeSlots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

        // Lấy danh sách bác sĩ đang làm việc
        const doctors = await Employee.find({
            position: "doctor",
            isWorking: true,
        }).select("employeeID employeeName workingTime urlAvatar gender");

        const doctorAvailability = doctors.map((doctor) => {
            const freeTimes = {}; // Object lưu thời gian rảnh theo ngày

            // Duyệt qua từng ngày trong 7 ngày tới
            for (let i = 0; i <= 7; i++) {
                const currentDay = startDate.clone().add(i, "days");
                const currentDayName = currentDay.format("dddd");

                // Kiểm tra bác sĩ làm việc vào ngày này
                const workingDay = doctor.workingTime.find((w) => w.day === currentDayName);

                if (!workingDay) continue;

                let timeSlots = [];

                // Phân tách các giờ trong timeSlots từ giờ làm việc của bác sĩ
                workingDay.timeSlots.forEach((slot) => {
                    const [start, end] = slot.split(" - ");
                    let startTime = moment(start, "HH:mm");
                    let endTime = moment(end, "HH:mm");

                    // Lặp qua từng giờ trong khoảng thời gian và thêm vào timeSlots
                    while (startTime.isBefore(endTime)) {
                        timeSlots.push(startTime.format("HH:mm"));
                        startTime = startTime.add(1, "hour");
                    }
                });

                // Lọc ra các timeSlots có trong availableTimeSlots và lớn hơn 2 giờ so với hiện tại
                timeSlots = timeSlots.filter((slot) => {
                    const slotTime = moment(`${currentDay.format("YYYY-MM-DD")} ${slot}`, "YYYY-MM-DD HH:mm");
                    const twoHoursLater = moment().add(2, "hours");
                    return availableTimeSlots.includes(slot) && slotTime.isAfter(twoHoursLater);
                });

                // Lưu thời gian rảnh trong ngày
                freeTimes[currentDay.format("DD/MM/YYYY")] = timeSlots;
            }

            return {
                doctorId: doctor.employeeID,
                doctorName: doctor.employeeName,
                doctorAvatar: doctor.urlAvatar,
                doctorGender: doctor.gender,
                availableTimes: freeTimes,
            };
        });

        return res.status(200).json(doctorAvailability);
    } catch (error) {
        console.error("Error in getAvailableDoctors:", error);
        return res.status(500).json({message: error.message});
    }
};

// lấy thơ gian rảnh của bác sĩ cho khách hàng offline tới phòng khám
// không có cách 2 tiếng
const getAvailableDoctorOffline = async (req, res) => {
    try {
        const startDate = moment(); // Ngày hiện tại
        const endDate = moment().add(7, "days"); // Sau 7 ngày
        const availableTimeSlots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

        // Lấy danh sách bác sĩ đang làm việc
        const doctors = await Employee.find({
            position: "doctor",
            isWorking: true
        }).select("employeeID employeeName workingTime urlAvatar gender");

        // Lấy danh sách phiếu hẹn trong 7 ngày
        const startDateString = startDate.format("DD/MM/YYYY");
        const endDateString = endDate.format("DD/MM/YYYY");

        const appointmentTickets = await AppointmentTicket.find({
            requestedDate: {
                $gte: startDateString,
                $lte: endDateString
            },
            status: { $in: ["waiting"] }
        });

        const doctorAvailability = doctors.map(doctor => {
            const freeTimes = {}; // Object lưu thời gian rảnh theo ngày

            for (let i = 0; i <= 7; i++) {
                const currentDay = startDate.clone().add(i, "days");
                const currentDayString = currentDay.format("DD/MM/YYYY");
                const currentDayName = currentDay.format("dddd");

                // Kiểm tra bác sĩ có làm việc vào ngày này không
                const workingDay = doctor.workingTime.find(w => w.day === currentDayName);

                if (!workingDay) continue;

                // Tạo danh sách timeSlots từ giờ làm việc
                let timeSlots = [];
                workingDay.timeSlots.forEach(slot => {
                    const [start, end] = slot.split(" - ");
                    let startTime = moment(start, "HH:mm");
                    let endTime = moment(end, "HH:mm");

                    while (startTime.isBefore(endTime)) {
                        const slotTime = startTime.format("HH:mm");
                        if (availableTimeSlots.includes(slotTime)) {
                            timeSlots.push(slotTime);
                        }
                        startTime.add(1, "hour");
                    }
                });

                // Lọc giờ trùng với các phiếu hẹn
                const doctorAppointments = appointmentTickets.filter(ticket =>
                    ticket.doctorId === doctor.employeeID &&
                    ticket.requestedDate === currentDayString
                );

                doctorAppointments.forEach(ticket => {
                    const appointmentStart = moment(ticket.requestedTime, "HH:mm");
                    const appointmentEnd = moment(ticket.endTime, "HH:mm");

                    timeSlots = timeSlots.filter(slot => {
                        const currentTime = moment(slot, "HH:mm");
                        return !(
                            currentTime.isSame(appointmentStart, 'minute') ||
                            currentTime.isBetween(appointmentStart, appointmentEnd, null, '[)')
                        );
                    });
                });

                // Chỉ giữ lại giờ sau thời gian hiện tại nếu là ngày hôm nay
                if (currentDay.isSame(moment(), "day")) {
                    const now = moment();
                    timeSlots = timeSlots.filter(slot => {
                        const currentTime = moment(slot, "HH:mm");
                        return currentTime.isAfter(now);
                    });
                }

                freeTimes[currentDayString] = timeSlots;
            }

            return {
                doctorId: doctor.employeeID,
                doctorName: doctor.employeeName,
                doctorAvatar: doctor.urlAvatar,
                doctorGender: doctor.gender,
                availableTimes: freeTimes,
            };
        });

        return res.status(200).json(doctorAvailability);
    } catch (error) {
        console.error("Error in getAvailableDoctors:", error);
        return res.status(500).json({ message: error.message });
    }
};

// Lấy tất cả phiếu hẹn của một bác sĩ
const getAppointmentTicketsByDoctorId = async (req, res) => {
    try {
        const {doctorId} = req.params;
        const {year, quarter, month} = req.query; // Lấy tham số từ query string
        const doctor = await Employee.findOne({employeeID: doctorId});

        if (!doctor) {
            return res.status(404).json({message: "Không tìm thấy bác sĩ"});
        }

        // Xây dựng bộ lọc
        const filter = {doctorId};

        // Lọc theo năm
        if (year && year !== "all") {
            filter.requestedDate = {
                $regex: `^.*${year}.*$`, // Tìm kiếm năm trong chuỗi requestedDate
            };
        }

        // Lọc theo quý
        if (year && year !== "all" && quarter) {
            const quarters = {
                "1": ["01", "02", "03"],  // Quý 1
                "2": ["04", "05", "06"],  // Quý 2
                "3": ["07", "08", "09"],  // Quý 3
                "4": ["10", "11", "12"],  // Quý 4
            };

            const monthsInQuarter = quarters[quarter];

            if (monthsInQuarter) {
                // Sử dụng regex để kiểm tra tháng trong quý và năm
                filter.requestedDate = {
                    $regex: `^(?:.*\\/(${monthsInQuarter.join("|")})\\/.*)${year}$`
                };
            }
        }

        // Lọc theo tháng và năm
        if (month && year && year !== "all") {
            filter.requestedDate = {
                $regex: `^.*${month.padStart(2, '0')}/${year}.*$`, // Tìm tháng trong năm
            };
        }

        // Lấy dữ liệu từ cơ sở dữ liệu với bộ lọc
        const appointmentTickets = await AppointmentTicket.find(filter).populate({
            path: "customer",
            select: "_id name phone email gender",
        });

        // Thêm thông tin bác sĩ vào dữ liệu
        const ticketsWithDoctorInfo = appointmentTickets.map(ticket => ({
            ...ticket._doc,
            doctorName: doctor.employeeName,
            doctorPhone: doctor.employeePhone,
            doctorEmail: doctor.employeeEmail,
        }));

        res.status(200).json({tickets: ticketsWithDoctorInfo});
    } catch (error) {
        console.log("Error in getAppointmentTicketsByDoctorId:", error);
        res.status(500).json({message: error.message});
    }
};

// lấy phiếu hẹn theo id của phiếu
const getAppointmentTicketById = async (req, res) => {
    try {
        const {id} = req.params;
        const appointmentTicket = await AppointmentTicket.findById(id).populate({
            path: "customer",
            select: "_id name phone email gender",
        });
        ;
        if (!appointmentTicket) {
            return res.status(404).json({message: "Không tìm thấy phiếu hẹn"});
        }

        const doctor = await Employee.findOne({employeeID: appointmentTicket.doctorId});
        if (!doctor) {
            return res.status(404).json({message: "Không tìm thấy bác sĩ"});
        }

        // Thêm thông tin bác sĩ vào phiếu hẹn
        const ticket = {
            ...appointmentTicket._doc,
            doctorName: doctor.employeeName,
            doctorPhone: doctor.employeePhone,
            doctorEmail: doctor.employeeEmail,
        }


        return res.status(200).json({ticket});


    } catch (error) {
        console.log("error in get ticket by id", error);
        res.status(500).json({message: error});
    }
}

//hàm auto hủy phiếu hẹn sau 10 phút khi qua thời gian hẹn
const autoCancellExpiredTickets = async () => {
    try {
        const tickets = await AppointmentTicket.find({
            status: "waiting",
            isCustomerArrived: false
        }).populate({
            path: "customer",
            select: "_id name phone email gender countCancelled",
        });

        const now = Date.now();
        const expiredTickets = tickets.filter(ticket => {
            const requestedTime = moment(`${ticket.requestedDate} ${ticket.requestedTime}`, "DD/MM/YYYY HH:mm").valueOf();
            return now - requestedTime > 10 * 60 * 1000; // Quá 10 phút
        });

        // Xử lý theo nhóm (batch) để tránh quá tải
        for (const ticket of expiredTickets) {
            try {
                const isCancelled = await AppointmentTicket.findByIdAndUpdate(ticket._id, {
                    status: "cancelled",
                    reasonCancelled: "Hết hạn",
                    cancelledBy: "Hệ thống",
                    cancelledAt: getVietnamTimeString(),
                });

                if (isCancelled) {
                    await sendCancellAppointmentTicket(
                        ticket.customer.email,
                        ticket.customer.name,
                        "Đã hủy",
                        ticket.requestedDate,
                        ticket.requestedTime,
                        ticket.service,
                        "Hệ thống",
                        "Hết hạn",
                        getVietnamTimeString()
                    );

                    await Customer.findByIdAndUpdate(ticket.customer._id,{
                        countCancelled: ticket.customer.countCancelled + 1,
                    })
                }
            } catch (error) {
                console.error(`Failed to cancel ticket ${ticket._id}:`, error);
            }
        }

        if (expiredTickets.length > 0) {
            io.emit("responseTicket");
        }
    } catch (error) {
        console.error("Error in auto cancel tickets", error);
    }
};

setInterval(autoCancellExpiredTickets, 5000 * 60); // Kiểm tra mỗi 5 phút

const cancelTicket = async (req, res) => {
    const {id} = req.params;

    const {reason, cancelledBy} = req.body;

    try {
        const ticket = await AppointmentTicket.findById(id).populate({
            path: "customer",
            select: "_id name phone email gender countCancelled",
        });
        ;
        if (!ticket) {
            return res.status(404).json({message: "Không tìm thấy phiếu hẹn"});
        }

        if (ticket.status === "cancelled") {
            return res.status(400).json({message: "Phiếu hẹn đã bị hủy"});
        }

        if (ticket.status === "done") {
            return res.status(400).json({message: "Phiếu hẹn đã hoàn thành không thể hủy"});
        }

        const isCancelled = await AppointmentTicket.findByIdAndUpdate(id, {
            status: "cancelled",
            reasonCancelled: reason,
            cancelledBy: cancelledBy,
            cancelledAt: getVietnamTimeString(),
        });

        if (isCancelled) {
            await sendCancellAppointmentTicket(ticket.customer.email, ticket.customer.name, "Đã hủy", ticket.requestedDate, ticket.requestedTime, ticket.requestedService, cancelledBy, reason, getVietnamTimeString());

            await Customer.findByIdAndUpdate(ticket.customer._id,{
                countCancelled: ticket.customer.countCancelled + 1,
            })
        }

            io.emit("responseTicket");

            return res.status(200).json({message: "Hủy phiếu hẹn thành công"});
        }
    catch
        (error)
        {
            console.log("error in cancel ticket", error);
            return res.status(500).json({message: error});
        }
    }

    const confirmCustomerIsArrived = async (req, res) => {
        const {id} = req.params; // ticket id
        const {confirmedBy} = req.body;

        try {
            const ticket = await AppointmentTicket.findById(id);

            if (!ticket) {
                return res.status(404).json({message: "Không tìm thấy phiếu hẹn"});
            }

            if (ticket.status === "cancelled") {
                return res.status(400).json({message: "Phiếu hẹn đã bị hủy"});
            }

            if (ticket.status === "done") {
                return res.status(400).json({message: "Phiếu hẹn đã hoàn thành"});
            }

            if (ticket.isCustomerArrived) {
                return res.status(400).json({message: "Đã xác nhận khách hàng đã đến"});
            }

            const isConfirmed = await AppointmentTicket.updateOne({_id: id}, {
                isCustomerArrived: true,
                confirmedBy: confirmedBy,
                arrivedAt: getVietnamTimeString(),
            })

            if (isConfirmed) {
                io.emit("responseTicket");
            }

            return res.status(200).json({message: "Xác nhận khách hàng đã đến thành công"});
        } catch (error) {
            console.log("error in confirm customer is arrived", error);
            return res.status(500).json({message: error});
        }
    }

// lây top 3 bác sĩ có số phiếu hẹn nhiều nhất
    const getTopDoctor = async (req, res) => {
        try {
            const {year, quarter, month} = req.query;

            // Xây dựng bộ lọc cho AppointmentTicket
            const filter = {};

            // Lọc theo năm
            if (year && year !== "all") {
                filter.requestedDate = {
                    $regex: `^.*${year}.*$`,  // Tìm kiếm năm trong chuỗi
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
                    filter.requestedDate = {
                        $regex: `^(?:.*\\/(${monthsInQuarter.join("|")})\\/.*)${year}$`
                    };
                }
            }

            // Lọc theo tháng và năm
            if (month && year && year !== "all") {
                filter.requestedDate = {
                    $regex: `^.*${month.padStart(2, '0')}/${year}.*$`, // Tìm tháng trong năm
                };
            }

            // Aggregation pipeline để lấy top 3 bác sĩ
            const topDoctors = await AppointmentTicket.aggregate([
                // Áp dụng bộ lọc dựa trên year, quarter và month
                {$match: filter},
                {
                    $group: {
                        _id: "$doctorId", // Nhóm theo doctorId
                        totalTickets: {$sum: 1} // Đếm số lượng phiếu hẹn
                    }
                },
                {
                    $sort: {totalTickets: -1} // Sắp xếp giảm dần theo số lượng phiếu hẹn
                },
                {
                    $limit: 3 // Lấy top 3
                },
                {
                    $lookup: {
                        from: "employees", // Collection Employee
                        localField: "_id", // Trường doctorId (_id trong group)
                        foreignField: "employeeID", // Trường liên kết bên Employee
                        as: "doctorInfo" // Kết quả truy vấn thông tin bác sĩ
                    }
                },
                {
                    $unwind: "$doctorInfo" // Tách mảng kết quả doctorInfo thành đối tượng
                },
                {
                    $project: {
                        doctorId: "$_id", // Giữ lại trường doctorId
                        doctorName: "$doctorInfo.employeeName", // Lấy tên bác sĩ
                        totalTickets: 1 // Giữ nguyên số phiếu hẹn
                    }
                }
            ]);

            return res.status(200).json({topDoctors});
        } catch (error) {
            console.error("Error in getTopDoctor:", error);
            return res.status(500).json({message: "Internal server error", error});
        }
    };

    const appointmentSumary = async (req, res) => {
        try {
            const {year, quarter, month, doctorId} = req.query;

            // Xây dựng bộ lọc cho AppointmentTicket
            const filter = {};

            if (doctorId) {
                filter.doctorId = doctorId;
            }

            // Lọc theo năm
            if (year && year !== "all") {
                filter.requestedDate = {
                    $regex: `^.*${year}.*$`,  // Tìm kiếm năm trong chuỗi
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
                    filter.requestedDate = {
                        $regex: `^(?:.*\\/(${monthsInQuarter.join("|")})\\/.*)${year}$`
                    };
                }
            }

            // Lọc theo tháng và năm
            if (month && year && year !== "all") {
                filter.requestedDate = {
                    $regex: `^.*${month.padStart(2, '0')}/${year}.*$`, // Tìm tháng trong năm
                };
            }

            // Tính toán số lượng theo từng trạng thái với bộ lọc
            const [totalAppointments, cancelled, waiting, done] = await Promise.all([
                AppointmentTicket.countDocuments(filter), // Tổng số lịch hẹn theo bộ lọc
                AppointmentTicket.countDocuments({...filter, status: "cancelled"}), // Lịch hẹn bị hủy
                AppointmentTicket.countDocuments({...filter, status: "waiting"}), // Lịch hẹn đang chờ
                AppointmentTicket.countDocuments({...filter, status: "done"}) // Lịch hẹn đã hoàn thành
            ]);

            // Trả về dữ liệu
            res.status(200).json({
                totalAppointments,
                cancelled,
                waiting,
                done
            });
        } catch (error) {
            console.error("Error fetching appointment summary:", error);
            res.status(500).json({error: "Internal server error"});
        }
    };

// lấy lịch hẹn đã hoàn thành của bac sĩ
    const getTicketDoneOfDoctor = async (req, res) => {
        try {
            const {year, quarter, month, doctorId} = req.query;

            // Tạo bộ lọc
            const filter = {
                status: "done", // Chỉ lấy các lịch hẹn có trạng thái "done",
                doctorId: doctorId ? doctorId : null
            };


            // Lọc theo năm
            if (year && year !== "all") {
                filter.doneAt = {
                    $regex: `\\d{2}/\\d{2}/${year} \\d{2}:\\d{2}:\\d{2}`,
                };
            }

            // Lọc theo quý
            if (quarter && year && year !== "all") {
                const quarters = {
                    "1": ["01", "02", "03"], // Quý 1: Tháng 1, 2, 3
                    "2": ["04", "05", "06"], // Quý 2: Tháng 4, 5, 6
                    "3": ["07", "08", "09"], // Quý 3: Tháng 7, 8, 9
                    "4": ["10", "11", "12"], // Quý 4: Tháng 10, 11, 12
                };

                const monthsInQuarter = quarters[quarter];
                if (monthsInQuarter) {
                    filter.doneAt = {
                        $regex: `\\d{2}/(${monthsInQuarter.join("|")})/${year} \\d{2}:\\d{2}:\\d{2}`,
                    };
                }
            }

            // Lọc theo tháng và năm
            if (month && year && year !== "all") {
                filter.doneAt = {
                    $regex: `\\d{2}/${month.padStart(2, "0")}/${year} \\d{2}:\\d{2}:\\d{2}`,
                };
            }

            // Lấy dữ liệu từ cơ sở dữ liệu với bộ lọc
            const appointmentTickets = await AppointmentTicket.find(filter).populate({
                path: "customer",
                select: "_id name phone email gender",
            });

            res.status(200).json({appointmentTickets});
        } catch (error) {
            console.log("Error in getTicketDoneOfDoctor:", error);
            res.status(500).json({message: error.message});
        }
    };

    module.exports = {
        getAllAppointmentTickets,
        getAppointmentTicketsByDoctorId,
        getAppointmentTicketById,
        createAppointmentTicket,
        getAvailableDoctors,
        cancelTicket,
        confirmCustomerIsArrived,
        getTopDoctor,
        appointmentSumary,
        getTimeOfDoctor,
        getAvailableDoctorOffline,
        getTicketDoneOfDoctor
    };