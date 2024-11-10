const mongoose = require("mongoose");

const getVietnamTimeString = () => {
    const now = new Date();
    return now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
};

//  Phiếu Hẹn
const appointmentTicketSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true,
    },
    customerPhone: {
        type: String,
        required: true,
    },
    customerEmail: {
        type: String,
        required: true,
    },
    requestedService: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "service",
    },
    requestedDate: {
        type: Date,
        required: true,
    },
    requestedTime: {
        type: String,
        required: true,
    },
    doctorId: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["waiting", "cancelled", "done"],
        default: "waiting",
    },
    isCustomerArrived: {
        type: Boolean,
        default: false, // Mặc định là khách hàng chưa đến
    },
    confirmedBy: {
        type: String,
        default: null,
    },
    createAt: {
        type: String,
        default: getVietnamTimeString,
    },
    createBy: {
        type: String,
        required: true,
    },
});

// Tạo model Phiếu Hẹn
const AppointmentTicket = mongoose.model(
    "AppointmentTicket",
    appointmentTicketSchema
);

module.exports = AppointmentTicket;
