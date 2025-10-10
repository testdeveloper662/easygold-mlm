const db = require("../../models");

const GetFixedBrokerCommissions = async (req, res) => {
  try {
    const brokerCommissions = await db.AdminFixedBrokerCommission.findAll({
      order: [["level", "ASC"]],
    });

    if (!brokerCommissions.length) {
      return res.status(400).json({
        success: false,
        message: "Broker commission levels are missing",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin fixed broker commission levels",
      data: {
        brokerCommissions,
      },
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = GetFixedBrokerCommissions;
