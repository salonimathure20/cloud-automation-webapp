const winston = require("winston");
const WinstonCloudWatch = require("winston-cloudwatch");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "webapp" },
  transports: [
    new winston.transports.Console(),
    new WinstonCloudWatch({
      logGroupName: "webapp-logs",
      logStreamName: `${process.env.NODE_ENV || "development"}-${
        new Date().toISOString().split("T")[0]
      }`,
      awsRegion: "us-east-1",
      jsonMessage: true,
      messageFormatter: ({ level, message, ...meta }) => {
        return JSON.stringify({
          timestamp: new Date().toISOString(),
          level,
          message,
          environment: process.env.NODE_ENV || "development",
          ...meta,
        });
      },
    }),
  ],
});

// Add error handler for CloudWatch transport
logger.transports.forEach((transport) => {
  if (transport instanceof WinstonCloudWatch) {
    transport.on("error", (error) => {
      console.error("CloudWatch logging error:", error);
    });
  }
});

module.exports = { logger };
