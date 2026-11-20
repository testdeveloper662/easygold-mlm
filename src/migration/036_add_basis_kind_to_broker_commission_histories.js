const db = require("../models");

// QK-14: distinguishes a normal commission booking ("manual_share") from a
// QK-18 contract-partner booking ("structure_share"), so reconciliation can
// report manual_share_count/cents and structure_share_count/cents as their
// own fields instead of one blended total.
async function migrateAddBasisKind() {
  try {
    await db.sequelize.query("SET SESSION sql_mode = '';");

    const [columns] = await db.sequelize.query(
      "SHOW COLUMNS FROM `broker_commission_histories` LIKE 'basis_kind';"
    );
    if (columns.length === 0) {
      console.log("Adding basis_kind column to broker_commission_histories table...");
      await db.sequelize.query(
        "ALTER TABLE `broker_commission_histories` ADD COLUMN `basis_kind` VARCHAR(20) NOT NULL DEFAULT 'manual_share' AFTER `kontor_idempotency_key`;"
      );
      console.log("✅ basis_kind column added successfully.");
    } else {
      console.log("ℹ️ basis_kind column already exists.");
    }
  } catch (error) {
    console.error("❌ Error running migration for basis_kind:", error);
    throw error;
  }
}

module.exports = migrateAddBasisKind;
