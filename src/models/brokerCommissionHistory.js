const { Sequelize, sequelize } = require("../config/database");

const BrokerCommissionHistory = sequelize.define(
  "broker_commission_histories",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    broker_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
    },
    order_id: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    order_type: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    order_amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    profit_amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    commission_percent: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    commission_amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    tree: {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: "Broker hierarchy, e.g. 1->2->3",
    },
    is_seller: {
      type: Sequelize.BOOLEAN,
      default: false,
    },
    is_payment_done: {
      type: Sequelize.BOOLEAN,
      default: false,
    },
    is_payment_declined: {
      type: Sequelize.BOOLEAN,
      default: false,
    },
    selected_payment_method: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: "1 - bank, 2 - crypto, 3-cash, 4-card, 5-FLIZPay",
    },
    choose_payment_option: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: "1 - option-1, 2 - option-2, 3 - option-3, 4 - option-4",
    },
    target_customer_log_id: {
      type: Sequelize.INTEGER,
      allowNull: true, // or false if required
    },
    is_send_bonus: {
      type: Sequelize.BOOLEAN,
      default: false,
    },
    is_deleted: {
      type: Sequelize.BOOLEAN,
      default: false,
    },
    commission_type: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    product_type: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: "product",
      comment: "product, diamond or gemstone",
    },
    source: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: "External origin of this row, e.g. 'kontor'. Null for commissions from our own order flow.",
    },
    kontor_acknowledged_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Set when Kontor confirms receipt of this row's booking reference via POST /acknowledgements.",
    },
    kontor_entry_id: {
      type: Sequelize.STRING(64),
      allowNull: true,
      unique: true,
      comment: "Kontor's own transaction ID (a ULID) — referenced by corrects_entry_id on correction pushes.",
    },
    occurred_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "When the event actually happened on Kontor's side, vs createdAt (when we processed it).",
    },
    kontor_mode: {
      type: Sequelize.STRING(10),
      allowNull: true,
      comment: "'live' or 'test', as sent by Kontor.",
    },
    kontor_idempotency_key: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: "Kontor's own idempotency_key (arbitrary string, e.g. 'order_line:4711:paid'). Dedicated column because order_id is a legacy int(11) that can't hold it. Shared across every level-row of one booking, so not unique-constrained.",
    },
  },
  {
    timestamps: true,
    tableName: "broker_commission_histories",
  }
);

module.exports = BrokerCommissionHistory;
