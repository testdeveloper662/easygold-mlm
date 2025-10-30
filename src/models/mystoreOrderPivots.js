const { Sequelize, sequelize } = require("../config/database");

const MyStoreOrderPivot = sequelize.define(
  "6lwup_my_store_order_pivot",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    order_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    product_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    price: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    b2b_price: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    old_price: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    old_b2b_price: {
      type: Sequelize.FLOAT,
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
    tableName: "6lwup_my_store_order_pivot",
    timestamps: false,
  }
);

module.exports = MyStoreOrderPivot;
