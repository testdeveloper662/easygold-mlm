const { sequelize } = require("../config/database");

async function migrateAddReferralCodeIdToTargetCustomers() {
  try {
    console.log("Running production migration: add referral_code_id column to target_customers...");

    // 1. Make broker_id NULLABLE
    try {
      await sequelize.query("ALTER TABLE `target_customers` MODIFY `broker_id` INT UNSIGNED NULL;");
      console.log("Updated broker_id column to be NULLABLE.");
    } catch (err) {
      console.warn("Notice updating broker_id column:", err.message);
    }

    // 2. Add referral_code_id column if it does not exist
    try {
      const [cols] = await sequelize.query("SHOW COLUMNS FROM `target_customers` LIKE 'referral_code_id';");
      if (cols.length === 0) {
        await sequelize.query("ALTER TABLE `target_customers` ADD COLUMN `referral_code_id` BIGINT UNSIGNED NULL AFTER `broker_id`;");
        console.log("Successfully added referral_code_id column to target_customers table.");
      } else {
        console.log("Column referral_code_id already exists in target_customers table.");
      }
    } catch (err) {
      console.warn("Error adding referral_code_id column:", err.message);
    }

    // 3. Drop legacy foreign key constraints and columns (referral_id, refer_id) if they exist
    const fkQuery = `
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'target_customers' 
        AND COLUMN_NAME IN ('referral_id', 'refer_id')
        AND REFERENCED_TABLE_NAME IS NOT NULL;
    `;
    try {
      const [fkResults] = await sequelize.query(fkQuery);
      for (const fk of fkResults) {
        try {
          console.log(`Dropping legacy FK constraint ${fk.CONSTRAINT_NAME}...`);
          await sequelize.query(`ALTER TABLE \`target_customers\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\`;`);
        } catch (err) {
          console.warn(`Could not drop FK ${fk.CONSTRAINT_NAME}:`, err.message);
        }
      }
    } catch (err) {
      console.warn("Notice checking legacy FK constraints:", err.message);
    }

    for (const legacyCol of ["referral_id", "refer_id"]) {
      try {
        const [cols] = await sequelize.query(`SHOW COLUMNS FROM \`target_customers\` LIKE '${legacyCol}';`);
        if (cols.length > 0) {
          // Copy any data to referral_code_id first
          await sequelize.query(`UPDATE target_customers SET referral_code_id = ${legacyCol} WHERE referral_code_id IS NULL AND ${legacyCol} IS NOT NULL;`);
          await sequelize.query(`ALTER TABLE \`target_customers\` DROP COLUMN \`${legacyCol}\`;`);
          console.log(`Dropped legacy column '${legacyCol}'.`);
        }
      } catch (err) {
        console.warn(`Notice processing legacy column ${legacyCol}:`, err.message);
      }
    }

    // 4. Backfill user_referrals for any brokers missing a user_referrals entry
    try {
      await sequelize.query(`
        INSERT IGNORE INTO user_referrals (user_id, referral_code, parent_user_id, created_at, updated_at)
        SELECT b.user_id, b.referral_code, pb.user_id, NOW(), NOW()
        FROM brokers b
        LEFT JOIN brokers pb ON b.parent_id = pb.id
        LEFT JOIN user_referrals ur ON b.user_id = ur.user_id
        WHERE ur.id IS NULL AND b.user_id IS NOT NULL;
      `);
    } catch (err) {
      console.warn("Notice backfilling user_referrals for brokers:", err.message);
    }

    // 5. Backfill referral_code_id from broker_id
    try {
      const [resultBroker] = await sequelize.query(`
        UPDATE target_customers tc
        JOIN brokers b ON tc.broker_id = b.id
        JOIN user_referrals ur ON b.user_id = ur.user_id
        SET tc.referral_code_id = ur.id
        WHERE tc.referral_code_id IS NULL;
      `);
      console.log("Backfill result (via broker_id):", resultBroker);
    } catch (err) {
      console.warn("Notice backfilling referral_code_id from broker_id:", err.message);
    }

    // 6. Backfill referral_code_id from referred_by_code
    try {
      const [resultReferredBy] = await sequelize.query(`
        UPDATE target_customers tc
        JOIN user_referrals ur ON tc.referred_by_code = ur.referral_code
        SET tc.referral_code_id = ur.id
        WHERE tc.referral_code_id IS NULL;
      `);
      console.log("Backfill result (via referred_by_code):", resultReferredBy);
    } catch (err) {
      console.warn("Notice backfilling referral_code_id from referred_by_code:", err.message);
    }

    // 7. Backfill customer's OWN referral_code_id for target_customers records from user_referrals
    console.log("Backfilling customer's OWN referral_code_id for target_customers records...");

    const backfillSelfQuery = `
      UPDATE target_customers tc
      JOIN \`6LWUP_users\` u ON LOWER(TRIM(tc.customer_email)) = LOWER(TRIM(u.user_email))
      JOIN user_referrals ur ON u.ID = ur.user_id
      SET tc.referral_code_id = ur.id;
    `;
    const [resultSelf] = await sequelize.query(backfillSelfQuery);
    console.log("Backfill result (customer's own user_referrals ID):", resultSelf);

    const backfillByCodeQuery = `
      UPDATE target_customers tc
      JOIN user_referrals ur ON tc.referral_code = ur.referral_code
      SET tc.referral_code_id = ur.id
      WHERE tc.referral_code_id IS NULL;
    `;
    const [resultByCode] = await sequelize.query(backfillByCodeQuery);
    console.log("Backfill result (via customer's referral_code):", resultByCode);

    console.log("✅ Production migration completed successfully!");
  } catch (error) {
    console.error("❌ Error running migrateAddReferralCodeIdToTargetCustomers:", error);
  }
}

if (require.main === module) {
  migrateAddReferralCodeIdToTargetCustomers().then(() => process.exit(0));
}

module.exports = migrateAddReferralCodeIdToTargetCustomers;
