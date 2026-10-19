const db = require("../models");

async function migrateAddKontorTransactionFields() {
  try {
    await db.sequelize.query("SET SESSION sql_mode = '';");

    const addColumnIfMissing = async (column, ddl) => {
      const [columns] = await db.sequelize.query(
        `SHOW COLUMNS FROM \`broker_commission_histories\` LIKE '${column}';`
      );
      if (columns.length === 0) {
        console.log(`Adding ${column} column to broker_commission_histories table...`);
        await db.sequelize.query(ddl);
        console.log(`✅ ${column} column added to broker_commission_histories table successfully.`);
      } else {
        console.log(`ℹ️ ${column} column already exists in broker_commission_histories table.`);
      }
    };

    // Kontor's own transaction ID (a ULID) — referenced by corrects_entry_id
    // on later correction/reversal pushes, so we need it stored to trace them.
    await addColumnIfMissing(
      "kontor_entry_id",
      "ALTER TABLE `broker_commission_histories` ADD COLUMN `kontor_entry_id` VARCHAR(64) NULL DEFAULT NULL AFTER `kontor_acknowledged_at`;"
    );
    // When the event actually happened on Kontor's side, as opposed to
    // createdAt (when we received/processed it) — reconciliation should
    // group by this, not by our own processing time.
    await addColumnIfMissing(
      "occurred_at",
      "ALTER TABLE `broker_commission_histories` ADD COLUMN `occurred_at` DATETIME NULL DEFAULT NULL AFTER `kontor_entry_id`;"
    );
    await addColumnIfMissing(
      "kontor_mode",
      "ALTER TABLE `broker_commission_histories` ADD COLUMN `kontor_mode` VARCHAR(10) NULL DEFAULT NULL AFTER `occurred_at`;"
    );

    const [indexRows] = await db.sequelize.query(
      "SHOW INDEX FROM `broker_commission_histories` WHERE Key_name = 'broker_commission_histories_kontor_entry_id_unique';"
    );
    if (indexRows.length === 0) {
      console.log("Adding unique index on broker_commission_histories.kontor_entry_id...");
      await db.sequelize.query(
        "ALTER TABLE `broker_commission_histories` ADD UNIQUE INDEX `broker_commission_histories_kontor_entry_id_unique` (`kontor_entry_id`);"
      );
      console.log("✅ Unique index on kontor_entry_id added successfully.");
    } else {
      console.log("ℹ️ Unique index on kontor_entry_id already exists.");
    }
  } catch (error) {
    console.error("❌ Error running migration for Kontor transaction fields:", error);
    throw error;
  }
}

module.exports = migrateAddKontorTransactionFields;
