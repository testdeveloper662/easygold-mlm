const { sequelize } = require("../config/database");

// Models
const {
  Users,
  Brokers,
  AdminFixedBrokerCommission,
  BrokerBankDetails,
  BrokerPayoutRequests,
  TargetCustomers,
  BrokerInvitations,
} = require("../models");

async function createTable() {
  try {
    // await Users.sync({ alter: true });
    await Brokers.sync({ alter: true });
    // await AdminFixedBrokerCommission.sync({ alter: true });
    // await BrokerBankDetails.sync({ alter: true });
    // await BrokerPayoutRequests.sync({ alter: true });
    // await TargetCustomers.sync({ alter: true });
    await BrokerInvitations.sync({ alter: true });

    console.log("Table created successfully.");
  } catch (error) {
    console.error("Error while creating table:", error);
  } finally {
    sequelize.close();
  }
}

createTable();
