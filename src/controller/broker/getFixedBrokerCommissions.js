const db = require("../../models");

const GetFixedBrokerCommissions = async (req, res) => {
  try {
    const { serviceType } = req.query;

    // Validate serviceType
    if (!serviceType || typeof serviceType !== "string" || serviceType.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "serviceType query parameter is required",
      });
    }

    await db.AdminFixedBrokerCommission.sync();

    // Fetch only commission levels for this specific serviceType
    const brokerCommissions = await db.AdminFixedBrokerCommission.findAll({
      where: {
        service_type: serviceType,
      },
      order: [["level", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Broker fixed commission levels fetched successfully",
      data: {
        brokerCommissions: brokerCommissions || [],
      },
    });
  } catch (error) {
    console.error("Error fetching fixed broker commissions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = GetFixedBrokerCommissions;

