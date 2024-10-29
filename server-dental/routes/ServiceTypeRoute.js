const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
    getAllServiceTypes,
    createServiceType,
} = require("../controllers/ServiceTypeController");

router.get(
    "/all",
    authMiddleware(["admin", "doctor", "employee"]),
    getAllServiceTypes
);

router.post("/create", authMiddleware(["admin"]), createServiceType);

module.exports = router;
