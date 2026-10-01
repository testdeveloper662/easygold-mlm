const { sequelize } = require("../config/database");

const migrate = async () => {
    try {
        console.log("🚀 Starting migration: Update target_customers_referral_logs...");

        // 1. Check if user_id column already exists
        const [columns] = await sequelize.query(`
            SHOW COLUMNS FROM target_customers_referral_logs LIKE 'user_id'
        `);

        if (columns.length === 0) {
            console.log("⚠️ Column 'user_id' doesn't exist. Creating it now...");
            await sequelize.query(`
                ALTER TABLE target_customers_referral_logs
                ADD COLUMN user_id INT NULL AFTER broker_id
            `);
            console.log("✅ Column 'user_id' created successfully.");
        } else {
            console.log("ℹ️ Column 'user_id' already exists. Skipping creation.");
        }

        console.log("🔄 Backfilling 'user_id' for existing records...");
        const [result] = await sequelize.query(`
            UPDATE target_customers_referral_logs
            INNER JOIN brokers ON target_customers_referral_logs.broker_id = brokers.id
            SET target_customers_referral_logs.user_id = brokers.user_id
            WHERE target_customers_referral_logs.user_id IS NULL;
        `);
        console.log(`✅ Backfill complete. Updated rows: ${result.affectedRows || result.changedRows || "Check database"}`);

        console.log("🔄 Making broker_id nullable...");
        await sequelize.query(`
            ALTER TABLE target_customers_referral_logs
            MODIFY COLUMN broker_id INT UNSIGNED NULL;
        `);

        console.log("🔄 Making from_customer_id nullable...");
        await sequelize.query(`
            ALTER TABLE target_customers_referral_logs
            MODIFY COLUMN from_customer_id INT NULL;
        `);

        console.log("🎉 Migration completed successfully!");
    } catch (error) {
        console.error("❌ Error during migration:", error);
        throw error;
    }
};

module.exports = migrate;
