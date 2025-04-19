const healthCheckRoutes = require("./healthz-router");
const fileRoutes = require("./fileRoutes");

const initializeRoutes = async (app) => {
  app.use("/healthz", healthCheckRoutes);
  app.use("/v2/file", fileRoutes);
};

module.exports = {
  initializeRoutes,
};
