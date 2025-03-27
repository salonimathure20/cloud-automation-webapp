const winston = require("winston");
const {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  CreateLogStreamCommand,
} = require("@aws-sdk/client-cloudwatch-logs");
const {
  CloudWatchClient,
  PutMetricDataCommand,
} = require("@aws-sdk/client-cloudwatch");
const StatsD = require("hot-shots");

class CloudWatchMetricsLogger {
  constructor() {
    // Winston logger for application logs
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        // Log to console (for local development)
        new winston.transports.Console(),
      ],
    });

    // CloudWatch Logs client for manual log pushing
    this.cloudwatchLogsClient = new CloudWatchLogsClient({
      region: process.env.AWS_REGION || "us-east-1",
    });

    // StatsD client for custom metrics
    this.statsD = new StatsD({
      prefix: "webapp_",
      globalTags: { environment: process.env.NODE_ENV || "development" },
    });

    // CloudWatch client for custom metrics
    this.cloudwatchClient = new CloudWatchClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  // Log informational messages
  info(message, meta = {}) {
    this.logger.info(message, meta);
    this._pushToCloudWatch("info", message, meta);
  }

  // Log error messages
  error(message, error) {
    const errorMeta = {
      error: error?.message || error,
      stack: error?.stack || "",
    };
    this.logger.error(message, errorMeta);
    this._pushToCloudWatch("error", message, errorMeta);
  }

  // Internal method to push logs to CloudWatch
  async _pushToCloudWatch(level, message, meta) {
    const logGroup = `/webapp/application-logs`;
    const logStream = `logs-${level}-${new Date().toISOString().split("T")[0]}`;

    try {
      // Attempt to create log stream if it doesn't exist
      await this.cloudwatchLogsClient.send(
        new CreateLogStreamCommand({
          logGroupName: logGroup,
          logStreamName: logStream,
        })
      );
    } catch (err) {
      // Ignore if stream already exists
      if (err.name !== "ResourceAlreadyExistsException") {
        console.error("Error creating log stream:", err);
        return;
      }
    }

    try {
      // Push log event
      await this.cloudwatchLogsClient.send(
        new PutLogEventsCommand({
          logGroupName: logGroup,
          logStreamName: logStream,
          logEvents: [
            {
              message: JSON.stringify({
                level,
                message,
                meta,
                timestamp: new Date().toISOString(),
              }),
              timestamp: Date.now(),
            },
          ],
        })
      );
    } catch (err) {
      console.error("Error pushing log to CloudWatch:", err);
    }
  }

  // Track API call count
  async trackApiCall(apiName) {
    // StatsD metric
    this.statsD.increment(`api_calls.${apiName}`);

    // CloudWatch custom metric
    try {
      await this.cloudwatchClient.send(
        new PutMetricDataCommand({
          MetricData: [
            {
              MetricName: "APICallCount",
              Dimensions: [{ Name: "APIName", Value: apiName }],
              Unit: "Count",
              Value: 1,
            },
          ],
          Namespace: "WebAppMetrics",
        })
      );
    } catch (err) {
      console.error("Failed to put CloudWatch metric", err);
    }
  }

  // Measure API call time
  async measureApiTime(apiName, startTime) {
    const duration = Date.now() - startTime;

    // StatsD timer
    this.statsD.timing(`api_time.${apiName}`, duration);

    // CloudWatch custom metric
    try {
      await this.cloudwatchClient.send(
        new PutMetricDataCommand({
          MetricData: [
            {
              MetricName: "APICallDuration",
              Dimensions: [{ Name: "APIName", Value: apiName }],
              Unit: "Milliseconds",
              Value: duration,
            },
          ],
          Namespace: "WebAppMetrics",
        })
      );
    } catch (err) {
      console.error("Failed to put CloudWatch metric", err);
    }
  }

  // Measure database query time
  async measureDatabaseQueryTime(queryName, startTime) {
    const duration = Date.now() - startTime;

    // StatsD timer
    this.statsD.timing(`database_query_time.${queryName}`, duration);

    // CloudWatch custom metric
    try {
      await this.cloudwatchClient.send(
        new PutMetricDataCommand({
          MetricData: [
            {
              MetricName: "DatabaseQueryDuration",
              Dimensions: [{ Name: "QueryName", Value: queryName }],
              Unit: "Milliseconds",
              Value: duration,
            },
          ],
          Namespace: "WebAppMetrics",
        })
      );
    } catch (err) {
      console.error("Failed to put CloudWatch metric", err);
    }
  }

  // Measure S3 service call time
  async measureS3CallTime(operation, startTime) {
    const duration = Date.now() - startTime;

    // StatsD timer
    this.statsD.timing(`s3_call_time.${operation}`, duration);

    // CloudWatch custom metric
    try {
      await this.cloudwatchClient.send(
        new PutMetricDataCommand({
          MetricData: [
            {
              MetricName: "S3CallDuration",
              Dimensions: [{ Name: "Operation", Value: operation }],
              Unit: "Milliseconds",
              Value: duration,
            },
          ],
          Namespace: "WebAppMetrics",
        })
      );
    } catch (err) {
      console.error("Failed to put CloudWatch metric", err);
    }
  }
}

module.exports = new CloudWatchMetricsLogger();
