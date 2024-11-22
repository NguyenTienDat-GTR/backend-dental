const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {getAllCustomers} = require("../controllers/CustomerController");

router.get("/getAll", authMiddleware(["admin","employee"]), getAllCustomers);

module.exports = router;