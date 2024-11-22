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
    return now.toLocaleString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", ...options }).replace(',', '');
};

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        unique: true,
    },
    gender: {
        type: String,
        enum: ["male", "female"],
        required: true,
    },
    countDone: {
        type: Number,
        default: 0,
    },
    countCancelled: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: String,
        default: getVietnamTimeString(),
    }

});

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;