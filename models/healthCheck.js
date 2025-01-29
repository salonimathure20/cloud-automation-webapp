const { DataTypes } = require("sequelize");
const { sequelize } = require("../dbConn");

const HealthCheck = sequelize.define(
  "HealthCheck",
  {
    check_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    datetime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "health_checks",
    timestamps: false,
  }
);

module.exports = HealthCheck;
