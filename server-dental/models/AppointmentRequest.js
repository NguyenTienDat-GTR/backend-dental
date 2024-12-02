const mongoose = require('mongoose');

// Hàm để lấy thời gian theo múi giờ Việt Nam dưới dạng chuỗi
const getVietnamTimeString = () => {
    const now = new Date();
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    };
    return now.toLocaleString("en-GB", {timeZone: "Asia/Ho_Chi_Minh", ...options}).replace(',', '');
};


const AppointmentRequest = new mongoose.Schema({
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
    gender: {
        type: String,
        required: true,
        enum: ["male", "female"],
    },
    appointmentDate: {
        type: String,
        required: true,
    },
    appointmentTime: {
        type: String,
        required: true,
    },
    service: {
        type: String,
        require: true
    },
    note: {
        type: String,
    },
    concern: [
        {
            type: String,
        }
    ],
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
    },
    acceptBy: {
        type: String,
    },
    reasonReject: {
        type: String,
    },
    rejectBy: {
        type: String
    },
    doctorId: {
        type: String,
        required: true,
    },
    createBy: {
        type: String,
        required: true,
    },
    createAt: {
        type: String,  // Thay đổi từ Date sang String
        required: true,
        default: getVietnamTimeString, // Sử dụng chuỗi thời gian Việt Nam
    },
    editBy: [
        {
            by: {
                type: String,
            },
            at: {
                type: String,
                default: getVietnamTimeString,
            }
        }
    ]

})

module.exports = mongoose.model('AppointmentRequest', AppointmentRequest);