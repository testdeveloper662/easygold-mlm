const db = require("../models");

async function migrateUserRoles() {
  try {
    // Temporarily turn off strict SQL mode to allow altering tables with zero-date defaults ('0000-00-00 00:00:00')
    await db.sequelize.query("SET SESSION sql_mode = '';");

    // 1. Check if role_id column exists. If not, add it using raw SQL.
    const [columns] = await db.sequelize.query(
      "SHOW COLUMNS FROM `6LWUP_users` LIKE 'role_id';"
    );
    if (columns.length === 0) {
      console.log("Adding role_id column to 6LWUP_users table...");
      await db.sequelize.query(
        "ALTER TABLE `6LWUP_users` ADD COLUMN `role_id` INTEGER NULL;"
      );
      console.log("role_id column added successfully.");
    } else {
      console.log("role_id column already exists.");
    }


    // 2. Fetch role records from seeders table
    const adminRole = await db.Seeder.findOne({ where: { user_type: "admin" } });
    const brokerRole = await db.Seeder.findOne({ where: { user_type: "broker" } });

    if (!adminRole || !brokerRole) {
      throw new Error("Could not find admin or broker roles in seeders table. Please run the seeder first!");
    }

    console.log(`Admin Role ID: ${adminRole.id}, Broker Role ID: ${brokerRole.id}`);

    // 3. Update role_id for all users
    console.log("Setting default role_id to broker role ID for all users...");
    const [defaultCount] = await db.Users.update(
      { role_id: brokerRole.id },
      { where: {} }
    );
    console.log(`Updated ${defaultCount} users to broker role.`);

    console.log("Setting role_id to admin role ID for users with user_type = 1...");
    const [adminCount] = await db.Users.update(
      { role_id: adminRole.id },
      { where: { user_type: 1 } }
    );
    console.log(`Updated ${adminCount} users to admin role.`);

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error running migration:", error);
  } finally {
    await db.sequelize.close();
  }
}

migrateUserRoles();
