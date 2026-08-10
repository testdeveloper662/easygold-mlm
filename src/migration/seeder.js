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

    console.log("Synchronizing PersonType table...");
    await db.PersonType.sync({ alter: true });
    console.log("PersonType table synchronized successfully.");

    const personTypeCount = await db.PersonType.count();
    if (personTypeCount === 0) {
      console.log("Inserting seed data for PersonTypes (private_individual, company)...");
      await db.PersonType.bulkCreate([
        { value: "private_individual", label_en: "Private Individual", label_de: "Privatperson" },
        { value: "company", label_en: "Company", label_de: "Unternehmen" },
      ]);
    }

    const seedRegistrationEmailTemplate = require("./seed_registration_template");
    await seedRegistrationEmailTemplate();

    const seedPayoutRequestEmailTemplate = require("./seed_payout_request_template");
    await seedPayoutRequestEmailTemplate();

    console.log("Database seeded successfully! 🌱");
  } catch (error) {
    console.error("Error during database seeding:", error);
  }
}

module.exports = seedDatabase;
