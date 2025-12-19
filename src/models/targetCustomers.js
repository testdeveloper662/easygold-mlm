const { Sequelize, sequelize } = require("../config/database");

const TargetCustomers = sequelize.define(
  "target_customers",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    /** 🔗 Broker who owns this customer */
    broker_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "brokers",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    /** 🔗 Customer → Customer referral */
    parent_customer_id: {
      type: Sequelize.INTEGER,   // ❗ NO UNSIGNED
      allowNull: true,
      comment: "Referring customer id",
    },

    /** 🔑 Referral Codes */
    referral_code: {
      type: Sequelize.STRING(12),
      unique: true,
      allowNull: true,
    },

    referred_by_code: {
      type: Sequelize.STRING(12),
      allowNull: true,
    },

    customer_name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },

    customer_email: {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
    },

    interest_in: {
      type: Sequelize.ENUM(
        "Landingpage",
        "easygold Token",
        "Primeinvest"
      ),
      allowNull: true,
    },

    /** 🎁 Referral Reward System */
    children_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      comment: "How many customers this customer referred",
    },

    bonus_points: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      comment: "Bonus points earned from referrals",
    },
    status: {
      type: Sequelize.ENUM("INVITED", "REGISTERED"),
      defaultValue: "INVITED",
    },
  },
  {
    tableName: "target_customers",
    timestamps: true,
    indexes: [
      { fields: ["broker_id"] },
      { fields: ["parent_customer_id"] },
      { fields: ["referral_code"] },
      { fields: ["customer_email"] },
    ],
  }
);

/** 🔗 Self-referencing associations */
TargetCustomers.belongsTo(TargetCustomers, {
  foreignKey: "parent_customer_id",
  as: "parent",
});

TargetCustomers.hasMany(TargetCustomers, {
  foreignKey: "parent_customer_id",
  as: "children",
});

module.exports = TargetCustomers;
