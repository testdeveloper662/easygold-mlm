const db = require("../models");

async function migrateAddRejectionReasonToPayoutRequests() {
  try {
    await db.sequelize.query("SET SESSION sql_mode = '';");

    // 1. Add rejection_reason to broker_payout_requests if not exists
    const [brokerCols] = await db.sequelize.query(
      "SHOW COLUMNS FROM `broker_payout_requests` LIKE 'rejection_reason';"
    );
    if (brokerCols.length === 0) {
      console.log("Adding rejection_reason column to broker_payout_requests table...");
      await db.sequelize.query(
        "ALTER TABLE `broker_payout_requests` ADD COLUMN `rejection_reason` TEXT NULL DEFAULT NULL;"
      );
      console.log("rejection_reason column added to broker_payout_requests successfully.");
    } else {
      console.log("rejection_reason column already exists in broker_payout_requests.");
    }

    // 2. Add rejection_reason to affiliate_payout_requests if not exists
    const [affiliateCols] = await db.sequelize.query(
      "SHOW COLUMNS FROM `affiliate_payout_requests` LIKE 'rejection_reason';"
    );
    if (affiliateCols.length === 0) {
      console.log("Adding rejection_reason column to affiliate_payout_requests table...");
      await db.sequelize.query(
        "ALTER TABLE `affiliate_payout_requests` ADD COLUMN `rejection_reason` TEXT NULL DEFAULT NULL;"
      );
      console.log("rejection_reason column added to affiliate_payout_requests successfully.");
    } else {
      console.log("rejection_reason column already exists in affiliate_payout_requests.");
    }

    console.log("✅ Rejection reason DB Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error running rejection_reason migration:", error);
  }
}

module.exports = migrateAddRejectionReasonToPayoutRequests;
