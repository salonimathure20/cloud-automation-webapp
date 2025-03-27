const { HealthCheck } = require("../models");
const cloudWatchLogger = require("../middlewares/logger");

const healthzService = async () => {
  const dbStartTime = Date.now();
  await HealthCheck.create({
    datetime: new Date().toISOString(),
  });
  cloudWatchLogger.measureDatabaseQueryTime("healthz_db_log", dbStartTime);
};

module.exports = { healthzService };
