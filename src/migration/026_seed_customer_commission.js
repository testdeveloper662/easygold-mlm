const db = require("../models");

const migrate = async () => {
    try {
        console.log("🚀 Starting seeding: Admin Fixed Customer Commission...");

        // Ensure the table exists and the schema is updated
        await db.AdminFixedCustomerCommission.sync({ alter: true });

        const serviceTypes = ["GoldFlex", "Easygold Token", "Prime Invest"];
        const percentages = [8, 4, 3, 2, 1]; // Levels 1 to 5

        for (const serviceType of serviceTypes) {
            for (let i = 0; i < percentages.length; i++) {
                const level = i + 1;
                const percentage = percentages[i];

                await db.AdminFixedCustomerCommission.upsert({
                    level: level,
                    service_type: serviceType,
                    percentage: percentage,
                });
            }
        }

        console.log("✅ Admin Fixed Customer Commission seeded successfully.");
    } catch (error) {
        console.error("❌ Error during seeding:", error);
        throw error;
    }
};

module.exports = migrate;
