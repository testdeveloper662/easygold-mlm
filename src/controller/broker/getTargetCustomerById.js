const db = require("../../models");
const { Op } = require("sequelize");

const GetTargetCustomerById = async (req, res) => {
  try {
    const { user } = req.user;
    const { id } = req.params;

    const userRecord = await db.Users.findOne({ where: { ID: user.ID } });
    const userRefRecord = await db.UserReferrals.findOne({ where: { user_id: user.ID } });
    const broker = await db.Brokers.findOne({ where: { user_id: user.ID } });
    let affiliate = null;
    if (!broker && db.Affiliates) {
      affiliate = await db.Affiliates.findOne({ where: { user_id: user.ID } });
    }

    if (!userRecord && !userRefRecord && !broker && !affiliate) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const referId = userRefRecord ? userRefRecord.id : null;
    const brokerId = broker?.id || affiliate?.id;

    const ownerConditions = [];
    if (referId) {
      ownerConditions.push({ refer_id: referId });
    }
    if (brokerId) {
      ownerConditions.push({ broker_id: brokerId });
    }

    // Get target customer
    const targetCustomer = await db.TargetCustomers.findOne({
      where: {
        id: id,
        ...(ownerConditions.length > 0 ? { [Op.or]: ownerConditions } : {}),
      },
    });

    if (!targetCustomer) {
      return res.status(404).json({
        success: false,
        message: "Target customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Target customer retrieved successfully",
      data: targetCustomer,
    });
  } catch (error) {
    console.error("Error fetching target customer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetTargetCustomerById;
