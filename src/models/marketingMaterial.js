const { Sequelize, sequelize } = require("../config/database");

const MarketingMaterial = sequelize.define(
  "marketing_materials",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM("image", "banner", "video", "pdf", "document", "qrcode", "landing_page"),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    category: {
      type: Sequelize.ENUM("easygold", "primeinvest", "goldflex", "all"),
      allowNull: false,
      defaultValue: "all",
    },
    asset_url: {
      type: Sequelize.TEXT("long"),
      allowNull: true,
    },
    youtube_url: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    width: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    height: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
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
    tableName: "marketing_materials",
    timestamps: true,
  }
);

module.exports = MarketingMaterial;
