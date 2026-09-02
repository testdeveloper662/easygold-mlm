const db = require("../models");

async function up() {
  try {
    console.log("=== Updating usermeta (person_typ, u_person_type) to 'affiliate' for affiliate users ===");

    // 1. Fetch all user IDs whose role is affiliate (role_id = 3 or role meta_value 'affiliate')
    const [affiliateUsers] = await db.sequelize.query(`
      SELECT DISTINCT u.ID
      FROM \`6LWUP_users\` u
      LEFT JOIN \`6LWUP_usermeta\` um ON um.user_id = u.ID AND um.meta_key IN ('role', 'u_role', 'user_role')
      WHERE u.role_id = 3
         OR LOWER(um.meta_value) = 'affiliate';
    `);

    const userIds = affiliateUsers.map((r) => r.ID);
    console.log(`Found ${userIds.length} affiliate users:`, userIds);

    if (userIds.length === 0) {
      console.log("No affiliate users found.");
      return { success: true, count: 0 };
    }

    const idListStr = userIds.join(",");

    // 2. Update existing meta rows (person_typ and u_person_type) for these users
    const [updateResult] = await db.sequelize.query(`
      UPDATE \`6LWUP_usermeta\`
      SET meta_value = 'affiliate'
      WHERE meta_key IN ('person_typ', 'u_person_type')
        AND user_id IN (${idListStr});
    `);
    console.log("Updated existing usermeta rows:", updateResult);

    // 3. Insert missing meta rows (person_typ, u_person_type) for these users
    const [insertResult] = await db.sequelize.query(`
      INSERT INTO \`6LWUP_usermeta\` (user_id, meta_key, meta_value)
      SELECT u.ID, k.meta_key, 'affiliate'
      FROM \`6LWUP_users\` u
      CROSS JOIN (
        SELECT 'person_typ' AS meta_key UNION ALL
        SELECT 'u_person_type' AS meta_key
      ) k
      WHERE u.ID IN (${idListStr})
        AND NOT EXISTS (
          SELECT 1 FROM \`6LWUP_usermeta\` um
          WHERE um.user_id = u.ID AND um.meta_key = k.meta_key
        );
    `);
    console.log("Inserted missing usermeta rows:", insertResult);

    // 4. Verify the updated rows
    const [verification] = await db.sequelize.query(`
      SELECT 
        u.ID, 
        u.user_email, 
        u.role_id,
        MAX(CASE WHEN um.meta_key = 'person_typ' THEN um.meta_value END) AS person_typ,
        MAX(CASE WHEN um.meta_key = 'u_person_type' THEN um.meta_value END) AS u_person_type,
        MAX(CASE WHEN um.meta_key = 'role' THEN um.meta_value END) AS role
      FROM \`6LWUP_users\` u
      LEFT JOIN \`6LWUP_usermeta\` um ON um.user_id = u.ID
      WHERE u.ID IN (${idListStr})
      GROUP BY u.ID, u.user_email, u.role_id;
    `);

    console.log("=== Verification of Affiliate Users in Database ===");
    console.table(verification);

    console.log("=== Usermeta update for affiliate users completed successfully! ===");
    return { success: true, count: verification.length };
  } catch (error) {
    console.error("Error updating usermeta for affiliate users:", error);
    throw error;
  }
}

if (require.main === module) {
  up()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { up };
