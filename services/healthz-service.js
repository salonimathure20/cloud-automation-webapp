const { HealthCheck } = require("../models");

const healthzService = async () => {
  await HealthCheck.create({
    datetime: new Date().toISOString(),
  });
};

module.exports = { healthzService };
