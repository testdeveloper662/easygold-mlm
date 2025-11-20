const db = require("../../models");

const GetVariableAffiliateCommissions = async (req, res) => {
  try {
    const { serviceType } = req.query;

    if (!serviceType || typeof serviceType !== "string" || serviceType.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "serviceType query parameter is required",
      });
    }

    await db.AdminVariableAffiliateCommission.sync();

    const affiliateCommissions = await db.AdminVariableAffiliateCommission.findAll({
      where: {
        service_type: serviceType,
      },
      order: [["level", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      data: {
        affiliateCommissions: affiliateCommissions || [],
      },
    });
  } catch (error) {
    console.error("Error fetching variable affiliate commissions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = GetVariableAffiliateCommissions;

