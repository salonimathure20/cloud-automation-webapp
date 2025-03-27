const { HealthCheck } = require("../models");
const { logger } = require("../middlewares/logger");
const { recordDbMetric } = require("./metricsService");

const healthzService = async () => {
  const start = Date.now();
  try {
    logger.info("Creating health check record");

    await HealthCheck.create({
      datetime: new Date().toISOString(),
    });

    const duration = Date.now() - start;
    await recordDbMetric("healthz_insert", duration);

    logger.info("Health check record created successfully");
  } catch (error) {
    logger.error("Failed to create health check record", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = { healthzService };
