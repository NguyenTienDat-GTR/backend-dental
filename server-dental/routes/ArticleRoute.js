const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { uploadAvatarMiddleware, handleFileSizeError } = require("../middlewares/uploadAvatar");
const { createArticle } = require("../controllers/ArticleController")

router.post("/create", authMiddleware(["admin"]), uploadAvatarMiddleware("Article").array("articleImage", 10), handleFileSizeError, createArticle);

module.exports = router