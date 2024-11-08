const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { createService, getServiceById } = require("../controllers/ServiceController");
const { uploadAvatarMiddleware, handleFileSizeError } = require("../middlewares/uploadAvatar");

router.post("/create", authMiddleware(["admin"]), uploadAvatarMiddleware("service").array("serviceImage", 5), handleFileSizeError, createService);
router.get("/getById/:id", getServiceById);
module.exports = router;