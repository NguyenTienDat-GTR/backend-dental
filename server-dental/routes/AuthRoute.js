const express = require('express');
const router = express.Router();

const {Login, changePassword} = require('../controllers/AuthController');
const authMiddleware = require("../middlewares/authMiddleware");


router.post('/login', Login);

router.put('/change-password', authMiddleware(["admin", "doctor", "employee"]), changePassword);


module.exports = router;