const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const {
    getAllAppointmentTickets,
    getAppointmentTicketsByDoctorId,
    getAppointmentTicketById,
    createAppointmentTicket,
    getAvailableDoctors,
    cancelTicket,
    confirmCustomerIsArrived,
    getTopDoctor,
    appointmentSumary
} = require("../controllers/AppointmentTicketController");

router.get("/all", authMiddleware(["admin", "employee"]), getAllAppointmentTickets);
router.get("/getByDoctor/:doctorId", authMiddleware(["doctor"]), getAppointmentTicketsByDoctorId);
router.get("/getById/:id", authMiddleware(["admin", "employee", "doctor"]), getAppointmentTicketById);
router.post("/create", createAppointmentTicket);
router.get("/getAvailableDoctors", getAvailableDoctors);
router.put("/cancelTicket/:id",authMiddleware(["admin", "employee"]), cancelTicket);
router.put("/confirmCustomerIsArrived/:id", authMiddleware(["admin", "employee"]), confirmCustomerIsArrived);
router.get("/getTopDoctor",authMiddleware(["admin"]), getTopDoctor);
router.get("/appointmentSumary",authMiddleware(["admin"]), appointmentSumary);

module.exports = router;