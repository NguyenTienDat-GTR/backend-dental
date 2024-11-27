const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { handleFileSizeError } = require("../middlewares/uploadAvatar");
const { uploadImageArticle } = require("../middlewares/uploadImageArticle");
const { createArticle, updateArticle, deleteArticle, getArticleByServiceId } = require("../controllers/ArticleController")

router.post("/create", authMiddleware(["admin"]), uploadImageArticle("Article"), handleFileSizeError, createArticle);

// Cập nhật bài viết
router.put("/update/:id", authMiddleware(["admin"]), updateArticle);

// Xóa bài viết
router.delete("/delete/:id", authMiddleware(["admin"]), deleteArticle);

// Lấy bài viết theo serviceId
// router.get("/getByServiceId/:serviceId", getArticleByServiceId); 
module.exports = router
