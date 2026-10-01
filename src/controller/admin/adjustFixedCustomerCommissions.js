const db = require("../../models");

const AdjustFixedCustomerCommission = async (req, res) => {
  try {
    const { serviceType, updatedPercentage } = req.body;

    // Validate serviceType
    if (!serviceType || typeof serviceType !== "string" || serviceType.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "serviceType is required",
      });
    }

    if (!updatedPercentage || !Array.isArray(updatedPercentage) || updatedPercentage.length === 0) {
      return res.status(400).json({
        success: false,
        message: "updatedPercentage array is required",
      });
    }

    await db.AdminFixedCustomerCommission.sync();
    
    try {
      await db.sequelize.query(`ALTER TABLE admin_fixed_customer_commission DROP INDEX level`);
    } catch (e) {}
    try {
      await db.sequelize.query(`ALTER TABLE admin_fixed_customer_commission ADD UNIQUE KEY unique_level_service_type_customer (level, service_type)`);
    } catch (e) {}

    for (const item of updatedPercentage) {
      const { level, percentage } = item;

      if (!level || percentage === undefined || percentage === null) {
        continue;
      }

      const [record, created] = await db.AdminFixedCustomerCommission.findOrCreate({
        where: { 
          level,
          service_type: serviceType,
        },
        defaults: { 
          percentage,
          service_type: serviceType,
        },
      });
      
      if (!created) {
        await record.update({ percentage });
      }
    }

    // Fetch only commission levels for this specific serviceType
    const CustomerCommissions = await db.AdminFixedCustomerCommission.findAll({
      where: {
        service_type: serviceType,
      },
      order: [["level", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Customer fixed commissions updated successfully.",
      data: {
        customerCommissions: CustomerCommissions || [],
      },
    });
  } catch (error) {
    console.error("Error updating fixed Customer commissions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = AdjustFixedCustomerCommission;
