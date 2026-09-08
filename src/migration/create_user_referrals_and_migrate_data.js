const { sequelize } = require("../config/database");
const { Users, Brokers, Affiliates, UserReferrals } = require("../models");

async function migrateUserReferrals() {
  try {
    console.log("=== Starting Migration: Create user_referrals table & populate data ===");

    // 1. Sync the user_referrals schema
    console.log("Syncing user_referrals schema...");
    await UserReferrals.sync({ alter: true });
    console.log("✅ user_referrals table created/synced.");

    // 2. Fetch all brokers, affiliates, and users
    console.log("Fetching records from Users, Brokers, and Affiliates...");
    const [allUsers, allBrokers, allAffiliates] = await Promise.all([
      Users.findAll({ attributes: ["ID"] }),
      Brokers.findAll(),
      Affiliates.findAll(),
    ]);

    console.log(`Found ${allUsers.length} Users, ${allBrokers.length} Brokers, and ${allAffiliates.length} Affiliates.`);

    // 3. Build lookup maps
    // codeToUserIdMap: referral_code (uppercase) -> user_id
    const codeToUserIdMap = new Map();
    // brokerIdToUserIdMap: broker.id -> user_id
    const brokerIdToUserIdMap = new Map();
    // affiliateIdToUserIdMap: affiliate.id -> user_id
    const affiliateIdToUserIdMap = new Map();

    // Populate maps from brokers
    for (const b of allBrokers) {
      if (b.id && b.user_id) {
        brokerIdToUserIdMap.set(Number(b.id), Number(b.user_id));
      }
      if (b.referral_code && b.user_id) {
        const cleanCode = String(b.referral_code).trim().toUpperCase();
        if (cleanCode) {
          codeToUserIdMap.set(cleanCode, Number(b.user_id));
        }
      }
    }

    // Populate maps from affiliates
    for (const a of allAffiliates) {
      if (a.id && a.user_id) {
        affiliateIdToUserIdMap.set(Number(a.id), Number(a.user_id));
      }
      if (a.referral_code && a.user_id) {
        const cleanCode = String(a.referral_code).trim().toUpperCase();
        if (cleanCode && !codeToUserIdMap.has(cleanCode)) {
          codeToUserIdMap.set(cleanCode, Number(a.user_id));
        }
      }
    }

    // 4. Consolidate referral data per user_id
    const userReferralDataMap = new Map();

    // Process Brokers first
    for (const b of allBrokers) {
      if (!b.user_id) continue;
      const uId = Number(b.user_id);

      userReferralDataMap.set(uId, {
        user_id: uId,
        referral_code: b.referral_code ? String(b.referral_code).trim() : null,
        referred_by_code: b.referred_by_code ? String(b.referred_by_code).trim() : null,
        broker_parent_id: b.parent_id ? Number(b.parent_id) : null,
        affiliate_parent_id: null,
        children_count: b.children_count || 0,
      });
    }

    // Process Affiliates (merge if user already in map)
    for (const a of allAffiliates) {
      if (!a.user_id) continue;
      const uId = Number(a.user_id);
      const existing = userReferralDataMap.get(uId);

      const aRefCode = a.referral_code ? String(a.referral_code).trim() : null;
      const aReferredByCode = a.referred_by_code ? String(a.referred_by_code).trim() : null;
      const aParentId = a.parent_id ? Number(a.parent_id) : null;
      const aChildrenCount = a.children_count || 0;

      if (existing) {
        if (!existing.referral_code && aRefCode) existing.referral_code = aRefCode;
        if (!existing.referred_by_code && aReferredByCode) existing.referred_by_code = aReferredByCode;
        if (!existing.affiliate_parent_id && aParentId) existing.affiliate_parent_id = aParentId;
        existing.children_count = Math.max(existing.children_count, aChildrenCount);
      } else {
        userReferralDataMap.set(uId, {
          user_id: uId,
          referral_code: aRefCode,
          referred_by_code: aReferredByCode,
          broker_parent_id: null,
          affiliate_parent_id: aParentId,
          children_count: aChildrenCount,
        });
      }
    }

    // Process remaining users from 6LWUP_users
    for (const u of allUsers) {
      const uId = Number(u.ID);
      if (!userReferralDataMap.has(uId)) {
        userReferralDataMap.set(uId, {
          user_id: uId,
          referral_code: null,
          referred_by_code: null,
          broker_parent_id: null,
          affiliate_parent_id: null,
          children_count: 0,
        });
      }
    }

    // 5. Resolve parent_user_id for each user
    let insertedCount = 0;
    let updatedCount = 0;

    for (const [uId, data] of userReferralDataMap.entries()) {
      let parentUserId = null;

      // Method A: Check referred_by_code lookup
      if (data.referred_by_code) {
        const cleanRefBy = data.referred_by_code.trim().toUpperCase();
        if (codeToUserIdMap.has(cleanRefBy)) {
          parentUserId = codeToUserIdMap.get(cleanRefBy);
        }
      }

      // Method B: Check broker_parent_id lookup
      if (!parentUserId && data.broker_parent_id) {
        if (brokerIdToUserIdMap.has(data.broker_parent_id)) {
          parentUserId = brokerIdToUserIdMap.get(data.broker_parent_id);
        }
      }

      // Method C: Check affiliate_parent_id lookup
      if (!parentUserId && data.affiliate_parent_id) {
        if (affiliateIdToUserIdMap.has(data.affiliate_parent_id)) {
          parentUserId = affiliateIdToUserIdMap.get(data.affiliate_parent_id);
        } else if (userReferralDataMap.has(data.affiliate_parent_id)) {
          // If parent_id in affiliates was stored directly as user_id
          parentUserId = data.affiliate_parent_id;
        }
      }

      // Ensure a user cannot be their own parent
      if (parentUserId === uId) {
        parentUserId = null;
      }

      const existingRecord = await UserReferrals.findOne({ where: { user_id: uId } });

      const payload = {
        user_id: uId,
        referral_code: data.referral_code || null,
        referred_by_code: data.referred_by_code || null,
        parent_user_id: parentUserId || null,
        children_count: data.children_count || 0,
      };

      if (existingRecord) {
        await existingRecord.update(payload);
        updatedCount++;
      } else {
        await UserReferrals.create(payload);
        insertedCount++;
      }
    }

    // 6. Recalculate children_count accurately based on actual parent_user_id references
    console.log("Recalculating exact children_count metrics...");
    const [counts] = await sequelize.query(`
      SELECT parent_user_id, COUNT(*) as actual_count
      FROM user_referrals
      WHERE parent_user_id IS NOT NULL
      GROUP BY parent_user_id
    `);

    for (const row of counts) {
      const parentId = row.parent_user_id;
      const count = row.actual_count;
      await UserReferrals.update(
        { children_count: count },
        { where: { user_id: parentId } }
      );
    }

    console.log("\n=============================================");
    console.log("🎉 Migration completed successfully!");
    console.log(`- New user_referrals records created: ${insertedCount}`);
    console.log(`- Existing user_referrals records updated: ${updatedCount}`);
    console.log(`- Total users processed: ${userReferralDataMap.size}`);
    console.log("=============================================\n");

  } catch (error) {
    console.error("❌ Error running migrateUserReferrals:", error);
    throw error;
  }
}

module.exports = migrateUserReferrals;
