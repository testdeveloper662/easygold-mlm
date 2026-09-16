const { Op } = require("sequelize");
const db = require("../models");

async function removeCustomersFromBrokersTable() {
  console.log("=== Removing customers (role_id = 5) from brokers table ===");

  try {
    // 1. Find all users with role_id = 5
    const customers = await db.Users.findAll({
      where: { role_id: 5 },
      attributes: ["ID"],
    });

    const customerIds = customers.map(c => c.ID);
    console.log(`Found ${customerIds.length} user(s) with role_id = 5.`);

    if (customerIds.length === 0) {
      console.log("No customers found to remove.");
      return { processed: 0, deletedCount: 0 };
    }

    // 2. Delete brokers with these user_ids
    const deletedCount = await db.Brokers.destroy({
      where: {
        user_id: {
          [Op.in]: customerIds
        }
      }
    });

    console.log(`Deleted ${deletedCount} broker entry(ies) that belonged to customers.`);
    console.log("=== Migration complete ===");

    return { processed: customerIds.length, deletedCount };
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  }
}

module.exports = removeCustomersFromBrokersTable;

// Allows running this file directly: node src/migration/023_remove_customer_from_brokers_table.js
if (require.main === module) {
  removeCustomersFromBrokersTable()
    .then(() => {
      console.log("[removeCustomersFromBrokersTable] Script complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[removeCustomersFromBrokersTable] Fatal error:", err);
      process.exit(1);
    })
    .finally(() => {
      if (db.sequelize) {
        db.sequelize.close();
      }
    });
}
