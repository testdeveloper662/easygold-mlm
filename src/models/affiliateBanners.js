const { Sequelize, sequelize } = require("../config/database");

const AffiliateBanners = sequelize.define(
  "affiliate_banners",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    broker_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "brokers",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    backgroundImage: {
      type: Sequelize.TEXT("long"),
      allowNull: true,
    },
    url: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    product_selected: {
      type: Sequelize.ENUM("Landingpage", "easygold Token", "Primeinvest", "Custom"),
      allowNull: true,
    },
    qrPosition: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    qrSize: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  },
  {
    tableName: "affiliate_banners",
    timestamps: true,
    indexes: [
      {
        fields: ["broker_id"],
      },
      {
        fields: ["url"],
      },
      {
        fields: ["product_selected"],
      },
    ],
  }
);

module.exports = AffiliateBanners;
