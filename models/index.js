const { sequelize } = require("../dbConn");
const HealthCheck = require("./healthCheck");

const initDB = async () => {
  await sequelize.sync({ alter: true });
  console.log("Database & tables synced!");
};

module.exports = { HealthCheck, initDB };
