const express = require('express');
const router = express.Router();

const { getAllRecords, createMedicalRecord, getMedicalRecordsByCustomerID } = require('../controllers/MedicalRecordController');
const authMiddleware = require("../middlewares/authMiddleware");

router.get('/all',authMiddleware(["admin"]), getAllRecords);
router.post('/create',authMiddleware(["admin", "doctor"]), createMedicalRecord);
router.get('/getByCustomerID/:customerID',authMiddleware(["admin", "doctor"]), getMedicalRecordsByCustomerID);

module.exports = router;