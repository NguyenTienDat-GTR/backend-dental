const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { handleFileSizeError } = require("../middlewares/uploadAvatar");
const { uploadImageArticle } = require("../middlewares/uploadImageArticle");
const { createPolicy, updatePolicy, deletePolicy, getAllPolicy, getPolicyById} = require("../controllers/PolicyController")

router.get("/getAll", getAllPolicy);

router.get("/getById/:id", getPolicyById);

router.post("/create", authMiddleware(["admin"]), uploadImageArticle("Policy"), handleFileSizeError, createPolicy);

// Cập nhật bài viết
router.put("/update/:id", authMiddleware(["admin"]), uploadImageArticle("Policy"), handleFileSizeError, updatePolicy);

// Xóa bài viết
router.delete("/delete/:id", authMiddleware(["admin"]), deletePolicy);


module.exports = router