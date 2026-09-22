const db = require("../models");
const { Op } = require("sequelize");

async function up() {
  try {
    console.log("=== Starting migration for Private Individual role ===");

    // 1. Ensure 'private individual' role exists in user_type (Seeder model)
    let privateRole = await db.Seeder.findOne({
      where: {
        user_type: { [Op.or]: ["private individual", "private_individual"] },
      },
    });

    if (!privateRole) {
      privateRole = await db.Seeder.create({
        user_type: "private individual",
      });
      console.log(`Created new role 'private individual' with ID: ${privateRole.id}`);
    } else {
      console.log(`Found existing role 'private individual' with ID: ${privateRole.id}`);
    }

    const privateRoleId = privateRole.id;

    // 2. Update users who currently have role_id = 3 and (u_vat_no is NULL or '' or not present in usermeta)
    // Those with non-empty u_vat_no remain with role_id = 3 (affiliate)
    const [updateResult] = await db.sequelize.query(`
      UPDATE \`6LWUP_users\` u
      LEFT JOIN \`6LWUP_usermeta\` um ON um.user_id = u.ID AND um.meta_key = 'u_vat_no'
      SET u.role_id = ${privateRoleId}
      WHERE u.role_id = 3
        AND (um.meta_value IS NULL OR TRIM(um.meta_value) = '');
    `);

    console.log(`Updated users to Private Individual role (role_id = ${privateRoleId}):`, updateResult);

    console.log("=== Migration for Private Individual role completed successfully! ===");
    return { success: true, privateRoleId };
  } catch (error) {
    console.error("Error during Private Individual role migration:", error);
    throw error;
  }
}

module.exports = { up };
