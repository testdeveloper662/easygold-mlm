const { Sequelize, sequelize } = require("../config/database");

/**
 * EmailView Model
 * Maps to the existing 6lwup_email_view table in the database
 * This table already contains email templates with English and German content
 */
const EmailView = sequelize.define(
  "6lwup_email_view",
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "id",
      comment: "Template identifier (e.g., 84 for broker registration)",
    },
    subject_english: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: "Email subject in English",
    },
    subject_german: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: "Email subject in German",
    },
    content_english: {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Email HTML body in English with placeholders like {{variable_name}}",
    },
    content_german: {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Email HTML body in German with placeholders like {{variable_name}}",
    },
  },
  {
    tableName: "6lwup_email_view",
    timestamps: false, // Assuming the existing table doesn't have timestamps
  }
);

module.exports = EmailView;

