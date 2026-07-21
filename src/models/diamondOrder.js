const { Sequelize, sequelize } = require("../config/database");

const DiamondOrder = sequelize.define(
  "6lwup_diamond_order",
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
    order_type: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 - landing page order, 1 - self service, 2 - my store",
    },
    delivery_types: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 - Pick Up In Store, 1 - Home Delivery",
    },
    selected_payment_method: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: "1 = bank, 2 = crypto",
    },
    payment_intents_id: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    trackingnumber: {
      type: Sequelize.STRING(12),
      allowNull: true,
    },
    tracking_link: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    action_status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 - all steps empty, 1 - Tracking Number",
    },
    payment_confirmed: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 - payment not confirmed, 1 - payment confirmed",
    },
    send_email_c2c: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 - not send email, 1 - send email",
    },
    api_action_status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 - all steps empty, 1 - Payment confirmed, 2 - Tracking Number",
    },
    api_payment_confirmed: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 - payment not confirmed, 1 - payment confirmed",
    },
    reminder_emails_status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 = none, 1 = green, 2 = orange, 3 = red",
    },
    color_status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 - red, 1 - green",
    },
    replacement_option: {
      type: Sequelize.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: "0 = Not Agree, 1 = Agree",
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
    tableName: "6lwup_diamond_order",
    timestamps: false,
  }
);

module.exports = DiamondOrder;
