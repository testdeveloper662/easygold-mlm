const { Sequelize, sequelize } = require("../config/database");

const BrokerProductDeclaration = sequelize.define(
  "broker_product_declarations",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    broker_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
    },
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
    },
    product: {
      type: Sequelize.STRING(30),
      allowNull: false,
    },
    terms_and_conditions_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    text_version: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    confirmed_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    ip_address: {
      type: Sequelize.STRING(45),
      allowNull: true,
    },
  },
  {
    tableName: "broker_product_declarations",
    timestamps: true,
  }
);

module.exports = BrokerProductDeclaration;
