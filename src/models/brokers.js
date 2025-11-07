const { Sequelize, sequelize } = require("../config/database");
const Users = require("./users");

const Brokers = sequelize.define(
  "brokers",
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
      type: Sequelize.BIGINT.UNSIGNED, // ✅ match 6LWUP_users.ID
      allowNull: false,
      references: {
        model: "6LWUP_users",
        key: "ID",
      },
      onDelete: "CASCADE",
    },
    parent_id: {
      type: Sequelize.INTEGER.UNSIGNED, // self reference (same as brokers.id)
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
    children_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    total_commission_amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: "Total commission amount accumulated by broker",
    },
  },
  {
    timestamps: true,
  }
);

Brokers.belongsTo(Users, { foreignKey: "user_id", as: "user" });
Brokers.belongsTo(Brokers, { foreignKey: "parent_id", as: "parent" });
Brokers.hasMany(Brokers, { foreignKey: "parent_id", as: "children" });

module.exports = Brokers;
