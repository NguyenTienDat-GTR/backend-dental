const express = require('express');
const router = express.Router();


const { uploadAvatarMiddleware, handleFileSizeError } = require('../middlewares/uploadAvatar');
const { createEmployee } = require('../controllers/EmployeeController');

router.post('/create', uploadAvatarMiddleware.single('employeeAvatar'), handleFileSizeError, createEmployee);

module.exports = router;