const express = require("express");
const router = express.Router();

const {
    uploadAvatarMiddleware,
    handleFileSizeError,
} = require("../middlewares/uploadAvatar");
const {
    createEmployee,
    getAllEmployee,
    updateEmployee,
} = require("../controllers/EmployeeController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post(
    "/create",
    authMiddleware(["admin"]),
    uploadAvatarMiddleware.single("employeeAvatar"),
    handleFileSizeError,
    createEmployee
);

router.get(
    "/all",
    authMiddleware(["admin", "doctor", "employee"]),
    getAllEmployee
);

router.put(
    "/update/:id",
    authMiddleware(["admin"]),
    uploadAvatarMiddleware.single("employeeAvatar"),
    handleFileSizeError,
    updateEmployee
);

module.exports = router;
