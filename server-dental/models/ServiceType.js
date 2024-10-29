const mongoose = require("mongoose");

const ServiceType = new mongoose.Schema({
    typeName: {
        type: String,
        required: true,
        unique: true,
    },
    serviceList: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        default: [],
    }],
});

module.exports = mongoose.model("ServiceType", ServiceType);
