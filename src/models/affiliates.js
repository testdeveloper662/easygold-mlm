const { Sequelize, sequelize } = require("../config/database");
const Users = require("./users");

const Affiliates = sequelize.define(
  "affiliates",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    logo: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    profile_image: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "6LWUP_users",
        key: "ID",
      },
      onDelete: "CASCADE",
    },
    parent_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: "brokers",
        key: "id",
      },
      onDelete: "SET NULL",
    },
    referral_code: {
      type: Sequelize.STRING(10),
      unique: true,
      allowNull: true,
    },
    referred_by_code: {
      type: Sequelize.STRING(10),
      allowNull: true,
    },
    person_typ: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    land: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    steuer_id: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    children_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    total_commission_amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: "Total commission amount accumulated by affiliate",
    },
    untermaklervertrag_doc: {
      type: Sequelize.TEXT("long"),
      allowNull: true
    },
    maklervertrag_doc: {
      type: Sequelize.TEXT("long"),
      allowNull: true
    },
    inc_partnership_doc: {
      type: Sequelize.TEXT("long"),
      allowNull: true
    },
    llc_partnership_doc: {
      type: Sequelize.TEXT("long"),
      allowNull: true
    },
    goldflex_partnership_doc: {
      type: Sequelize.TEXT("long"),
      allowNull: true
    },
    hartmann_benz_gmbh_doc: {
      type: Sequelize.TEXT("long"),
      allowNull: true
    },
    binding_loi_doc: {
      type: Sequelize.TEXT("long"),
      allowNull: true
    },
    partner_tax_billing_doc: {
      type: Sequelize.TEXT("long"),
      allowNull: true
    },
    uk_company_sales_platform_doc: {
      type: Sequelize.TEXT("long"),
      allowNull: true
    },
    ncnda_doc: {
      type: Sequelize.TEXT("long"),
      allowNull: true
    }
  },
  {
    timestamps: true,
    tableName: "affiliates",
  }
);

Affiliates.belongsTo(Users, { foreignKey: "user_id", as: "user" });

module.exports = Affiliates;
