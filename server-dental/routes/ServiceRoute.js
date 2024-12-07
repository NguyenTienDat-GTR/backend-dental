const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
    createService,
    getServiceById,
    getAllServices,
    deleteService,
    getTopServices,
    getJaw,
    getTooth,
    updateService
} = require("../controllers/ServiceController");
const {uploadAvatarMiddleware, handleFileSizeError} = require("../middlewares/uploadAvatar");

router.post("/create", authMiddleware(["admin"]), uploadAvatarMiddleware("service").array("serviceImage", 5), handleFileSizeError, createService);
router.get("/getById/:id", getServiceById);
router.get("/getAll", getAllServices);
router.delete("/delete/:id", authMiddleware(["admin"]), deleteService);
router.get("/topServices", authMiddleware(["admin", "employee","doctor"]), getTopServices);
router.get("/getTooth", getTooth);
router.get("/getJaw", getJaw);
router.put("/update/:id", authMiddleware(["admin"]), updateService);

module.exports = router;