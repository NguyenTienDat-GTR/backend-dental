const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { getAllAppointmentTickets, getAppointmentTicketsByDoctorId, getAppointmentTicketById } = require("../controllers/AppointmentTicketController");

router.get("/all", authMiddleware(["admin", "employee"]), getAllAppointmentTickets);
router.get("/getByDoctor/:doctorId", authMiddleware(["doctor"]), getAppointmentTicketsByDoctorId);
router.get("/getById/:id", authMiddleware(["admin", "employee", "doctor"]), getAppointmentTicketById);

module.exports = router;