const { Sequelize, sequelize } = require("../config/database");

const AdminFixedBrokerCommission = sequelize.define(
  "admin_fixed_broker_commission",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    level: {
      type: Sequelize.INTEGER,
      unique: true,
    },
    percentage: {
      type: Sequelize.INTEGER,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = AdminFixedBrokerCommission;
