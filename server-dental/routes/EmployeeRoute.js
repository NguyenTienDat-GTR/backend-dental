const express = require("express");
const router = express.Router();

const {
    uploadAvatarMiddleware,
    handleFileSizeError,
} = require("../middlewares/uploadAvatar");
const { createEmployee } = require("../controllers/EmployeeController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post(
    "/create",
    authMiddleware(["admin"]),
    uploadAvatarMiddleware.single("employeeAvatar"),
    handleFileSizeError,
    createEmployee
);

module.exports = router;
