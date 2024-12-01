const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { handleFileSizeError } = require("../middlewares/uploadAvatar");
const { uploadImagePolicy } = require("../middlewares/uploadImagePolicy");
const { createPolicy, updatePolicy, deletePolicy, getAllPolicy, getPolicyById} = require("../controllers/PolicyController")

router.get("/getAll", getAllPolicy);

router.get("/getById/:id", getPolicyById);

router.post("/create", authMiddleware(["admin"]), uploadImagePolicy("Policy"), handleFileSizeError, createPolicy);

// Cập nhật bài viết
router.put("/update/:id", authMiddleware(["admin"]), updatePolicy);

// Xóa bài viết
router.delete("/delete/:id", authMiddleware(["admin"]), deletePolicy);


module.exports = router
