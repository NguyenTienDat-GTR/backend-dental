const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { createService, getServiceById, getAllServices, deleteService } = require("../controllers/ServiceController");
const { uploadAvatarMiddleware, handleFileSizeError } = require("../middlewares/uploadAvatar");

router.post("/create", authMiddleware(["admin"]), uploadAvatarMiddleware("service").array("serviceImage", 5), handleFileSizeError, createService);
router.get("/getById/:id", getServiceById);
router.get("/getAll", getAllServices);
router.delete("/delete/:id", authMiddleware(["admin"]), deleteService);
module.exports = router;