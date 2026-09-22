const { Sequelize, sequelize } = require("../config/database");

async function up() {
  const transaction = await sequelize.transaction();
  try {
    const tableExists = await sequelize.getQueryInterface().showAllTables();
    if (!tableExists.includes("terms_and_conditions")) {
      await sequelize.getQueryInterface().createTable(
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
            type: Sequelize.TEXT("long"),
            allowNull: true,
          },
          german_template_text: {
            type: Sequelize.TEXT("long"),
            allowNull: true,
          },
          english_pdf_file: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          german_pdf_file: {
            type: Sequelize.STRING,
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
            type: Sequelize.STRING,
            allowNull: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }
        },
        { transaction }
      );

      console.log("Migration 024: Created terms_and_conditions table.");
    } else {
      console.log("Migration 024: terms_and_conditions table already exists.");
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error("Migration 024 failed:", error);
    throw error;
  }
}

module.exports = { up };
