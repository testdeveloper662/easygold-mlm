const { sequelize } = require("../config/database");

async function migrateAddReferIdToTargetCustomers() {
  try {
    console.log("Running migration: add refer_id and remove broker_id foreign key constraint on target_customers...");

    // 1. Drop foreign key constraints on target_customers table for broker_id
    const fkQuery = `
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'target_customers' 
        AND COLUMN_NAME = 'broker_id' 
        AND REFERENCED_TABLE_NAME IS NOT NULL;
    `;
    const [fkResults] = await sequelize.query(fkQuery);

    for (const fk of fkResults) {
      try {
        console.log(`Dropping FK constraint ${fk.CONSTRAINT_NAME}...`);
        await sequelize.query(`ALTER TABLE \`target_customers\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\`;`);
        console.log(`Successfully dropped FK constraint ${fk.CONSTRAINT_NAME}`);
      } catch (err) {
        console.warn(`Could not drop FK ${fk.CONSTRAINT_NAME}:`, err.message);
      }
    }

    // 2. Make broker_id NULLABLE
    try {
      await sequelize.query("ALTER TABLE `target_customers` MODIFY `broker_id` INT UNSIGNED NULL;");
      console.log("Updated broker_id column to be NULLABLE.");
    } catch (err) {
      console.warn("Could not modify broker_id column:", err.message);
    }

    // 3. Add refer_id column if it does not exist
    try {
      const [cols] = await sequelize.query("SHOW COLUMNS FROM `target_customers` LIKE 'refer_id';");
      if (cols.length === 0) {
        await sequelize.query("ALTER TABLE `target_customers` ADD COLUMN `refer_id` BIGINT UNSIGNED NULL AFTER `broker_id`;");
        console.log("Successfully added refer_id column to target_customers table.");
      } else {
        console.log("Column refer_id already exists in target_customers table.");
      }
    } catch (err) {
      console.warn("Error adding refer_id column:", err.message);
    }

    // 4. Backfill refer_id for existing target_customers records
    console.log("Backfilling refer_id for existing target_customers records...");
    const backfillQuery = `
      UPDATE target_customers tc
      JOIN brokers b ON tc.broker_id = b.id
      JOIN user_referrals ur ON b.user_id = ur.user_id
      SET tc.refer_id = ur.id
      WHERE tc.refer_id IS NULL;
    `;
    const [result] = await sequelize.query(backfillQuery);
    console.log("Backfill result:", result);

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error running migrateAddReferIdToTargetCustomers:", error);
  }
}

if (require.main === module) {
  migrateAddReferIdToTargetCustomers().then(() => process.exit(0));
}

module.exports = migrateAddReferIdToTargetCustomers;
