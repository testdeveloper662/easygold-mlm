const db = require("../../models");

const UpdateUserStatus = async (req, res) => {
  try {
    const { user_id, broker_id, affiliate_id, status } = req.body;

    if (status === undefined) {
      return res.status(400).json({
        success: false,
        message: "status is required",
      });
    }

    let statusVal;
    if (status === "activated" || status === "activate" || status === 0 || status === "0") {
      statusVal = 0;
    } else if (status === "deactivated" || status === "deactivate" || status === 1 || status === "1") {
      statusVal = 1;
    } else if (status === "pending" || status === 2 || status === "2") {
      statusVal = 2;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Must be 0 (activated), 1 (deactivated), or 2 (pending)",
      });
    }

    let targetUserId = user_id;

    if (!targetUserId && broker_id) {
      const broker = await db.Brokers.findOne({ where: { id: broker_id } });
      if (broker) {
        targetUserId = broker.user_id;
      }
    }

    if (!targetUserId && affiliate_id) {
      if (db.Affiliates) {
        const affiliate = await db.Affiliates.findOne({ where: { id: affiliate_id } });
        if (affiliate) {
          targetUserId = affiliate.user_id;
        }
      }
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Could not find a valid user_id to update status",
      });
    }

    const userRecord = await db.Users.findByPk(targetUserId);
    if (!userRecord) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await userRecord.update({ user_status: statusVal });

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: {
        user_id: targetUserId,
        user_status: statusVal,
      },
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = UpdateUserStatus;
