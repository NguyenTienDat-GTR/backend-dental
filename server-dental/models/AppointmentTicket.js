const mongoose = require("mongoose");

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


//  Phiếu Hẹn
const appointmentTicketSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true,
    },
    customerPhone: {
        type: String,
        required: true,
        unique: true,
    },
    customerEmail: {
        type: String,
        unique: true,
    },
    customerGender: {
        type: String,
        enum: ["male", "female"],
        required: true,
    },
    requestedService: {
        type: String,
        required: true,
    },
    requestedDate: {
        type: String,
        required: true,
    },
    requestedTime: {
        type: String,
        required: true,
    },
    endTime: {
        type: String,
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
    doneBy: {
        type: String,
        default: null,
    },
    doneAt: {
        type: String,
        default: null,
    },
    cancelledBy: {
        type: String,
        default: null,
    },
    reasonCancelled: {
        type: String,
    },
    cancelledAt: {
        type: String,
        default: null,
    },
    isCustomerArrived: {
        type: Boolean,
        default: false, // Mặc định là khách hàng chưa đến
    },
    confirmedBy: {
        type: String,
        default: null,
    },
    arrivedAt: {
        type: String,
        default: null,
    },
    createAt: {
        type: String,
        default: getVietnamTimeString,
    },
    createBy: {
        type: String,
        default: "customer",
    },
    note: {
        type: String,
        default: "",
    },
    concern: [
        {
            type: String,
            default: ""
        }
    ],
});

// Đặt unique index
appointmentTicketSchema.index({doctorId: 1, requestedDate: 1, requestedTime: 1}, {unique: true});

// Tạo model Phiếu Hẹn
const AppointmentTicket = mongoose.model(
    "AppointmentTicket",
    appointmentTicketSchema
);

module.exports = AppointmentTicket;
