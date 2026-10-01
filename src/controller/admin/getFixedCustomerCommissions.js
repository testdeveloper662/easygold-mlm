const db = require("../../models");

const GetFixedCustomerCommissions = async (req, res) => {
  try {
    const { serviceType } = req.query;

    // Validate serviceType
    if (!serviceType || typeof serviceType !== "string" || serviceType.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "serviceType query parameter is required",
      });
    }

    await db.AdminFixedCustomerCommission.sync();

    const CustomerCommissions = await db.AdminFixedCustomerCommission.findAll({
      where: {
        service_type: serviceType,
      },
      order: [["level", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Customer fixed commission levels fetched successfully",
      data: {
        customerCommissions: CustomerCommissions || [],
      },
    });
  } catch (error) {
    console.error("Error fetching fixed Customer commissions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = GetFixedCustomerCommissions;
