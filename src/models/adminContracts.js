const { Sequelize, sequelize } = require("../config/database");

const AdminContract = sequelize.define(
  "admin_contracts",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    english_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    german_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    english_template_text: {
      type: Sequelize.TEXT("long"), // CKEditor HTML content
      allowNull: true,
    },
    german_template_text: {
      type: Sequelize.TEXT("long"), // CKEditor HTML content
      allowNull: true,
    },
    english_pdf_file: {
      type: Sequelize.STRING, // store file path or URL
      allowNull: true,
    },
    german_pdf_file: {
      type: Sequelize.STRING, // store file path or URL
      allowNull: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    showonregister: {
      type: Sequelize.BOOLEAN,
      default: false,
    },
    document_key: {
      type: Sequelize.STRING, // store file path or URL
      allowNull: true,
    }
  },
  {
    tableName: "admin_contracts",
    timestamps: true,
  }
);

module.exports = AdminContract;