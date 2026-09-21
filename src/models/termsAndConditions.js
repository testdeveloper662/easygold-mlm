const { Sequelize, sequelize } = require("../config/database");

const TermsAndCondition = sequelize.define(
  "terms_and_conditions",
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
      defaultValue: false,
    },
    document_key: {
      type: Sequelize.STRING, // store unique key
      allowNull: true,
    }
  },
  {
    tableName: "terms_and_conditions",
    timestamps: true,
  }
);

module.exports = TermsAndCondition;
