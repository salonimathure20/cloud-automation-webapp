const { sequelize } = require("../config/dbConn");
const { recordDbMetric } = require("../services/metricsService");
const HealthCheck = require("./healthCheck");

// Add query timing hook
sequelize.addHook("beforeQuery", (options) => {
  options.startTime = Date.now();
});

sequelize.addHook("afterQuery", (options) => {
  const duration = Date.now() - options.startTime;
  const operation = options.type || "unknown";
  recordDbMetric(operation, duration);
});

const initDB = async () => {
  await sequelize.sync({ alter: true });
  console.log("Database & tables synced!");
};

module.exports = { HealthCheck, initDB };
