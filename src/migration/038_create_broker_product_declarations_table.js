const { Sequelize, sequelize } = require("../config/database");

async function up() {
  const transaction = await sequelize.transaction();
  try {
    const tableExists = await sequelize.getQueryInterface().showAllTables();
    if (!tableExists.includes("broker_product_declarations")) {
      await sequelize.getQueryInterface().createTable(
        "broker_product_declarations",
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
          user_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
          },
          // "easygold" | "primeinvest" | "goldflex"
          product: {
            type: Sequelize.STRING(30),
            allowNull: false,
          },
          terms_and_conditions_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "terms_and_conditions",
              key: "id",
            },
            onDelete: "SET NULL",
          },
          // Snapshot of the accepted declaration's last-updated timestamp, so a
          // later content edit by admin can be detected and re-confirmation asked for.
          text_version: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          confirmed_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          ip_address: {
            type: Sequelize.STRING(45),
            allowNull: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await sequelize.getQueryInterface().addIndex(
        "broker_product_declarations",
        ["broker_id", "product"],
        { unique: true, name: "uniq_broker_product_declaration", transaction }
      );

      console.log("Migration 038: Created broker_product_declarations table.");
    } else {
      console.log("Migration 038: broker_product_declarations table already exists.");
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error("Migration 038 failed:", error);
    throw error;
  }
}

module.exports = { up };
