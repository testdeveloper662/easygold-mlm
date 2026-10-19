const db = require("../models");

// order_id on broker_commission_histories is a legacy int(11) (holds numeric
// order IDs from the pre-existing order flow) — Kontor's idempotency_key is
// an arbitrary string (e.g. "order_line:4711:paid"), so it needs its own
// column rather than being silently coerced by MySQL's non-strict mode.
async function migrateAddKontorIdempotencyKey() {
  try {
    await db.sequelize.query("SET SESSION sql_mode = '';");

    const [columns] = await db.sequelize.query(
      "SHOW COLUMNS FROM `broker_commission_histories` LIKE 'kontor_idempotency_key';"
    );
    if (columns.length === 0) {
      console.log("Adding kontor_idempotency_key column to broker_commission_histories table...");
      await db.sequelize.query(
        "ALTER TABLE `broker_commission_histories` ADD COLUMN `kontor_idempotency_key` VARCHAR(255) NULL DEFAULT NULL AFTER `kontor_mode`;"
      );
      console.log("✅ kontor_idempotency_key column added successfully.");
    } else {
      console.log("ℹ️ kontor_idempotency_key column already exists.");
    }

    // Not unique: every level of a multi-broker commission split shares the
    // same idempotency_key (one row per level, one booking) — a regular
    // index is enough for fast lookups without a uniqueness constraint.
    const [indexRows] = await db.sequelize.query(
      "SHOW INDEX FROM `broker_commission_histories` WHERE Key_name = 'broker_commission_histories_kontor_idempotency_key_idx';"
    );
    if (indexRows.length === 0) {
      console.log("Adding index on broker_commission_histories.kontor_idempotency_key...");
      await db.sequelize.query(
        "ALTER TABLE `broker_commission_histories` ADD INDEX `broker_commission_histories_kontor_idempotency_key_idx` (`kontor_idempotency_key`);"
      );
      console.log("✅ Index added successfully.");
    } else {
      console.log("ℹ️ Index on kontor_idempotency_key already exists.");
    }
  } catch (error) {
    console.error("❌ Error running migration for kontor_idempotency_key:", error);
    throw error;
  }
}

module.exports = migrateAddKontorIdempotencyKey;
