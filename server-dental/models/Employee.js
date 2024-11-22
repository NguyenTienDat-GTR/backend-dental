const mongoose = require("mongoose");

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
    return now.toLocaleString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", ...options }).replace(',', '');
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
    workingTime:
        [
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
    position: {
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
});

module.exports = mongoose.model("Employee", Employee);
