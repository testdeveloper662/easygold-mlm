const db = require("../models");

async function migrateAffiliateTablesV2() {
  try {
    await db.sequelize.query("SET SESSION sql_mode = '';");

    console.log("Ensuring affiliates table exists...");
    await db.Affiliates.sync();

    console.log("Creating affiliate_bank_details table if not exists...");
    await db.AffiliateBankDetails.sync({ alter: true });
    console.log("✅ affiliate_bank_details table created/synchronized!");

    console.log("Creating affiliate_payout_requests table if not exists...");
    await db.AffiliatePayoutRequests.sync({ alter: true });
    console.log("✅ affiliate_payout_requests table created/synchronized!");

    console.log("✅ Affiliate separate DB migration (v2) completed successfully!");
  } catch (error) {
    console.error("❌ Error running affiliate migration v2:", error);
    throw error;
  }
}

module.exports = migrateAffiliateTablesV2;
