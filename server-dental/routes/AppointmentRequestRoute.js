const express = require("express");
const router = express.Router();

const {
    createAppointmentRequest,
    getAllRequest,
    getListDoctorAvailability,
    changeRequest,
} = require("../controllers/appointmentRequestController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/create", createAppointmentRequest);
router.get("/all", authMiddleware(["admin", "employee"]), getAllRequest);
router.post(
    "/doctor-availability",
    authMiddleware(["admin", "employee"]),
    getListDoctorAvailability
);
router.put("/change", authMiddleware(["admin", "employee"]), changeRequest);

module.exports = router;
