const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { handleFileSizeError } = require("../middlewares/uploadAvatar");
const { uploadImageArticle } = require("../middlewares/uploadImageArticle");
const { createArticle } = require("../controllers/ArticleController")

router.post("/create", authMiddleware(["admin"]), uploadImageArticle("Article"), handleFileSizeError, createArticle);

module.exports = router