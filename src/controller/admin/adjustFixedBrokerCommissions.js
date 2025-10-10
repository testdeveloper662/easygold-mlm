const db = require("../../models");

const AdjustFixedBrokerCommission = async (req, res) => {
  try {
    const { updatedPercentage } = req.body;

    for (const item of updatedPercentage) {
      const { level, percentage } = item;

      await db.AdminFixedBrokerCommission.update(
        { percentage },
        { where: { level } }
      );
    }

    const brokerCommissions = await db.AdminFixedBrokerCommission.findAll({
      order: [["level", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Admin fixed broker commissions updated successfully.",
      data: brokerCommissions,
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = AdjustFixedBrokerCommission;
