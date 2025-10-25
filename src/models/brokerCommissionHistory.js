const { Sequelize, sequelize } = require("../config/database");

const BrokerCommissionHistory = sequelize.define(
  "broker_commission_histories",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    broker_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
    },
    order_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    commission_percent: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    commission_amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    tree: {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: "Broker hierarchy, e.g. 1->2->3",
    },
  },
  {
    timestamps: true,
    tableName: "broker_commission_histories",
  }
);

module.exports = BrokerCommissionHistory;
