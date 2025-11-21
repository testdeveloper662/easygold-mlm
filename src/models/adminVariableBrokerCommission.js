const { Sequelize, sequelize } = require("../config/database");

const AdminVariableBrokerCommission = sequelize.define(
  "admin_variable_broker_commission",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    level: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    service_type: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "Landing page",
    },
    percentage: {
      type: Sequelize.INTEGER,
    },
  },
  {
    tableName: "admin_variable_broker_commission",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["level", "service_type"],
        name: "unique_level_service_type",
      },
    ],
  }
);

module.exports = AdminVariableBrokerCommission;

