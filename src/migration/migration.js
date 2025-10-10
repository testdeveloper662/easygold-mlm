const { sequelize } = require("../config/database");

// Models
const { Users, Brokers, AdminFixedBrokerCommission } = require("../models");

async function createTable() {
  try {
    await Users.sync({ alter: true });
    await Brokers.sync({ alter: true });
    await AdminFixedBrokerCommission.sync({ alter: true });

    console.log("Table created successfully.");
  } catch (error) {
    console.error("Error while creating table:", error);
  } finally {
    sequelize.close();
  }
}

createTable();
