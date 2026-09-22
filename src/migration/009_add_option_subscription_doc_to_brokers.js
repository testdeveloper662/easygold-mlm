const db = require("../models");

async function migrateAddOptionSubscriptionDocToBrokers() {
  try {
    await db.sequelize.query("SET SESSION sql_mode = '';");

    const [columns] = await db.sequelize.query(
      "SHOW COLUMNS FROM `brokers` LIKE 'option_subscription_doc';"
    );

    if (columns.length === 0) {
      console.log("Adding option_subscription_doc column to brokers table...");
      await db.sequelize.query(
        "ALTER TABLE `brokers` ADD COLUMN `option_subscription_doc` LONGTEXT NULL DEFAULT NULL;"
      );
      console.log("✅ option_subscription_doc column added to brokers table successfully.");
    } else {
      console.log("ℹ️ option_subscription_doc column already exists in brokers table.");
    }
  } catch (error) {
    console.error("❌ Error running migration for option_subscription_doc:", error);
  }
}

module.exports = migrateAddOptionSubscriptionDocToBrokers;
