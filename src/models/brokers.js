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
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: Users,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    parent_id: {
      type: Sequelize.INTEGER,
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
      allowNull: false,
    },
    referred_by_code: {
      type: Sequelize.STRING(10),
      allowNull: true,
    },
    children_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Relations
Brokers.belongsTo(Users, { foreignKey: "user_id", as: "user" });
Brokers.belongsTo(Brokers, { foreignKey: "parent_id", as: "parent" });
Brokers.hasMany(Brokers, { foreignKey: "parent_id", as: "children" });

module.exports = Brokers;
