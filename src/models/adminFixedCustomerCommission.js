const { Sequelize, sequelize } = require("../config/database");

const AdminFixedCustomerCommission = sequelize.define(
  "admin_fixed_customer_commission",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    service_type: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "easygold_token",
    },
    level: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    percentage: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "admin_fixed_customer_commission",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["level", "service_type"],
        name: "unique_level_service_type_customer",
      },
    ],
  }
);

module.exports = AdminFixedCustomerCommission;
