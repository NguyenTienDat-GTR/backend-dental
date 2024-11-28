const Customer = require('../models/Customer');

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

const getAllCustomers = async (req, res) => {
    try {
        const customers = await Customer.find();
        res.json(customers);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
}

const getCustomerByID = async (req, res) => {
    try {
        const {id} = req.params;
        const customer = await Customer.findById(id).populate('medicalRecord');
        res.json(customer);
    } catch (error) {
        res.status(500).json({message: error.message});
        console.error("Error fetching customer data:", error)
    }
}

module.exports = {
    getAllCustomers,
    getCustomerByID
}