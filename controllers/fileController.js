const File = require("../models/file");
const { uploadToS3, deleteFromS3 } = require("../services/s3Service");
const { v4: uuidv4 } = require("uuid");
const { logger } = require("../middlewares/logger");

const uploadFile = async (req, res) => {
  try {
    logger.info("File upload initiated", {
      originalName: req?.file?.originalname,
      size: req?.file?.size,
    });

    if (!req.file) {
      logger.warn("File upload attempted with no file");
      return res.status(400).json({ message: "No file uploaded" });
    }

    const key = `${uuidv4()}-${req.file.originalname}`;
    await uploadToS3(req.file, key);

    const file = await File.create({
      file_name: req.file.originalname,
      s3_object_key: key,
      file_size: req.file.size,
      file_type: req.file.mimetype,
    });

    logger.info("File upload completed successfully", {
      fileId: file.file_id,
      fileName: file.file_name,
    });

    res.status(201).json({
      file_name: file.file_name,
      id: file.file_id,
      url: `${process.env.S3_BUCKET}/${file.file_id}/${file.file_name}`,
      upload_date: file.created_date,
    });
  } catch (error) {
    logger.error("File upload failed", {
      error: error.message,
      stack: error.stack,
      originalName: req?.file?.originalname,
    });
    res.status(500).json({ message: error.message });
  }
};

const getFile = async (req, res) => {
  try {
    logger.info("File retrieval initiated", {
      fileId: req.params.id,
    });

    const file = await File.findByPk(req.params.id);
    if (!file) {
      logger.warn("File retrieval attempted for non-existent file", {
        fileId: req.params.id,
      });
      return res.status(404).json({ message: "File not found" });
    }

    logger.info("File retrieval completed successfully", {
      fileId: file.file_id,
      fileName: file.file_name,
    });

    res.json({
      file_name: file.file_name,
      id: file.file_id,
      url: `${process.env.S3_BUCKET}/${file.file_id}/${file.file_name}`,
      upload_date: file.created_date,
    });
  } catch (error) {
    logger.error("File retrieval failed", {
      error: error.message,
      stack: error.stack,
      fileId: req.params.id,
    });
    res.status(500).json({ message: error.message });
  }
};

const deleteFile = async (req, res) => {
  try {
    logger.info("File deletion initiated", {
      fileId: req.params.id,
    });

    const file = await File.findByPk(req.params.id);
    if (!file) {
      logger.warn("File deletion attempted for non-existent file", {
        fileId: req.params.id,
      });
      return res.status(404).json({ message: "File not found" });
    }

    await deleteFromS3(file.s3_object_key);
    await file.destroy();

    logger.info("File deletion completed successfully", {
      fileId: file.file_id,
      fileName: file.file_name,
    });

    res.status(204).send();
  } catch (error) {
    logger.error("File deletion failed", {
      error: error.message,
      stack: error.stack,
      fileId: req.params.id,
    });
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadFile,
  getFile,
  deleteFile,
};
