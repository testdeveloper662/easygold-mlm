const { Sequelize, sequelize } = require("../config/database");

const LpOrderShippingOption = sequelize.define(
  "6lwup_lp_order_shipping_option",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    meta_key: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    meta_value: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    lp_order_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  },
  {
    tableName: "6lwup_lp_order_shipping_option",
    timestamps: false,
  }
);

module.exports = LpOrderShippingOption;
