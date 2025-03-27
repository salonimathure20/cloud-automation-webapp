const { healthzService } = require("../services/healthz-service");
const cloudWatchLogger = require("../middlewares/logger");

const healthzController = async (req, res) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("X-Content-Type-Options", "nosniff");
  try {
    const startTime = Date.now();
    cloudWatchLogger.info("Health check initiated");
    if (
      (req.body && Object.keys(req.body).length > 0) ||
      (req.query && Object.keys(req.query).length > 0)
    ) {
      cloudWatchLogger.error(
        "Bad Request: Request payload has body and query params"
      );
      res.status(400).send();
    }

    // Track API call
    cloudWatchLogger.trackApiCall("healthz");

    // Measure API time
    cloudWatchLogger.measureApiTime("healthz", startTime);
    await healthzService();

    res.status(200).send();
    cloudWatchLogger.info("Successfully added healthz record");
  } catch (error) {
    cloudWatchLogger.error("Service unavailable:", error);
    res.status(503).send();
  }
};

const healthzAllController = (req, res) => {
  const startTime = Date.now();

  cloudWatchLogger.info("Health check initiated");
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("X-Content-Type-Options", "nosniff");

  cloudWatchLogger.trackApiCall("healthz");

  // Measure API time
  cloudWatchLogger.measureApiTime("healthz", startTime);

  cloudWatchLogger.error("Request method not supported");
  res.status(405).send();
};

module.exports = { healthzController, healthzAllController };
