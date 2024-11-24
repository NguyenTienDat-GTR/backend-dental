const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
    getAllServiceTypes,
    createServiceType,
    deleteServiceType,
    updateServiceType
} = require("../controllers/ServiceTypeController");

router.get("/all", getAllServiceTypes);

router.post("/create", authMiddleware(["admin"]), createServiceType);

router.delete("/delete/:id", authMiddleware(["admin"]), deleteServiceType)

router.put("/update/:id" , authMiddleware(["admin"]) , updateServiceType);
module.exports = router;

