const db = require("../models");

async function migrateAddVeriffSessionIdToAffiliates() {
  try {
    await db.sequelize.query("SET SESSION sql_mode = '';");

    const [columns] = await db.sequelize.query(
      "SHOW COLUMNS FROM `affiliates` LIKE 'veriff_session_id';"
    );

    if (columns.length === 0) {
      console.log("Adding veriff_session_id column to affiliates table...");
      await db.sequelize.query(
        "ALTER TABLE `affiliates` ADD COLUMN `veriff_session_id` VARCHAR(255) NULL DEFAULT NULL AFTER `total_commission_amount`;"
      );
      console.log("✅ veriff_session_id column added to affiliates table successfully.");
    } else {
      console.log("ℹ️ veriff_session_id column already exists in affiliates table.");
    }
  } catch (error) {
    console.error("❌ Error running migration for veriff_session_id on affiliates:", error);
    throw error;
  }
}

module.exports = migrateAddVeriffSessionIdToAffiliates;
