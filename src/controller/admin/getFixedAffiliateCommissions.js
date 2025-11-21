const db = require("../../models");

const GetFixedAffiliateCommissions = async (req, res) => {
  try {
    const { serviceType } = req.query;

    if (!serviceType || typeof serviceType !== "string" || serviceType.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "serviceType query parameter is required",
      });
    }

    await db.AdminFixedAffiliateCommission.sync();

    const affiliateCommissions = await db.AdminFixedAffiliateCommission.findAll({
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
    console.error("Error fetching fixed affiliate commissions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = GetFixedAffiliateCommissions;

