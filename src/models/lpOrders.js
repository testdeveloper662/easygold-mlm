const { Sequelize, sequelize } = require("../config/database");

const LpOrder = sequelize.define(
  "6lwup_lp_order",
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
    trackingnumber: {
      type: Sequelize.STRING(12),
      allowNull: false,
    },
    tracking_link: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    action_status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 - all steps empty 1 - Tracking Number",
    },
    payment_confirmed: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 - not confirmed, 1 - confirmed",
    },
    send_email_c2c: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 - not sent, 1 - sent",
    },
    api_action_status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 - all steps empty 1 - Payment confirmed 2 - Tracking Number",
    },
    api_payment_confirmed: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 - not confirmed, 1 - confirmed",
    },
    reminder_emails_status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0=none,1=green,2=orange,3=red",
    },
    color_status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0=red,1=green",
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
    deleted_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "6lwup_lp_order",
    timestamps: false,
  }
);

module.exports = LpOrder;
