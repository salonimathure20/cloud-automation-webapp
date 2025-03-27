const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const cloudWatchLogger = require("../middlewares/logger");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

const uploadToS3 = async (file, key) => {
  const s3StartTime = Date.now();
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    Metadata: {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size.toString(),
    },
  });

  await s3Client.send(command);
  cloudWatchLogger.measureS3CallTime("upload", s3StartTime);
  return `s3://${process.env.S3_BUCKET}/${key}`;
};

const deleteFromS3 = async (key) => {
  const s3StartTime = Date.now();
  const command = new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
  cloudWatchLogger.measureS3CallTime("delete", s3StartTime);
};

const getSignedUrlFromS3 = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  getSignedUrlFromS3,
};
