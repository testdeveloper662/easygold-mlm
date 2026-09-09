const db = require("../models");
const { Op } = require("sequelize");
const { registerCustomerUser } = require("../utils/registerCustomerUserHelper");

async function up() {
  try {
    console.log("=== Starting migration for Customer role & customer user/referral sync ===");

    // 1. Ensure 'customer' role exists in user_type (Seeder model)
    let customerRole = await db.Seeder.findOne({
      where: {
        user_type: { [Op.or]: ["customer", "CUSTOMER"] },
      },
    });

    if (!customerRole) {
      const [existingRows] = await db.sequelize.query(
        "SELECT id FROM `user_type` WHERE `id` = 5;"
      );
      if (existingRows.length === 0) {
        await db.sequelize.query(
          "INSERT INTO `user_type` (`id`, `user_type`, `created_at`, `updated_at`) VALUES (5, 'customer', NOW(), NOW());"
        );
        customerRole = await db.Seeder.findByPk(5);
      } else {
        customerRole = await db.Seeder.create({ user_type: "customer" });
      }
      console.log(`Created new role 'customer' with ID: ${customerRole ? customerRole.id : 5}`);
    } else {
      console.log(`Found existing role 'customer' with ID: ${customerRole.id}`);
    }

    // 2. Fetch all registered TargetCustomers and create 6LWUP_users & user_referrals entries
    console.log("Fetching registered target customers to backfill users & user_referrals...");
    const registeredCustomers = await db.TargetCustomers.findAll({
      where: { status: "REGISTERED" },
    });

    let syncCount = 0;
    for (const cust of registeredCustomers) {
      const res = await registerCustomerUser(cust);
      if (res) syncCount++;
    }
    console.log(`Synced ${syncCount} registered customer(s) into 6LWUP_users and user_referrals.`);

    // 3. Recalculate children_count in user_referrals
    console.log("Recalculating children_count in user_referrals...");
    const [userRefCounts] = await db.sequelize.query(`
      SELECT parent_user_id, COUNT(*) as actual_count
      FROM user_referrals
      WHERE parent_user_id IS NOT NULL
      GROUP BY parent_user_id
    `);

    for (const row of userRefCounts) {
      await db.UserReferrals.update(
        { children_count: row.actual_count },
        { where: { user_id: row.parent_user_id } }
      );
    }

    // 4. Recalculate children_count in brokers
    console.log("Recalculating children_count in brokers table...");
    const [brokerCounts] = await db.sequelize.query(`
      SELECT parent_id, COUNT(*) as actual_count
      FROM brokers
      WHERE parent_id IS NOT NULL
      GROUP BY parent_id
    `);

    for (const row of brokerCounts) {
      await db.Brokers.update(
        { children_count: row.actual_count },
        { where: { id: row.parent_id } }
      );
    }

    console.log("=== Migration for Customer role completed successfully! ===");
    return { success: true };
  } catch (error) {
    console.error("Error during Customer role migration:", error);
    throw error;
  }
}

if (require.main === module) {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { up };
