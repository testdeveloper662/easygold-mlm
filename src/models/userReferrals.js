const { Sequelize, sequelize } = require("../config/database");
const Users = require("./users");

const UserReferrals = sequelize.define(
  "user_referrals",
  {
    id: {
      type: Sequelize.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true,
      references: {
        model: "6LWUP_users",
        key: "ID",
      },
      onDelete: "CASCADE",
    },
    referral_code: {
      type: Sequelize.STRING(20),
      unique: true,
      allowNull: true,
    },
    referred_by_code: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    parent_user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: "6LWUP_users",
        key: "ID",
      },
      onDelete: "SET NULL",
    },
    children_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    tableName: "user_referrals",
    timestamps: true,
  }
);

module.exports = UserReferrals;
