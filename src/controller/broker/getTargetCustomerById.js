const db = require("../../models");
const { Op } = require("sequelize");

const GetTargetCustomerById = async (req, res) => {
  try {
    const { user } = req.user;
    const { id } = req.params;

    const userRecord = await db.Users.findOne({ where: { ID: user.ID } });
    let userRefRecord = await db.UserReferrals.findOne({ where: { user_id: user.ID } });
    const broker = await db.Brokers.findOne({ where: { user_id: user.ID } });
    let affiliate = null;
    if (!broker && db.Affiliates) {
      affiliate = await db.Affiliates.findOne({ where: { user_id: user.ID } });
    }

    if (!userRefRecord && db.UserReferrals && user.ID) {
      try {
        const refCode = broker?.referral_code || affiliate?.referral_code || null;
        userRefRecord = await db.UserReferrals.create({
          user_id: user.ID,
          referral_code: refCode,
        });
      } catch (err) {
        userRefRecord = await db.UserReferrals.findOne({ where: { user_id: user.ID } });
      }
    }

    if (!userRecord && !userRefRecord && !broker && !affiliate) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const childUserRefs = await db.UserReferrals.findAll({
      where: { parent_user_id: user.ID },
      attributes: ["id"],
      raw: true,
    });

    const referralCodeIds = [];
    if (userRefRecord?.id) {
      referralCodeIds.push(userRefRecord.id);
    }
    if (childUserRefs && childUserRefs.length > 0) {
      childUserRefs.forEach((r) => {
        if (r.id && !referralCodeIds.includes(r.id)) {
          referralCodeIds.push(r.id);
        }
      });
    }

    const brokerId = broker?.id || affiliate?.id;
    const ownerConditions = [];
    if (referralCodeIds.length > 0) {
      ownerConditions.push({ referral_code_id: { [Op.in]: referralCodeIds } });
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
