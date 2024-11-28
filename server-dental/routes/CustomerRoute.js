const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {getAllCustomers, getCustomerByID} = require("../controllers/CustomerController");

router.get("/getAll", authMiddleware(["admin", "employee"]), getAllCustomers);
router.get("/getById/:id", authMiddleware(["admin", "employee", "doctor"]), getCustomerByID);

module.exports = router;