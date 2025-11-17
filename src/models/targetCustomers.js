const { Sequelize, sequelize } = require("../config/database");

const TargetCustomers = sequelize.define(
  "target_customers",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    broker_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "brokers",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    customer_name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    customer_email: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    interest_in: {
      type: Sequelize.ENUM("Landingpage", "easygold Token", "Primeinvest"),
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  },
  {
    tableName: "target_customers",
    timestamps: true,
    indexes: [
      {
        fields: ["broker_id"],
      },
      {
        fields: ["customer_email"],
      },
      {
        fields: ["interest_in"],
      },
    ],
  }
);

module.exports = TargetCustomers;
