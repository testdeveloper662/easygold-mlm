const { sequelize } = require("../config/database");
const { Affiliates, AffiliateInvitations } = require("../models");

async function migrateAffiliates() {
  try {
    console.log("Starting migration for Affiliates & AffiliateInvitations tables...");
    await Affiliates.sync({ alter: true });
    await AffiliateInvitations.sync({ alter: true });
    console.log("✅ Tables 'affiliates' and 'affiliate_invitations' created/synced successfully.");
  } catch (error) {
    console.error("❌ Error running migration:", error);
  }
}

module.exports = migrateAffiliates;
