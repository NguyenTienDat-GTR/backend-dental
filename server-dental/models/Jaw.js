const mongoose = require('mongoose');

const JawSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
    }
})

module.exports = mongoose.model('Jaw', JawSchema);