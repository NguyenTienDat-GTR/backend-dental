const express = require("express");
const router = express.Router();

const {
    createAppointmentRequest,
    getAllRequest,
    getListDoctorAvailability,
    changeRequest,
    getRequestById,
    responseRequest,
} = require("../controllers/appointmentRequestController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/create", createAppointmentRequest);
router.get("/all", authMiddleware(["admin", "employee"]), getAllRequest);
router.get(
    "/doctor-availability/:id",
    authMiddleware(["admin", "employee"]),
    getListDoctorAvailability
);
router.put("/change/:id", authMiddleware(["admin", "employee"]), changeRequest);
router.get("/getById/:id", authMiddleware(["admin", "employee"]), getRequestById)
router.put("/response/:id", authMiddleware(["admin", "employee"]), responseRequest);

module.exports = router;
