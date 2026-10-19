const db = require("../models");

async function migrateAddKontorFieldsToBrokerCommissionHistories() {
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

    await addColumnIfMissing(
      "source",
      "ALTER TABLE `broker_commission_histories` ADD COLUMN `source` VARCHAR(50) NULL DEFAULT NULL AFTER `product_type`;"
    );
    await addColumnIfMissing(
      "kontor_acknowledged_at",
      "ALTER TABLE `broker_commission_histories` ADD COLUMN `kontor_acknowledged_at` DATETIME NULL DEFAULT NULL AFTER `source`;"
    );
  } catch (error) {
    console.error("❌ Error running migration for Kontor fields on broker_commission_histories:", error);
    throw error;
  }
}

module.exports = migrateAddKontorFieldsToBrokerCommissionHistories;
