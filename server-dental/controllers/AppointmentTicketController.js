const AppointmentTicket = require('../models/AppointmentTicket');
const Employee = require('../models/Employee');
const { checkDoctorAvailability } = require('../controllers/appointmentRequestController')
const { sendCancellAppointmentTicket } = require('../middlewares/sendMessage')
const moment = require('moment');
const { io } = require("../socket");

// Lấy tất cả phiếu hẹn
const getAllAppointmentTickets = async (req, res) => {
    try {
        const appointmentTickets = await AppointmentTicket.find();

        res.status(200).json({ appointmentTickets });
    } catch (error) {
        console.log("error in get all ticket", error);
        res.status(500).json({ message: error });
    }
}

// Lấy tất cả phiếu hẹn của một bác sĩ
const getAppointmentTicketsByDoctorId = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const doctor = await Employee.findOne({ employeeID: doctorId });
        if (!doctor) {
            return res.status(404).json({ message: "Không tìm thấy bác sĩ" });
        }
        const appointmentTickets = await AppointmentTicket.find({ doctorId: doctorId });

        const ticketsWithDoctorInfo = appointmentTickets.map(ticket => ({
            ...ticket._doc,
            doctorName: doctor.employeeName,
            doctorPhone: doctor.employeePhone,
            doctorEmail: doctor.employeeEmail,
        }));

        res.status(200).json({ tickets: ticketsWithDoctorInfo });
    } catch (error) {
        res.status(500).json({ message: error });
    }
};


// lấy phiếu hẹn theo id của phiếu
const getAppointmentTicketById = async (req, res) => {
    try {
        const { id } = req.params;
        const appointmentTicket = await AppointmentTicket.findById(id);
        if (!appointmentTicket) {
            return res.status(404).json({ message: "Không tìm thấy phiếu hẹn" });
        }

        const doctor = await Employee.findOne({ employeeID: appointmentTicket.doctorId });
        if (!doctor) {
            return res.status(404).json({ message: "Không tìm thấy bác sĩ" });
        }

        // Thêm thông tin bác sĩ vào phiếu hẹn
        const ticket = {
            ...appointmentTicket._doc,
            doctorName: doctor.employeeName,
            doctorPhone: doctor.employeePhone,
            doctorEmail: doctor.employeeEmail,
        }


        return res.status(200).json({ ticket });


    } catch (error) {
        console.log("error in get ticket by id", error);
        res.status(500).json({ message: error });
    }
}

const autoCancellExpiredTickets = async () => {
    try {
        const tickets = await AppointmentTicket.find({ status: "waiting", isCustomerArrived: false });
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
            const isCancelled = await AppointmentTicket.findByIdAndUpdate(ticket._id, { status: "cancelled", reasonCancelled: "Hết hạn", cancelledBy: "Hệ thống" });
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




const createAppointmentTicket = async (req, res) => {

}

module.exports = { getAllAppointmentTickets, getAppointmentTicketsByDoctorId, getAppointmentTicketById, getAppointmentTicketsByDoctorId };