const { sequelize } = require("../config/database");

const migrate = async () => {
    try {
        console.log("🚀 Starting migration: Add user_id to broker_payout_requests...");

        // Check if user_id column already exists
        const [columns] = await sequelize.query(`
            SHOW COLUMNS FROM broker_payout_requests LIKE 'user_id'
        `);

        if (columns.length === 0) {
            console.log("⚠️ Column 'user_id' doesn't exist. Creating it now...");
            await sequelize.query(`
                ALTER TABLE broker_payout_requests
                ADD COLUMN user_id BIGINT UNSIGNED NOT NULL DEFAULT 0
                AFTER broker_id
            `);
            console.log("✅ Column 'user_id' created successfully.");
        } else {
            console.log("ℹ️ Column 'user_id' already exists. Skipping creation.");
        }

        console.log("🔄 Backfilling 'user_id' for existing records...");
        
        // Update user_id from brokers table where user_id is 0
        const [result] = await sequelize.query(`
            UPDATE broker_payout_requests bpr
            JOIN brokers b ON bpr.broker_id = b.id
            SET bpr.user_id = b.user_id
            WHERE bpr.user_id = 0;
        `);

        console.log(`✅ Backfill complete. Updated rows: ${result.affectedRows || result.changedRows || "Check database"}`);

        console.log("🎉 Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error during migration:", error);
        process.exit(1);
    }
};

migrate();
