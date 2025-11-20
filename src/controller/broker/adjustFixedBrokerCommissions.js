const db = require("../../models");

const AdjustFixedBrokerCommission = async (req, res) => {
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

    await db.AdminFixedBrokerCommission.sync();
    
    // Fix constraint: drop old unique on 'level', add composite (level, service_type)
    try {
      await db.sequelize.query(`ALTER TABLE admin_fixed_broker_commission DROP INDEX level`);
    } catch (e) {}
    try {
      await db.sequelize.query(`ALTER TABLE admin_fixed_broker_commission ADD UNIQUE KEY unique_level_service_type (level, service_type)`);
    } catch (e) {}

    // Update or create each commission level for this specific serviceType
    for (const item of updatedPercentage) {
      const { level, percentage } = item;

      if (!level || percentage === undefined || percentage === null) {
        continue; // Skip invalid entries
      }

      // Use findOrCreate to insert if not exists, or update if exists
      // Filter by both level AND service_type
      const [record, created] = await db.AdminFixedBrokerCommission.findOrCreate({
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
    const brokerCommissions = await db.AdminFixedBrokerCommission.findAll({
      where: {
        service_type: serviceType,
      },
      order: [["level", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Broker fixed commissions updated successfully.",
      data: {
        brokerCommissions: brokerCommissions || [],
      },
    });
  } catch (error) {
    console.error("Error updating fixed broker commissions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = AdjustFixedBrokerCommission;

