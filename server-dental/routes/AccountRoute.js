const express = require('express');
const router = express.Router();

const { createAccount } = require('../controllers/AccountController');

router.post('/create', createAccount);

module.exports = router;