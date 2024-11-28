const mongoose = require("mongoose");

const ToothSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    }
});

const Tooth = mongoose.model("Tooth", ToothSchema);

module.exports = mongoose.model("Tooth", ToothSchema);
