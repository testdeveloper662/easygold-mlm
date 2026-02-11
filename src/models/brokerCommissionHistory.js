const { Sequelize, sequelize } = require("../config/database");

const BrokerCommissionHistory = sequelize.define(
  "broker_commission_histories",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customer_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
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
    order_type: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    order_amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    profit_amount: {
      type: Sequelize.FLOAT,
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
    is_seller: {
      type: Sequelize.BOOLEAN,
      default: false,
    },
    is_payment_done: {
      type: Sequelize.BOOLEAN,
      default: false,
    },
    is_payment_declined: {
      type: Sequelize.BOOLEAN,
      default: false,
    },
    selected_payment_method: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: "1 - bank, 2 - crypto",
    },
    is_deleted: {
      type: Sequelize.BOOLEAN,
      default: false,
    }
  },
  {
    timestamps: true,
    tableName: "broker_commission_histories",
  }
);

module.exports = BrokerCommissionHistory;
