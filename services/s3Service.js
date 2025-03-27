const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { recordS3Metric } = require("./metricsService");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

const uploadToS3 = async (file, key) => {
  const start = Date.now();
  logger.info(`Starting S3 upload for key: ${key}`, {
    operation: "upload",
    key: key,
    fileSize: file.size,
    mimeType: file.mimetype,
  });

  try {
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
    const duration = Date.now() - start;
    await recordS3Metric("upload", duration);
    logger.info(`Successfully uploaded to S3: ${key}`, {
      operation: "upload",
      duration: duration,
      key: key,
    });
    return `s3://${process.env.S3_BUCKET}/${key}`;
  } catch (error) {
    logger.error(`S3 upload failed for key: ${key}`, {
      operation: "upload",
      error: error.message,
      stack: error.stack,
      key: key,
    });
    throw error;
  }
};

const deleteFromS3 = async (key) => {
  const start = Date.now();
  logger.info(`Starting S3 delete for key: ${key}`, {
    operation: "delete",
    key: key,
  });

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    const duration = Date.now() - start;
    await recordS3Metric("delete", duration);
    logger.info(`Successfully deleted from S3: ${key}`, {
      operation: "delete",
      duration: duration,
      key: key,
    });
  } catch (error) {
    logger.error(`S3 delete failed for key: ${key}`, {
      operation: "delete",
      error: error.message,
      stack: error.stack,
      key: key,
    });
    throw error;
  }
};

const getSignedUrlFromS3 = async (key) => {
  const start = Date.now();
  logger.info(`Starting S3 getSignedUrl for key: ${key}`, {
    operation: "getSignedUrl",
    key: key,
  });

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });
    const duration = Date.now() - start;
    await recordS3Metric("getSignedUrl", duration);
    logger.info(`Successfully generated signed URL for S3: ${key}`, {
      operation: "getSignedUrl",
      duration: duration,
      key: key,
    });
    return signedUrl;
  } catch (error) {
    logger.error(`S3 getSignedUrl failed for key: ${key}`, {
      operation: "getSignedUrl",
      error: error.message,
      stack: error.stack,
      key: key,
    });
    throw error;
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  getSignedUrlFromS3,
};
