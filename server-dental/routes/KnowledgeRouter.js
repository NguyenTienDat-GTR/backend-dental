const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { handleFileSizeError } = require("../middlewares/uploadAvatar");
const { uploadImageKnowledge } = require("../middlewares/uploadImangeKnowledge");
const { createKnowledge,getAllKnowledge,getKnowledgeById,
    deleteKnowledge,updateKnowledge} = require("../controllers/KnowledgeController")

router.get("/getAll", getAllKnowledge);

router.get("/getById/:id", getKnowledgeById);

router.post("/create", authMiddleware(["admin"]), uploadImageKnowledge("Knowledge"), handleFileSizeError, createKnowledge);

// Cập nhật bài viết
router.put("/update/:id", authMiddleware(["admin"]), updateKnowledge);

// Xóa bài viết
router.delete("/delete/:id", authMiddleware(["admin"]), deleteKnowledge);


module.exports = router
