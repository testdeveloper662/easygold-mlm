const { Sequelize, sequelize } = require("../config/database");

const GoldPurchaseOrder = sequelize.define(
  "6lwup_gold_purchase",
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
    tracking_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    first_name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    last_name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    phone: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    address: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    zip_code: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    city: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    country: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    account_holder: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    IBAN: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    BIC: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    Bank: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    location: {
      type: Sequelize.STRING(150),
      allowNull: false,
    },
    date: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    signature: {
      type: Sequelize.STRING(1000),
      allowNull: false,
    },
    form_type: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    form_type: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    categories: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    Sum_insured: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    desired_pickup_date: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    offer_send: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    offer_price_1: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    offer_price_2: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    confirmed_price: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    post_senden: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0=not send email 1=send email",
    },
    confirm_email: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0=not send email 1=send email",
    },
    b2b_email_send: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0=not send email 1=send email b2b",
    },
    status_1: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 0,
      comment: "	confirmed b2c or rejected",
    },
    status_2: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 0,
      comment: "	confirmed b2c or rejected",
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
    tableName: "6lwup_gold_purchase",
    timestamps: false,
  }
);

module.exports = GoldPurchaseOrder;
