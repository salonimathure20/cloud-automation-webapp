/**
 * Public File API Routes
 * These routes are intentionally public and do not require authentication.
 */
const express = require("express");
const multer = require("multer");
const router = express.Router();
const fileController = require("../controllers/fileController");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * @public
 * POST /v1/file - Upload a new file
 * No authentication required
 */
router.post("/", upload.single("file"), fileController.uploadFile);

/**
 * @public
 * GET /v1/file/:id - Get file metadata by ID
 * No authentication required
 */
router.get("/:id", fileController.getFile);

/**
 * @public
 * DELETE /v1/file/:id - Delete a file by ID
 * No authentication required
 */
router.delete("/:id", fileController.deleteFile);

module.exports = router;
