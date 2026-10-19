const db = require("../models");

async function migrateAddMlmCustomerNumberToBrokers() {
  try {
    await db.sequelize.query("SET SESSION sql_mode = '';");

    const [columns] = await db.sequelize.query(
      "SHOW COLUMNS FROM `brokers` LIKE 'mlm_customer_number';"
    );

    if (columns.length === 0) {
      console.log("Adding mlm_customer_number column to brokers table...");
      await db.sequelize.query(
        "ALTER TABLE `brokers` ADD COLUMN `mlm_customer_number` VARCHAR(20) NULL DEFAULT NULL AFTER `kontor_status`;"
      );
      console.log("✅ mlm_customer_number column added to brokers table successfully.");
    } else {
      console.log("ℹ️ mlm_customer_number column already exists in brokers table.");
    }

    const [indexRows] = await db.sequelize.query(
      "SHOW INDEX FROM `brokers` WHERE Key_name = 'brokers_mlm_customer_number_unique';"
    );
    if (indexRows.length === 0) {
      console.log("Adding unique index on brokers.mlm_customer_number...");
      await db.sequelize.query(
        "ALTER TABLE `brokers` ADD UNIQUE INDEX `brokers_mlm_customer_number_unique` (`mlm_customer_number`);"
      );
      console.log("✅ Unique index on mlm_customer_number added successfully.");
    } else {
      console.log("ℹ️ Unique index on mlm_customer_number already exists.");
    }
  } catch (error) {
    console.error("❌ Error running migration for mlm_customer_number on brokers:", error);
    throw error;
  }
}

module.exports = migrateAddMlmCustomerNumberToBrokers;
