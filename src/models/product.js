const { Sequelize, sequelize } = require("../config/database");

const Product = sequelize.define(
  "6lwup_product",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    SKU: {
      type: Sequelize.STRING(20),
      allowNull: false,
    },
    price: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    product_categories: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    material: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    issuing_country: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    manufacturer: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    face_value: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    fine_weight: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    fineness: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    diameter: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    VAT: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    image: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    stock_status: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    categories_delete: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "false", // based on your description
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal(
        "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      ),
    },
  },
  {
    tableName: "6lwup_product",
    timestamps: false, // ✅ because created_at & updated_at are manually defined
  }
);

module.exports = Product;
