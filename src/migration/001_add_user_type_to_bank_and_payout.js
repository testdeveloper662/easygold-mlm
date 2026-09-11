const db = require("../models");

async function migrateAddUserTypeToBankAndPayout() {
  try {
    await db.sequelize.query("SET SESSION sql_mode = '';");

    // 1. Add user_type to broker_bank_details table if not exists
    const [bankColumns] = await db.sequelize.query(
      "SHOW COLUMNS FROM `broker_bank_details` LIKE 'user_type';"
    );
    if (bankColumns.length === 0) {
      console.log("Adding user_type column to broker_bank_details table...");
      await db.sequelize.query(
        "ALTER TABLE `broker_bank_details` ADD COLUMN `user_type` VARCHAR(50) NOT NULL DEFAULT 'broker';"
      );
      console.log("user_type column added to broker_bank_details successfully.");
    } else {
      console.log("user_type column already exists in broker_bank_details.");
    }

    // 2. Add user_type to broker_payout_requests table if not exists
    const [payoutColumns] = await db.sequelize.query(
      "SHOW COLUMNS FROM `broker_payout_requests` LIKE 'user_type';"
    );
    if (payoutColumns.length === 0) {
      console.log("Adding user_type column to broker_payout_requests table...");
      await db.sequelize.query(
        "ALTER TABLE `broker_payout_requests` ADD COLUMN `user_type` VARCHAR(50) NOT NULL DEFAULT 'broker';"
      );
      console.log("user_type column added to broker_payout_requests successfully.");
    } else {
      console.log("user_type column already exists in broker_payout_requests.");
    }

    console.log("✅ DB Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error running migration:", error);
  }
}

module.exports = migrateAddUserTypeToBankAndPayout;
