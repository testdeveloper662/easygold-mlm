const db = require("../models");

async function seedDatabase() {
  try {
    console.log("Synchronizing Seeder table...");
    // Sync the Seeder model, creating/altering the seeders table in MySQL
    await db.Seeder.sync({ force: true });
    console.log("Seeder table synchronized successfully.");

    console.log("Inserting seed data (admin, broker, affiliate)...");
    await db.Seeder.bulkCreate([
      { user_type: "admin" },
      { user_type: "broker" },
      { user_type: "affiliate" },
    ]);

    console.log("Database seeded successfully! 🌱");
  } catch (error) {
    console.error("Error during database seeding:", error);
  } finally {
    // Close the database connection
    await db.sequelize.close();
  }
}

seedDatabase();
