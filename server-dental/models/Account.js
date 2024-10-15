const mongoose = require("mongoose");


const accountSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["admin", "doctor", "employee"],
        required: true,
    }
});

module.exports = mongoose.model("Account", accountSchema);
