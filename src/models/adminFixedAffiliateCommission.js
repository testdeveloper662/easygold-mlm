const { Sequelize, sequelize } = require("../config/database");

const AdminFixedAffiliateCommission = sequelize.define(
  "admin_fixed_affiliate_commission",
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
    tableName: "admin_fixed_affiliate_commission",
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

module.exports = AdminFixedAffiliateCommission;

