const { logger } = require("../middlewares/logger");
const { healthzService } = require("../services/healthz-service");
const { recordApiMetric } = require("../services/metricsService");

const healthzController = async (req, res) => {
  const start = Date.now();
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("X-Content-Type-Options", "nosniff");

  try {
    logger.info("Health check initiated", {
      method: req.method,
      path: "/healthz",
    });

    if (
      (req.body && Object.keys(req.body).length > 0) ||
      (req.query && Object.keys(req.query).length > 0)
    ) {
      logger.warn("Health check rejected - invalid request", {
        body: !!req.body,
        query: !!req.query,
      });
      res.status(400).send();
      return;
    }

    await healthzService();
    logger.info("Health check completed successfully");
    res.status(200).send();
  } catch (error) {
    logger.error("Health check failed", {
      error: error.message,
      stack: error.stack,
    });
    res.status(503).send();
  } finally {
    const duration = Date.now() - start;
    await recordApiMetric("/healthz", "GET", duration, res.statusCode);
  }
};

const healthzAllController = (req, res) => {
  const start = Date.now();
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("X-Content-Type-Options", "nosniff");

  logger.info("Invalid method health check request", {
    method: req.method,
    path: "/healthz",
  });

  res.status(405).send();

  const duration = Date.now() - start;
  recordApiMetric("/healthz", req.method, duration, 405);
};

module.exports = { healthzController, healthzAllController };
