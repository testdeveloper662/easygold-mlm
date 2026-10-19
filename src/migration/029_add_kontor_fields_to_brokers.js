const db = require("../models");

async function migrateAddKontorFieldsToBrokers() {
  try {
    await db.sequelize.query("SET SESSION sql_mode = '';");

    const addColumnIfMissing = async (column, ddl) => {
      const [columns] = await db.sequelize.query(
        `SHOW COLUMNS FROM \`brokers\` LIKE '${column}';`
      );
      if (columns.length === 0) {
        console.log(`Adding ${column} column to brokers table...`);
        await db.sequelize.query(ddl);
        console.log(`✅ ${column} column added to brokers table successfully.`);
      } else {
        console.log(`ℹ️ ${column} column already exists in brokers table.`);
      }
    };

    await addColumnIfMissing(
      "source",
      "ALTER TABLE `brokers` ADD COLUMN `source` VARCHAR(50) NULL DEFAULT NULL AFTER `option_subscription_doc`;"
    );
    await addColumnIfMissing(
      "external_ref",
      "ALTER TABLE `brokers` ADD COLUMN `external_ref` VARCHAR(255) NULL DEFAULT NULL AFTER `source`;"
    );
    await addColumnIfMissing(
      "kontor_status",
      "ALTER TABLE `brokers` ADD COLUMN `kontor_status` VARCHAR(20) NULL DEFAULT NULL AFTER `external_ref`;"
    );

    // external_ref only needs to be unique among Kontor-sourced rows, but a
    // plain UNIQUE index is fine — MySQL allows unlimited NULLs through it,
    // and every non-Kontor broker row leaves it NULL.
    const [indexRows] = await db.sequelize.query(
      "SHOW INDEX FROM `brokers` WHERE Key_name = 'brokers_external_ref_unique';"
    );
    if (indexRows.length === 0) {
      console.log("Adding unique index on brokers.external_ref...");
      await db.sequelize.query(
        "ALTER TABLE `brokers` ADD UNIQUE INDEX `brokers_external_ref_unique` (`external_ref`);"
      );
      console.log("✅ Unique index on external_ref added successfully.");
    } else {
      console.log("ℹ️ Unique index on external_ref already exists.");
    }
  } catch (error) {
    console.error("❌ Error running migration for Kontor fields on brokers:", error);
    throw error;
  }
}

module.exports = migrateAddKontorFieldsToBrokers;
