const monggose = require('mongoose');

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

const MedicalRecordSchema = new monggose.Schema({
    customerID: {
        type: monggose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    doctorID: {
        type: String,
        required: true,
    },
    doctorName: {
        type: String,
        required: true,
    },
    serviceID: [{
        type: monggose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true,
    }],
    appointmentID: {
        type: monggose.Schema.Types.ObjectId,
        ref: 'AppointmentTicket',
        required: true,
    },
    // chẩn đoán
    diagnosis: {
        type: String,
        required: true,
    },
    // kết quả khám
    result: {
        type: String,
        required: true,
    },
    note: {
        type: String,
        required: true,
    },
    // ngày khám
    date: {
        type: String,
        default: getVietnamTimeString(),
    },

});