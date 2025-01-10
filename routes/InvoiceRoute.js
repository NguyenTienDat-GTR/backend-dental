const express = require("express");
const router = express.Router();

const {createInvoice, getAllInvoice, confirmPayment, calculateTotalAmount, getTotalAmount} = require('../controllers/InvoiceController');
const authMiddleware = require("../middlewares/authMiddleware");

router.post('/create', authMiddleware(["admin", "doctor"]), createInvoice);
router.get('/all', authMiddleware(["admin", "employee"]), getAllInvoice);
router.put('/confirm-payment', authMiddleware(["admin", "employee"]), confirmPayment);
router.get('/total-amount', authMiddleware(["admin"]), calculateTotalAmount);
router.get('/total-amount-all', authMiddleware(["admin"]), getTotalAmount);

module.exports = router;