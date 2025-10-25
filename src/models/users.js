const { Sequelize, sequelize } = require("../config/database");

const Users = sequelize.define(
  "6LWUP_users", // Table name
  {
    ID: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    user_login: {
      type: Sequelize.STRING(60),
      allowNull: false,
      defaultValue: "",
    },
    user_pass: {
      type: Sequelize.STRING(255),
      allowNull: false,
      defaultValue: "",
    },
    user_nicename: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: "",
    },
    user_email: {
      type: Sequelize.STRING(100),
      allowNull: false,
      defaultValue: "",
    },
    user_url: {
      type: Sequelize.STRING(100),
      allowNull: false,
      defaultValue: "",
    },
    user_registered: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("'0000-00-00 00:00:00'"),
    },
    user_activation_key: {
      type: Sequelize.STRING(255),
      allowNull: false,
      defaultValue: "",
    },
    user_status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    display_name: {
      type: Sequelize.STRING(250),
      allowNull: false,
      defaultValue: "",
    },
    user_type: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "0-user, 1-admin",
    },
    wallet_amount: {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    wallet_payment: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 = user wallet payment off, 1 = on",
    },
    logo: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    menulogo: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    commission_percentage: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    api_commission_percentage: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    shipping_costs_setting: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "0=false, 1=true",
    },
    temp_pass: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    mystorekey: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    self_service: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0=self_service off, 1=on",
    },
    landing_page: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0=landing_page off, 1=on",
    },
  },
  {
    tableName: "6LWUP_users",
    timestamps: false, // WordPress tables typically don’t use createdAt/updatedAt
  }
);

module.exports = Users;
