const mongoose = require("mongoose");

// Hàm để lấy thời gian theo múi giờ Việt Nam dưới dạng chuỗi
const getVietnamTimeString = () => {
    const now = new Date();
    return now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
};

const Employee = new mongoose.Schema({
    employeeID: {
        type: String,
        required: true,
        unique: true,
    },
    employeeName: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        enum: ["male", "female"],
        required: true,
    },
    birthDate: {
        type: String,
        required: true,
    },
    employeePhone: {
        type: String,
        required: true,
        unique: true,
    },
    employeeEmail: {
        type: String,
        required: true,
        unique: true,
    },
    citizenID: {
        type: String,
        required: true,
        unique: true,
    },
    address: {
        type: String,
        required: true,
    },
    workingTime: [
        {
            day: {
                type: String,
                required: true,
                enum: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                ],
            },
            timeSlots: [
                {
                    type: String,
                    required: true,
                },
            ],
        },
    ],
    employeeSpecialization: [
        {
            type: String,
            required: true,
        },
    ],
    urlAvatar: {
        type: String,
        required: true,
    },
    isWorking: {
        type: Boolean,
        required: true,
        default: true,
    },
    role: {
        type: String,
        enum: ["doctor", "receptionist"],
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
});

module.exports = mongoose.model("Employee", Employee);
