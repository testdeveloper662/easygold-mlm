const db = require("../../models");
const { Op } = require("sequelize");

const DeleteTargetCustomer = async (req, res) => {
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

    // Get target customer
    const targetCustomer = await db.TargetCustomers.findOne({
      where: {
        id: id,
        ...(referralCodeIds.length > 0
          ? { referral_code_id: { [Op.in]: referralCodeIds } }
          : { referral_code_id: null }),
      },
    });

    if (!targetCustomer) {
      return res.status(404).json({
        success: false,
        message: "Target customer not found",
      });
    }

    // Delete target customer
    await targetCustomer.destroy();

    return res.status(200).json({
      success: true,
      message: "Target customer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting target customer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = DeleteTargetCustomer;
