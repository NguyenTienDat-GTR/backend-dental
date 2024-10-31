const express = require("express");
const router = express.Router();

const { createAppointmentRequest, getAllRequest } = require("../controllers/appointmentRequestController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/create", createAppointmentRequest);
router.get("/all", authMiddleware(["admin", "employee"]), getAllRequest)

module.exports = router;