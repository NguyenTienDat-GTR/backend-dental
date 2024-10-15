const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
    doctorID: {
        type: String,
        required: true,
        unique: true,
    },
    doctorName: {
        type: String,
        required: true,
    },
    gender: {
        enum: ["male", "female"],
        required: true,
        type: String,
    },
    birthDate: {
        type: Date,
        required: true,
    },
    doctorPhone: {
        type: String,
        required: true,
        unique: true,
    },
    doctorEmail: {
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
                ], // Chỉ định các ngày trong tuần
            },
            timeSlots: [
                {
                    type: String, // Chứa các khoảng thời gian trong ngày, ví dụ '8:00-12:00, 13:00-17:00'
                    required: true,
                },
            ],
        },
    ],
    doctorSpecialization: [
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
});

module.exports = mongoose.model("Doctor", doctorSchema);
