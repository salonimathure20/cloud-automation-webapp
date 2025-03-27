const File = require("../models/file");
const { uploadToS3, deleteFromS3 } = require("../services/s3Service");
const { v4: uuidv4 } = require("uuid");
const cloudWatchLogger = require("../middlewares/logger");

const uploadFile = async (req, res) => {
  const startTime = Date.now();
  try {
    cloudWatchLogger.info("File upload initiated", {
      fileName: req.file.originalname,
    });
    cloudWatchLogger.trackApiCall("upload_file");

    if (!req.file) {
      cloudWatchLogger.error("File upload failed: No file uploaded");
      return res.status(400).json({ message: "No file uploaded" });
    }

    const key = `${uuidv4()}-${req.file.originalname}`;
    await uploadToS3(req.file, key);

    const dbStartTime = Date.now();
    const file = await File.create({
      file_name: req.file.originalname,
      s3_object_key: key,
      file_size: req.file.size,
      file_type: req.file.mimetype,
    });
    cloudWatchLogger.measureDatabaseQueryTime("file_upload_log", dbStartTime);

    cloudWatchLogger.measureApiTime("file_upload", startTime);

    res.status(201).json({
      file_name: file.file_name,
      id: file.file_id,
      url: `${process.env.S3_BUCKET}/${file.file_id}/${file.file_name}`,
      upload_date: file.created_date,
    });
    cloudWatchLogger.info("Successfully uploaded file:", file.file_id);
  } catch (error) {
    cloudWatchLogger.error("File upload failed", error);
    res.status(500).json({ message: error.message });
  }
};

const getFile = async (req, res) => {
  const startTime = Date.now();
  try {
    cloudWatchLogger.info("File fetch initiated");
    cloudWatchLogger.trackApiCall("get_file");
    const dbStartTime = Date.now();
    const file = await File.findByPk(req.params.id);
    cloudWatchLogger.measureDatabaseQueryTime("file_fetch_db_log", dbStartTime);
    if (!file) {
      cloudWatchLogger.error("File fetch failed: File not found");
      return res.status(404).json({ message: "File not found" });
    }

    res.json({
      file_name: file.file_name,
      id: file.file_id,
      url: `${process.env.S3_BUCKET}/${file.file_id}/${file.file_name}`,
      upload_date: file.created_date,
    });
    cloudWatchLogger.measureApiTime("get_file", startTime);
    cloudWatchLogger.info("File fetch successful", file.file_id);
  } catch (error) {
    cloudWatchLogger.error("File fetch failed:", error);
    res.status(500).json({ message: error.message });
  }
};

const deleteFile = async (req, res) => {
  const startTime = Date.now();
  try {
    cloudWatchLogger.info("File deletion initiated");
    cloudWatchLogger.trackApiCall("delete_file");
    const file = await File.findByPk(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    await deleteFromS3(file.s3_object_key);
    await file.destroy();

    cloudWatchLogger.measureApiTime("delete_file", startTime);
    res.status(204).send();

    cloudWatchLogger.info("File deleted successfully", req.params.id);
  } catch (error) {
    cloudWatchLogger.error("File deletion failed:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadFile,
  getFile,
  deleteFile,
};
