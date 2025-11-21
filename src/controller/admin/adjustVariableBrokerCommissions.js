const db = require("../../models");

const AdjustVariableBrokerCommission = async (req, res) => {
  try {
    const { serviceType, updatedPercentage } = req.body;

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

    await db.AdminVariableBrokerCommission.sync();
    
    try {
      await db.sequelize.query(`ALTER TABLE admin_variable_broker_commission DROP INDEX level`);
    } catch (e) {}
    try {
      await db.sequelize.query(`ALTER TABLE admin_variable_broker_commission ADD UNIQUE KEY unique_level_service_type (level, service_type)`);
    } catch (e) {}

    for (const item of updatedPercentage) {
      const { level, percentage } = item;

      if (!level || percentage === undefined || percentage === null) {
        continue;
      }

      const [record, created] = await db.AdminVariableBrokerCommission.findOrCreate({
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

    const brokerCommissions = await db.AdminVariableBrokerCommission.findAll({
      where: {
        service_type: serviceType,
      },
      order: [["level", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Broker variable commissions updated successfully.",
      data: {
        brokerCommissions: brokerCommissions || [],
      },
    });
  } catch (error) {
    console.error("Error updating variable broker commissions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = AdjustVariableBrokerCommission;

