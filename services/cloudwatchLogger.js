const winston = require("winston");
const WinstonCloudWatch = require("winston-cloudwatch");

const cloudwatchLogger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new WinstonCloudWatch({
      logGroupName: process.env.CLOUDWATCH_GROUP_NAME || "WebApp-Logs",
      logStreamName: `${process.env.NODE_ENV}-${new Date().toISOString()}`,
      awsRegion: process.env.AWS_REGION || "us-east-1",
      messageFormatter: ({ level, message, ...meta }) => {
        return {
          timestamp: new Date().toISOString(),
          level,
          message,
          ...meta,
        };
      },
    }),
  ],
});

module.exports = { cloudwatchLogger };
