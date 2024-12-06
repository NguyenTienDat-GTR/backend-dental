const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {getAllCustomers, getCustomerByID, updateCustomer} = require("../controllers/CustomerController");

router.get("/getAll", authMiddleware(["admin", "employee", "doctor"]), getAllCustomers);
router.get("/getById/:id", authMiddleware(["admin", "employee", "doctor"]), getCustomerByID);
router.put("/update/:id", authMiddleware(["admin", "employee"]), updateCustomer)

module.exports = router;