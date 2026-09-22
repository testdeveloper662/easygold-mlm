const db = require("../models");

async function up() {
  try {
    console.log("=== Updating usermeta for private individual users (role, u_role, user_role) ===");

    // 1. Update existing meta rows for users with role_id = 4
    const [updateResult] = await db.sequelize.query(`
      UPDATE \`6LWUP_usermeta\`
      SET meta_value = 'private individual'
      WHERE meta_key IN ('role', 'u_role', 'user_role')
        AND user_id IN (SELECT ID FROM \`6LWUP_users\` WHERE role_id = 4);
    `);
    console.log("Updated existing usermeta rows:", updateResult);

    // 2. Insert missing meta rows (role, u_role, user_role) for users with role_id = 4
    const [insertResult] = await db.sequelize.query(`
      INSERT INTO \`6LWUP_usermeta\` (user_id, meta_key, meta_value)
      SELECT u.ID, k.meta_key, 'private individual'
      FROM \`6LWUP_users\` u
      CROSS JOIN (
        SELECT 'role' AS meta_key UNION ALL
        SELECT 'u_role' AS meta_key UNION ALL
        SELECT 'user_role' AS meta_key
      ) k
      WHERE u.role_id = 4
        AND NOT EXISTS (
          SELECT 1 FROM \`6LWUP_usermeta\` um
          WHERE um.user_id = u.ID AND um.meta_key = k.meta_key
        );
    `);
    console.log("Inserted missing usermeta rows:", insertResult);

    console.log("=== Usermeta update for private individual users completed successfully! ===");
    return { success: true };
  } catch (error) {
    console.error("Error updating usermeta for private individual users:", error);
    throw error;
  }
}

module.exports = { up };
