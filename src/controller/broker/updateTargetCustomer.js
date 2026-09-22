const db = require("../../models");
const { Op } = require("sequelize");

const UpdateTargetCustomer = async (req, res) => {
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

    const referralCondition = ownerConditions.length > 0
      ? { [Op.or]: ownerConditions }
      : {};

    // Get target customer
    const targetCustomer = await db.TargetCustomers.findOne({
      where: {
        id: id,
        ...referralCondition,
      },
    });

    if (!targetCustomer) {
      return res.status(404).json({
        success: false,
        message: "Target customer not found",
      });
    }

    const { customer_name, customer_email, interest_in } = req.body;

    // If email is being changed, check if it already exists for this user
    if (customer_email && customer_email !== targetCustomer.customer_email) {
      const existingCustomer = await db.TargetCustomers.findOne({
        where: {
          ...referralCondition,
          customer_email: customer_email,
          id: { [Op.ne]: id }, // Exclude current customer
        },
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: "Customer with this email already exists in your target list",
        });
      }
    }

    // Update target customer
    await targetCustomer.update({
      customer_name: customer_name !== undefined ? customer_name : targetCustomer.customer_name,
      customer_email: customer_email !== undefined ? customer_email : targetCustomer.customer_email,
      interest_in: interest_in !== undefined ? interest_in : targetCustomer.interest_in,
    });

    return res.status(200).json({
      success: true,
      message: "Target customer updated successfully",
      data: targetCustomer,
    });
  } catch (error) {
    console.error("Error updating target customer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = UpdateTargetCustomer;
