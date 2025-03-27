const { recordApiMetric } = require("../services/metricsService");
const { logger } = require("./logger");

const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const path = req.baseUrl + req.path;

    logger.info(`API Request: ${req.method} ${path}`, {
      method: req.method,
      path: path,
      duration: duration,
      status: res.statusCode,
      userAgent: req.get("user-agent"),
      ip: req.ip,
    });

    recordApiMetric(path, req.method, duration, res.statusCode);
  });

  next();
};

module.exports = metricsMiddleware;
