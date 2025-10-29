const { Sequelize, sequelize } = require("../config/database");

const MyStoreSettings = sequelize.define(
  "6lwup_mystore_settings",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "6LWUP_users",
        key: "ID",
      },
    },
    category: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    paymentOption: {
      type: Sequelize.STRING,
      allowNull: true,
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
    tableName: "6lwup_mystore_settings",
    timestamps: false,
  }
);

module.exports = MyStoreSettings;
