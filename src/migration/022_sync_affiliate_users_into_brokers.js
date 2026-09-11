const { Op } = require("sequelize");
const db = require("../models");

/**
 * Backfill: every user whose role_id = 3 (AFFILIATE) must also exist in the `brokers` table.
 *
 * For each affiliate user that has no matching `brokers` row (matched by user_id) we create one,
 * mirroring the data from their `affiliates` row (referral_code, referred_by_code, counters) and
 * resolving parent_id to the parent's own `brokers` row.
 *
 * Private individuals (role_id = 4) are intentionally NOT touched - they belong to the affiliate network only.
 */
async function syncAffiliateUsersIntoBrokers() {
  console.log("=== Sync affiliate users (role_id = 3) into brokers table ===");

  // 1. Pull every affiliate row whose linked user has role_id = 3
  const affiliates = await db.Affiliates.findAll({
    include: [
      {
        model: db.Users,
        as: "user",
        attributes: ["ID", "role_id"],
        where: { role_id: 3 },
        required: true,
      },
    ],
  });

  console.log(`Found ${affiliates.length} affiliate user(s) with role_id = 3.`);

  // 2. Which of those user_ids already have a broker row?
  const userIds = [...new Set(affiliates.map((a) => a.user_id))];
  const existingBrokers = userIds.length
    ? await db.Brokers.findAll({
        where: { user_id: { [Op.in]: userIds } },
        attributes: ["user_id"],
      })
    : [];
  const brokerUserIds = new Set(existingBrokers.map((b) => Number(b.user_id)));

  let insertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const affiliate of affiliates) {
    const userId = Number(affiliate.user_id);

    if (brokerUserIds.has(userId)) {
      skippedCount++;
      continue;
    }

    try {
      // Resolve parent_id inside the brokers table.
      // Prefer the affiliate's referred_by_code -> broker.referral_code; fall back to UserReferrals.parent_user_id.
      let parentBrokerId = null;

      const referredByCode = (affiliate.referred_by_code || "").trim();
      if (referredByCode) {
        const parentBroker = await db.Brokers.findOne({
          where: { referral_code: referredByCode },
          attributes: ["id"],
        });
        if (parentBroker) parentBrokerId = parentBroker.id;
      }

      if (!parentBrokerId && db.UserReferrals) {
        const ref = await db.UserReferrals.findOne({
          where: { user_id: userId },
          attributes: ["parent_user_id"],
        });
        if (ref && ref.parent_user_id) {
          const parentBroker = await db.Brokers.findOne({
            where: { user_id: ref.parent_user_id },
            attributes: ["id"],
          });
          if (parentBroker) parentBrokerId = parentBroker.id;
        }
      }

      await db.Brokers.create({
        user_id: userId,
        parent_id: parentBrokerId,
        referral_code: affiliate.referral_code || null,
        referred_by_code: affiliate.referred_by_code || null,
        children_count: affiliate.children_count || 0,
        total_commission_amount: affiliate.total_commission_amount || 0,
        profile_image: affiliate.profile_image || null,
        logo: affiliate.logo || null,
      });

      brokerUserIds.add(userId);
      insertedCount++;
      console.log(`  + Created broker row for user_id ${userId} (referral_code: ${affiliate.referral_code})`);
    } catch (err) {
      errorCount++;
      console.error(`  ! Failed to create broker row for user_id ${userId}:`, err.message);
    }
  }

  console.log("--------------------------------------------------");
  console.log(`Affiliate users processed : ${affiliates.length}`);
  console.log(`Broker rows created       : ${insertedCount}`);
  console.log(`Already had a broker row  : ${skippedCount}`);
  console.log(`Errors                    : ${errorCount}`);
  console.log("=== Sync complete ===");

  return { processed: affiliates.length, insertedCount, skippedCount, errorCount };
}

module.exports = syncAffiliateUsersIntoBrokers;

// Allows running this file directly: node src/migration/sync_affiliate_users_into_brokers.js
if (require.main === module) {
  syncAffiliateUsersIntoBrokers()
    .then(() => {
      console.log("[SyncAffiliateUsersIntoBrokers] Script complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[SyncAffiliateUsersIntoBrokers] Fatal error:", err);
      process.exit(1);
    })
    .finally(() => {
      db.sequelize.close();
    });
}
