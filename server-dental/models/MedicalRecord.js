const mongoose = require('mongoose');

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

const MedicalRecordSchema = new mongoose.Schema({
    customerID: {
        type: mongoose.Schema.Types.ObjectId,
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
    usedService: [
        {
        service:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
            required: true,
        },
            for: {
                type: String,
            },

    }],
    appointmentID: {
        type: mongoose.Schema.Types.ObjectId,
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
    },
    // ngày khám
    date: {
        type: String,
        default: getVietnamTimeString(),
    },

});

// Middleware trước khi lưu MedicalRecord
MedicalRecordSchema.pre('save', async function(next) {
    for (const item of this.usedService) {
        const service = await mongoose.model('Service').findById(item.service);

        if (service) {
            if (service.unit === 'tooth') {
                // Kiểm tra nếu unit là 'tooth', for là tên của tooth, không phải ID
                const toothExists = await mongoose.model('Tooth').findOne({ name: item.for });
                if (!toothExists) {
                    throw new Error('Invalid Tooth name for usedService');
                }
            } else if (service.unit === 'jaw') {
                const jawExists = await mongoose.model('Jaw').findOne({ name: item.for });
                if (!jawExists) {
                    throw new Error('Invalid Jaw name for usedService');
                }
            } else {
                item.for = null;
            }
        }
    }
    next();
});


module.exports = mongoose.model('MedicalRecord', MedicalRecordSchema);