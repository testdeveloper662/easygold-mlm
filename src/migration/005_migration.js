const { sequelize } = require("../config/database");

// Models
const {
  Users,
  Brokers,
  Affiliates,
  AffiliateInvitations,
  AdminFixedBrokerCommission,
  BrokerBankDetails,
  BrokerPayoutRequests,
  TargetCustomers,
  BrokerInvitations,
  AffiliateBanners,
  AdminContracts,
  TargetCustomerReferralLogs,
  MarketingMaterial
} = require("../models");

async function createTable() {
  try {
    // await Users.sync({ alter: true });
    // await Brokers.sync({ alter: true });
    try {
      await sequelize.query("ALTER TABLE `affiliates` DROP FOREIGN KEY `affiliates_ibfk_4`;");
      console.log("Successfully dropped foreign key constraint affiliates_ibfk_4.");
    } catch (fkErr) {
      // Ignore if constraint doesn't exist
    }
    await Affiliates.sync({ alter: true });
    await AffiliateInvitations.sync({ alter: true });
    // await AdminFixedBrokerCommission.sync({ alter: true });
    // await AdminFixedBrokerCommission.sync({ alter: true });
    // await BrokerBankDetails.sync({ alter: true });
    // await BrokerPayoutRequests.sync({ alter: true });
    // await TargetCustomers.sync({ alter: true });
    // await BrokerInvitations.sync({ alter: true });
    // await AffiliateBanners.sync({ alter: true });
    // await AdminContracts.sync({ alter: true });
    // await TargetCustomerReferralLogs.sync({ alter: true });
    await MarketingMaterial.sync({ alter: true });

    console.log("Table created successfully.");
  } catch (error) {
    console.error("Error while creating table:", error);
  }
}

module.exports = createTable;
