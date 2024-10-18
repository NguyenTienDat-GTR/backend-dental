const express = require('express');
const router = express.Router();

const { createAccount, getAllAccount, getEmployeeWithoutAccount } = require('../controllers/AccountController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/create', authMiddleware(["admin"]), createAccount);

router.get('/all', authMiddleware(["admin"]), getAllAccount);

router.get('/employee-without-account', authMiddleware(["admin"]), getEmployeeWithoutAccount);

module.exports = router;