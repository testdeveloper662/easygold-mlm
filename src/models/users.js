const { Sequelize, sequelize } = require("../config/database");

const Users = sequelize.define(
  "users",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    first_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    last_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    email: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    role: {
      type: Sequelize.ENUM("SUPER_ADMIN", "BROKER", "AFFILIATE"),
      allowNull: false,
    },
    otp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    otp_expires: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Users;
