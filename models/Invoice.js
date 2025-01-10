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
        hour12: false,
    };
    return now.toLocaleString("en-GB", {timeZone: "Asia/Ho_Chi_Minh", ...options}).replace(',', '');
};

const invoiceSchema = new mongoose.Schema({
    medicalRecordID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalRecord',
        required: true,
    },
    usedServices: [
        {
            service: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Service',
                required: true,
            },
            for: {
                type: String, // Răng hoặc hàm cụ thể
                default: null,
            },
            price: {
                type: Number,
                required: true,
            },
            discount: {
                type: Number,
                required: true,
            },
            unit: {
                type: String,
                required: true,
                enum: ["tooth", "jaw", "treatment", "set", "session"],
            },
            finalPrice: {
                type: Number,
                required: true,
            },
        },
    ],
    // Trường giảm giá cho tổng hóa đơn
    discount: {
        type: Number,
        default: 0,
    },
    totalDiscount: {
        type: Number,
        required: true,
        default: 0,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: String,
        default: getVietnamTimeString,
    },
    createBy: {
        type: String,
        required: true,
    },
    //trường xác nhận ã thanh toán
    isPaid: {
        type: Boolean,
        default: false,
    },
    // Ngày thanh toán
    paidAt: {
        type: String,
    },
    // Người thanh toán
    paidBy: {
        type: String,
    },
});

// Middleware để tính toán giá trị hóa đơn trước khi lưu
invoiceSchema.pre('save', async function (next) {
    let totalAmount = 0;
    let totalDiscount = 0;

    // Tính toán tổng tiền và giảm giá cho từng dịch vụ
    for (const item of this.usedServices) {
        const service = await mongoose.model('Service').findById(item.service);
        if (!service) {
            throw new Error(`Service with ID ${item.service} not found`);
        }

        // Tính giá cuối cùng cho từng dịch vụ sau giảm giá
        const priceAfterDiscount = service.price * (1 - service.discount / 100);
        item.price = service.price;
        item.discount = service.discount;
        item.unit = service.unit;
        item.finalPrice = priceAfterDiscount;

        totalAmount += priceAfterDiscount;
        totalDiscount += service.price * (service.discount / 100); // Tính tổng giảm giá cho dịch vụ
    }

    // Áp dụng giảm giá cho tổng hóa đơn nếu có
    if (this.discount > 0) {
        totalAmount = totalAmount * (1 - this.discount / 100);
        totalDiscount += totalAmount * (this.discount / 100);
    }

    // Cập nhật tổng tiền và tổng giảm giá của hóa đơn
    this.totalAmount = totalAmount;
    this.totalDiscount = totalDiscount;

    next();
});

module.exports = mongoose.model("Invoice", invoiceSchema);
