const File = require("../models/file");
const { uploadToS3, deleteFromS3 } = require("../services/s3Service");
const { v4: uuidv4 } = require("uuid");

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
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

    res.status(201).json({
      file_name: file.file_name,
      id: file.file_id,
      url: `${process.env.S3_BUCKET}/${file.file_id}/${file.file_name}`,
      upload_date: file.created_date,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFile = async (req, res) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    res.json({
      file_name: file.file_name,
      id: file.file_id,
      url: `${process.env.S3_BUCKET}/${file.file_id}/${file.file_name}`,
      upload_date: file.created_date,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteFile = async (req, res) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    await deleteFromS3(file.s3_object_key);
    await file.destroy();

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadFile,
  getFile,
  deleteFile,
};
