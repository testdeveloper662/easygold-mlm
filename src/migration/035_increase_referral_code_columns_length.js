const { sequelize } = require("../config/database");

/**
 * Migration 035: Increase column lengths for `referral_code` and `referred_by_code`
 * to VARCHAR(50) in `affiliates`, `brokers`, and `user_referrals`.
 *
 * This allows admin referral codes like 'ROOTPARTNER' (11 characters)
 * and custom/longer codes to be stored without triggering ER_DATA_TOO_LONG.
 */
async function migrateIncreaseReferralCodeColumnsLength() {
  console.log("=== Starting Migration 035: Increase referral_code and referred_by_code column lengths ===");

  const modifyColumn = async (table, column, definition) => {
    try {
      const [tables] = await sequelize.query(`SHOW TABLES LIKE '${table}';`);
      if (tables.length === 0) {
        console.log(`ℹ️ Table \`${table}\` does not exist, skipping.`);
        return;
      }

      const [cols] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}';`);
      if (cols.length === 0) {
        console.log(`ℹ️ Column \`${column}\` does not exist in table \`${table}\`, skipping.`);
        return;
      }

      console.log(`Modifying \`${table}\`.\`${column}\` to ${definition}...`);
      await sequelize.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition};`);
      console.log(`✅ \`${table}\`.\`${column}\` updated successfully.`);
    } catch (err) {
      console.error(`❌ Error modifying \`${table}\`.\`${column}\`:`, err.message);
      throw err;
    }
  };

  try {
    await sequelize.query("SET SESSION sql_mode = '';");

    // 1. affiliates table
    await modifyColumn("affiliates", "referral_code", "VARCHAR(50) NULL DEFAULT NULL");
    await modifyColumn("affiliates", "referred_by_code", "VARCHAR(50) NULL DEFAULT NULL");

    // 2. brokers table
    await modifyColumn("brokers", "referral_code", "VARCHAR(50) NULL DEFAULT NULL");
    await modifyColumn("brokers", "referred_by_code", "VARCHAR(50) NULL DEFAULT NULL");

    // 3. user_referrals table
    await modifyColumn("user_referrals", "referral_code", "VARCHAR(50) NULL DEFAULT NULL");
    await modifyColumn("user_referrals", "referred_by_code", "VARCHAR(50) NULL DEFAULT NULL");

    // 4. target_customers table (defensive check to ensure at least VARCHAR(100))
    await modifyColumn("target_customers", "referral_code", "VARCHAR(100) NULL DEFAULT NULL");
    await modifyColumn("target_customers", "referred_by_code", "VARCHAR(100) NULL DEFAULT NULL");

    console.log("✅ Successfully updated referral_code and referred_by_code column lengths across tables.");
  } catch (error) {
    console.error("❌ Migration 035 failed with error:", error);
    throw error;
  }
}

migrateIncreaseReferralCodeColumnsLength.up = migrateIncreaseReferralCodeColumnsLength;
migrateIncreaseReferralCodeColumnsLength.down = async function () {
  console.log("Down migration not implemented: preserving enlarged column capacity.");
};

module.exports = migrateIncreaseReferralCodeColumnsLength;

