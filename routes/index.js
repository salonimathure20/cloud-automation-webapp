const { router } = require("./healthz-router");

const initializeRoutes = async (app) => {
  app.use("/healthz", router);
};

module.exports = { initializeRoutes };
