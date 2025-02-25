const { logger } = require("../middlewares/logger");
const { healthzService } = require("../services/healthz-service");

const healthzController = async (req, res) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("X-Content-Type-Options", "nosniff");
  try {
    if (
      (req.body && Object.keys(req.body).length > 0) ||
      (req.query && Object.keys(req.query).length > 0)
    ) {
      res.status(400).send();
    }
    await healthzService();

    res.status(200).send();
  } catch (error) {
    logger.error("Health check insert failed:", error);

    res.status(503).send();
  }
};

const healthzAllController = (req, res) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("X-Content-Type-Options", "nosniff");
  res.status(405).send();
};

module.exports = { healthzController, healthzAllController };
