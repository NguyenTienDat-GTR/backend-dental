const express = require('express');
const router = express.Router();


const { uploadAvatarMiddleware, handleFileSizeError } = require('../middlewares/uploadAvatar');
const { createDoctor } = require('../controllers/DoctorController');

router.post('/create', uploadAvatarMiddleware.single('doctorAvatar'), handleFileSizeError, createDoctor);

module.exports = router;