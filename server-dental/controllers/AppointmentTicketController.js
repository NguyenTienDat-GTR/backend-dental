const AppointmentTicket = require('../models/AppointmentTicket');
const Employee = require('../models/Employee');
const Service = require('../models/Service');
const {sendCancellAppointmentTicket} = require('../middlewares/sendMessage')
const moment = require('moment');
const {io} = require("../socket");
const {sendResponseAppointmentRequest} = require("../middlewares/sendMessage");

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
    const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Thời gian hiện tại + 30 ngày

    // Kiểm tra điều kiện
    if (appointmentDateTime <= twoHoursLater) {
        return res.status(400).json({message: "Thời gian hẹn phải lớn hơn 2 giờ so với thời gian hiện tại."});
    }

    if (appointmentDateTime > oneMonthLater) {
        return res.status(400).json({message: "Thời gian hẹn không được vượt quá 1 tháng kể từ thời điểm hiện tại."});
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
        createBy
    } = req.body;

    const session = await AppointmentTicket.startSession(); // Khởi tạo session MongoDB
    session.startTransaction();

    try {
        // Kiểm tra thông tin nhập vào
        if (!doctorId || !customerName || !customerPhone || !requestedDate || !requestedTime || !service) {
            return res.status(400).json({message: "Cần điền đầy đủ thông tin"});
        }

        const doctor = await Employee.findOne({employeeID: doctorId}).session(session);
        if (!doctor) {
            return res.status(404).json({message: "Không tìm thấy bác sĩ"});
        }

        const serviceInfo = await Service.findOne({name: service}).session(session);
        if (!serviceInfo) {
            return res.status(404).json({message: "Không tìm thấy dịch vụ"});
        }

        if (!validateName(customerName)) {
            return res.status(400).json({message: "Tên không hợp lệ"});
        }

        if (!validatePhone(customerPhone)) {
            return res.status(400).json({message: "Số điện thoại không hợp lệ"});
        }

        if (customerEmail) {
            if (!validateEmail(customerEmail)) {
                return res.status(400).json({message: "Email không hợp lệ"});
            }
        }

        checkValidDateTime(requestedDate, requestedTime, res);

        // Kiểm tra xem có lịch hẹn trùng không
        const isDuplicate = await checkAvailableAppointment(doctorId, requestedDate, requestedTime);
        if (isDuplicate) {
            return res.status(409).json({message: "Lịch hẹn với thời gian và bác sĩ này đã được đặt trước đó! Vui lòng chọn thời gian hoặc bác sĩ khác"});
        }

        const endTime = moment(`${requestedTime}`, "HH:mm").add(serviceInfo.duration, "minutes").format("HH:mm");

        const ticket = new AppointmentTicket({
            customerName,
            customerPhone,
            customerEmail,
            requestedDate,
            requestedTime,
            requestedService: service,
            doctorId,
            endTime: endTime.toString(),
            createBy: createBy ? createBy : "customer",
            note,
        });

        const newTicket = await ticket.save({session});

        if (newTicket) {
            if (customerEmail)
                await sendResponseAppointmentRequest(customerEmail, customerName, requestedDate, requestedTime, doctor.employeeName, service);
        }

        // Hoàn thành transaction
        await session.commitTransaction();
        session.endSession();

        io.emit("newAppointment");

        return res.status(201).json({ticket: newTicket, message: "Tạo lịch hẹn thành công"});
    } catch (error) {
        if (error.code === 11000) { // Mã lỗi MongoDB khi trùng key
            return res.status(409).json({message: "Lịch hẹn đã tồn tại"});
        }
        console.log("Error in createAppointmentTicket:", error);
        return res.status(500).json({message: error.message});
    }
};


// Lấy tất cả phiếu hẹn
const getAllAppointmentTickets = async (req, res) => {
    try {
        const appointmentTickets = await AppointmentTicket.find();

        res.status(200).json({appointmentTickets});
    } catch (error) {
        console.log("error in get all ticket", error);
        res.status(500).json({message: error});
    }
}

// Lấy danh sách bác sĩ cùng thời gian gian rảnh trong 30 ngày từ ngày hiện tại
const getAvailableDoctors = async (req, res) => {
    try {
        const startDate = moment(); // Ngày hiện tại
        console.log("Start Date:", startDate.format("DD/MM/YYYY"));
        const endDate = moment().add(7, "days"); // Sau 7 ngày
        console.log("End Date:", endDate.format("DD/MM/YYYY"));
        const availableTimeSlots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

        // Lấy danh sách bác sĩ đang làm việc
        const doctors = await Employee.find({
            position: "doctor",
            isWorking: true
        }).select("employeeID employeeName workingTime urlAvatar");
        console.log("Doctors:", doctors);

        // Lấy danh sách phiếu hẹn trong 7 ngày
        const appointmentTickets = await AppointmentTicket.find({
            requestedDate: {
                $gte: startDate.format("DD/MM/YYYY"),
                $lte: endDate.format("DD/MM/YYYY")
            },
            // trạng thái chờ xác nhận hoặc đã hoàn thành
            status: {$in: ["waiting", "done"]}
        });
        console.log("Appointment Tickets:", appointmentTickets);

        const doctorAvailability = doctors.map(doctor => {
            const freeTimes = {}; // Object lưu thời gian rảnh theo ngày

            // Duyệt qua từng ngày trong 30 ngày tới
            for (let i = 0; i <= 7; i++) {
                const currentDay = startDate.clone().add(i, "days");
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
                    ticket.requestedDate === currentDay.format("DD/MM/YYYY") // Kiểm tra ngày trùng khớp
                );

                // Log các phiếu hẹn của bác sĩ cho ngày hiện tại
                console.log(`Appointments for Doctor ${doctor.employeeName} on ${currentDay.format("DD/MM/YYYY")}:`, appointments);

                // Lọc các giờ trùng với phiếu hẹn
                appointments.forEach(ticket => {
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
                freeTimes[currentDay.format("DD/MM/YYYY")] = timeSlots;
            }

            return {
                doctorId: doctor.employeeID,
                doctorName: doctor.employeeName,
                doctorAvatar: doctor.urlAvatar,
                availableTimes: freeTimes,
            };
        });

        return res.status(200).json(doctorAvailability);
    } catch (error) {
        console.log("Error in getAvailableDoctors:", error);
        return res.status(500).json({message: error.message});
    }
};

// Lấy tất cả phiếu hẹn của một bác sĩ
const getAppointmentTicketsByDoctorId = async (req, res) => {
    try {
        const {doctorId} = req.params;
        const doctor = await Employee.findOne({employeeID: doctorId});
        if (!doctor) {
            return res.status(404).json({message: "Không tìm thấy bác sĩ"});
        }
        const appointmentTickets = await AppointmentTicket.find({doctorId: doctorId});

        const ticketsWithDoctorInfo = appointmentTickets.map(ticket => ({
            ...ticket._doc,
            doctorName: doctor.employeeName,
            doctorPhone: doctor.employeePhone,
            doctorEmail: doctor.employeeEmail,
        }));

        res.status(200).json({tickets: ticketsWithDoctorInfo});
    } catch (error) {
        res.status(500).json({message: error});
    }
};

// lấy phiếu hẹn theo id của phiếu
const getAppointmentTicketById = async (req, res) => {
    try {
        const {id} = req.params;
        const appointmentTicket = await AppointmentTicket.findById(id);
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
        const tickets = await AppointmentTicket.find({status: "waiting", isCustomerArrived: false});
        const now = Date.now();

        // Lấy ra các phiếu hẹn đã hết hạn 10 phút tính từ thời điểm hiện tại
        const expiredTickets = tickets.filter(ticket => {
            // Sử dụng moment để chuyển đổi định dạng ngày giờ chính xác
            const requestedTime = moment(`${ticket.requestedDate} ${ticket.requestedTime}`, "DD/MM/YYYY HH:mm").valueOf();

            // Kiểm tra kết quả của requestedTime
            // console.log(`Ticket ${ticket._id} - Now: ${now}, Requested Time: ${requestedTime}, Difference: ${now - requestedTime}`);

            // Điều kiện kiểm tra quá hạn
            return now - requestedTime > 10 * 60 * 1000;
        });

        await Promise.all(expiredTickets.map(async (ticket) => {
            const isCancelled = await AppointmentTicket.findByIdAndUpdate(ticket._id, {
                status: "cancelled",
                reasonCancelled: "Hết hạn",
                cancelledBy: "Hệ thống"
            });
            console.log("isCancelled", isCancelled.customerName);
            if (isCancelled) {
                await sendCancellAppointmentTicket(ticket.customerEmail, ticket.customerName, "rejected", ticket.requestedDate, ticket.requestedTime, ticket.service, "Hết hạn", "Hệ thống");
            }
        }));

        if (expiredTickets.length > 0) {
            io.emit("responseTicket");
        }
    } catch (error) {
        console.log("error in auto cancel tickets", error);
    }
}

setInterval(autoCancellExpiredTickets, 1000 * 60); // Kiểm tra mỗi 1 phút

const cancelTicket = async (req, res) => {
    const {id} = req.params;

    const {reason, cancelledBy} = req.body;
}

module.exports = {
    getAllAppointmentTickets,
    getAppointmentTicketsByDoctorId,
    getAppointmentTicketById,
    createAppointmentTicket,
    getAvailableDoctors
};