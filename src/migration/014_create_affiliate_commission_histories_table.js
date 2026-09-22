const db = require("../models");

async function migrateAffiliateCommissionHistories() {
  try {
    await db.sequelize.query("SET SESSION sql_mode = '';");

    console.log("Creating affiliate_commission_histories table if not exists...");
    await db.AffiliateCommissionHistory.sync({ alter: true });
    console.log("✅ affiliate_commission_histories table created/synchronized successfully!");
  } catch (error) {
    console.error("❌ Error running affiliate commission history migration:", error);
    throw error;
  }
}

module.exports = migrateAffiliateCommissionHistories;
