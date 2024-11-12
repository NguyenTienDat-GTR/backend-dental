const mongoose = require("mongoose");

const Service = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    price: {
        type: Number,
        required: true,
    },
    priceRange: {
        type: String,
        require: true
    },
    description: {
        type: String,
        required: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    discount: {
        type: Number,
        default: 0,
    },
    imageUrls: [{
        type: String,
        required: true,
    }],
    unit: {
        type: String,
        enum: ["tooth", "jaw", "treatment", "set", "session",],
        default: "session"
    },
    blog: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Article",
    }
});
module.exports = mongoose.model("Service", Service);