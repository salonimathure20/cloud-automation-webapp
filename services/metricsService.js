const StatsD = require("hot-shots");
const SDC = require("statsd-client");
const {
  CloudWatchClient,
  PutMetricDataCommand,
} = require("@aws-sdk/client-cloudwatch");
const { logger } = require("../middlewares/logger");

const client = new StatsD({
  host: process.env.STATSD_HOST || "localhost",
  port: process.env.STATSD_PORT || 8125,
  prefix: "webapp.",
  errorHandler: (error) => {
    console.error("StatsD error:", error);
  },
});

const cloudWatchClient = new CloudWatchClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const sdc = new SDC({
  host: "localhost",
  port: 8125,
  prefix: "webapp",
});

const metricsService = {
  incrementApiCall: (path) => {
    client.increment(`api.calls${path.replace(/\//g, ".")}`);
  },

  timing: (metric, timeInMs) => {
    client.timing(metric, timeInMs);
  },

  measureApiTiming: async (path, callback) => {
    const start = Date.now();
    try {
      return await callback();
    } finally {
      const duration = Date.now() - start;
      client.timing(`api.timing${path.replace(/\//g, ".")}`, duration);
    }
  },

  measureDbTiming: async (operation, callback) => {
    const start = Date.now();
    try {
      return await callback();
    } finally {
      const duration = Date.now() - start;
      client.timing(`db.timing.${operation}`, duration);
    }
  },

  measureS3Timing: async (operation, callback) => {
    const start = Date.now();
    try {
      return await callback();
    } finally {
      const duration = Date.now() - start;
      client.timing(`s3.timing.${operation}`, duration);
    }
  },
};

const recordApiMetric = async (path, method, duration, status) => {
  const metricName = `${method}_${path}`.replace(/[/]/g, "_");

  // StatsD metrics
  sdc.timing(metricName, duration);
  sdc.increment(`${metricName}_count`);

  // CloudWatch metrics
  try {
    const metrics = [
      {
        MetricName: `${metricName}_Duration`,
        Value: Number(duration),
        Unit: "Milliseconds",
      },
      {
        MetricName: `${metricName}_Count`,
        Value: 1,
        Unit: "Count",
      },
      {
        MetricName: `${metricName}_${status}`,
        Value: 1,
        Unit: "Count",
      },
    ];

    await publishMetrics("WebApp/API", metrics);
    console.log(`Published API metrics: ${JSON.stringify(metrics)}`); // Debug log
  } catch (error) {
    logger.error("Failed to publish API metrics", {
      error,
      path,
      method,
      duration,
      status,
    });
  }
};

const recordDbMetric = async (operation, duration) => {
  // StatsD metrics
  sdc.timing(`db_${operation}`, duration);

  // CloudWatch metrics
  try {
    const metrics = [
      {
        MetricName: `${operation}_Duration`,
        Value: Number(duration),
        Unit: "Milliseconds",
      },
      {
        MetricName: `${operation}_Count`,
        Value: 1,
        Unit: "Count",
      },
    ];

    await publishMetrics("WebApp/Database", metrics);
  } catch (error) {
    logger.error("Failed to publish DB metrics", {
      error,
      operation,
      duration,
    });
  }
};

const recordS3Metric = async (operation, duration) => {
  // StatsD metrics
  sdc.timing(`s3_${operation}`, duration);

  // CloudWatch metrics
  try {
    const metrics = [
      {
        MetricName: `${operation}_Duration`,
        Value: Number(duration),
        Unit: "Milliseconds",
      },
      {
        MetricName: `${operation}_Count`,
        Value: 1,
        Unit: "Count",
      },
    ];

    await publishMetrics("WebApp/S3", metrics);
  } catch (error) {
    logger.error("Failed to publish S3 metrics", {
      error,
      operation,
      duration,
    });
  }
};

const publishMetrics = async (namespace, metrics) => {
  try {
    const command = new PutMetricDataCommand({
      Namespace: namespace,
      MetricData: metrics.map((metric) => ({
        ...metric,
        Timestamp: new Date(),
        Dimensions: [
          {
            Name: "Environment",
            Value: process.env.NODE_ENV || "development",
          },
        ],
      })),
    });

    const response = await cloudWatchClient.send(command);
    console.log(`CloudWatch response: ${JSON.stringify(response)}`); // Debug log
  } catch (error) {
    console.error("Error publishing metrics:", error);
    throw error; // Propagate error for handling
  }
};

module.exports = {
  metricsService,
  recordApiMetric,
  recordDbMetric,
  recordS3Metric,
  publishMetrics,
};
