const { sequelize } = require("../config/database");
const { Brokers, Affiliates, UsersMeta } = require("../models");

async function migrate() {
  try {
    console.log("Starting migration: Dump all broker data into affiliates...");

    // 1. Sync the Affiliates table to add the new document fields if they do not exist
    console.log("Syncing Affiliates schema...");
    await Affiliates.sync({ alter: true });
    console.log("✅ Affiliates schema synced.");

    // 2. Fetch all brokers
    console.log("Fetching all broker records...");
    const brokers = await Brokers.findAll();
    console.log(`Found ${brokers.length} broker records to migrate.`);

    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const broker of brokers) {
      try {
        // Fetch user meta for additional fields
        const userMetaList = await UsersMeta.findAll({ where: { user_id: broker.user_id } });
        const meta = {};
        userMetaList.forEach(m => {
          meta[m.meta_key] = m.meta_value;
        });

        const person_typ = meta['person_typ'] || '';
        const land = meta['u_country'] || meta['country'] || meta['land'] || '';
        const steuer_id = meta['steuer_id'] || '';

        // Check if affiliate already exists for this user_id
        let affiliate = await Affiliates.findOne({ where: { user_id: broker.user_id } });

        const values = {
          logo: broker.logo,
          profile_image: broker.profile_image,
          user_id: broker.user_id,
          parent_id: null,
          referral_code: broker.referral_code,
          referred_by_code: broker.referred_by_code,
          children_count: broker.children_count,
          total_commission_amount: broker.total_commission_amount,
          // untermaklervertrag_doc: broker.untermaklervertrag_doc,
          // maklervertrag_doc: broker.maklervertrag_doc,
          // inc_partnership_doc: broker.inc_partnership_doc,
          // llc_partnership_doc: broker.llc_partnership_doc,
          // goldflex_partnership_doc: broker.goldflex_partnership_doc,
          // hartmann_benz_gmbh_doc: broker.hartmann_benz_gmbh_doc,
          // binding_loi_doc: broker.binding_loi_doc,
          // partner_tax_billing_doc: broker.partner_tax_billing_doc
        };

        if (affiliate) {
          // Update existing affiliate
          await affiliate.update(values);
          updatedCount++;
          console.log(`Updated existing affiliate for user_id: ${broker.user_id}`);
        } else {
          // Check if broker.id is already taken in affiliates
          const idConflict = await Affiliates.findByPk(broker.id);
          if (!idConflict) {
            // Safe to preserve the ID
            values.id = broker.id;
          } else {
            console.log(`Warning: ID ${broker.id} is already taken in affiliates. Auto-incrementing ID for user_id: ${broker.user_id}`);
          }
          await Affiliates.create(values);
          insertedCount++;
          console.log(`Created new affiliate for user_id: ${broker.user_id}`);
        }
      } catch (err) {
        errorCount++;
        console.error(`Error migrating broker with ID ${broker.id} (user_id: ${broker.user_id}):`, err.message);
      }
    }

    console.log("\nMigration completed successfully.");
    console.log(`--------------------------------`);
    console.log(`Total records processed: ${brokers.length}`);
    console.log(`New affiliates created: ${insertedCount}`);
    console.log(`Affiliates updated:      ${updatedCount}`);
    console.log(`Errors encountered:      ${errorCount}`);
    console.log(`--------------------------------`);

  } catch (error) {
    console.error("❌ Fatal error during migration:", error);
  }
}

module.exports = migrate;
