const { Sequelize, sequelize } = require("../config/database");

const Users = sequelize.define(
  "users",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fullName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    company: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    contactPerson: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    address: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    postalCode: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    city: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    country: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    vatId: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    taxNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    email: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    mobile: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    referral_code: {
      type: Sequelize.STRING(10),
      unique: true,
      allowNull: false,
    },
    website: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    username: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    idExpiryDate: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    iban: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    bic: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    bankName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    bankAddress: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    role: {
      type: Sequelize.ENUM("SUPER_ADMIN", "BROKER", "AFFILIATE"),
      allowNull: false,
    },
    business_license: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    passport_front: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    passport_back: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Users;
