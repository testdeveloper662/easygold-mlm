const db = require("../../models");

const GetVariableBrokerCommissions = async (req, res) => {
  try {
    const { serviceType } = req.query;

    if (!serviceType || typeof serviceType !== "string" || serviceType.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "serviceType query parameter is required",
      });
    }

    await db.AdminVariableBrokerCommission.sync();

    const brokerCommissions = await db.AdminVariableBrokerCommission.findAll({
      where: {
        service_type: serviceType,
      },
      order: [["level", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Broker variable commission levels fetched successfully",
      data: {
        brokerCommissions: brokerCommissions || [],
      },
    });
  } catch (error) {
    console.error("Error fetching variable broker commissions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = GetVariableBrokerCommissions;

