const AppointmentTicket = require('../models/AppointmentTicket');
const Employee = require('../models/Employee');
const { checkDoctorAvailability } = require('../controllers/appointmentRequestController')

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
        const appointmentTicket = await AppointmentTicket.findOne({ doctorId: doctorId });
        res.status(200).json({ appointmentTicket });
    } catch (error) {
        res.status(500).json({ message: error });
    }
}

// lấy phiếu hẹn theo id
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
            doctorName: doctor.name,
            doctorPhone: doctor.phone,
            doctorEmail: doctor.email,
        }

        return res.status(200).json({ ticket });


    } catch (error) {
        console.log("error in get ticket by id", error);
        res.status(500).json({ message: error });
    }
}

const createAppointmentTicket = async (req, res) => {

}

module.exports = { getAllAppointmentTickets, getAppointmentTicketsByDoctorId, getAppointmentTicketById };