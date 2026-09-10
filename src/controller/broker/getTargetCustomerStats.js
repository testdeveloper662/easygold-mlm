const db = require("../../models");
const { Op } = require("sequelize");

const GetTargetCustomerStats = async (req, res) => {
  try {
    const { user } = req.user;

    const targetUserId = (user.role === "SUPER_ADMIN" && req.query.viewUserId)
      ? parseInt(req.query.viewUserId)
      : user.ID;

    const userRecord = await db.Users.findOne({ where: { ID: targetUserId } });
    let userRefRecord = await db.UserReferrals.findOne({ where: { user_id: targetUserId } });
    const broker = await db.Brokers.findOne({ where: { user_id: targetUserId } });
    let affiliate = null;
    if (!broker && db.Affiliates) {
      affiliate = await db.Affiliates.findOne({ where: { user_id: targetUserId } });
    }

    // Auto-create UserReferrals if missing for existing user
    if (!userRefRecord && db.UserReferrals && targetUserId) {
      try {
        const refCode = broker?.referral_code || affiliate?.referral_code || null;
        userRefRecord = await db.UserReferrals.create({
          user_id: targetUserId,
          referral_code: refCode,
        });
      } catch (err) {
        userRefRecord = await db.UserReferrals.findOne({ where: { user_id: targetUserId } });
      }
    }

    if (!userRecord && !userRefRecord && !broker && !affiliate) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const childUserRefs = await db.UserReferrals.findAll({
      where: { parent_user_id: targetUserId },
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

    const whereClause = ownerConditions.length > 0 ? { [Op.or]: ownerConditions } : {};

    // Get total customers
    const totalCustomers = await db.TargetCustomers.count({
      where: whereClause,
    });

    // Get active customers
    const activeCustomers = await db.TargetCustomers.count({
      where: { ...whereClause, is_active: true },
    });

    // Get customers by status
    const statusCounts = await db.TargetCustomers.findAll({
      where: whereClause,
      attributes: [
        "status",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    // Get customers by interest level
    const interestLevelCounts = await db.TargetCustomers.findAll({
      where: whereClause,
      attributes: [
        "interest_level",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
      ],
      group: ["interest_level"],
      raw: true,
    });

    // Get total estimated value
    const totalEstimatedValue = await db.TargetCustomers.sum("estimated_value", {
      where: whereClause,
    });

    // Get customers added this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const customersThisMonth = await db.TargetCustomers.count({
      where: {
        ...whereClause,
        createdAt: {
          [Op.gte]: startOfMonth,
        },
      },
    });

    // Get upcoming followups (next 7 days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const upcomingFollowups = await db.TargetCustomers.count({
      where: {
        ...whereClause,
        next_followup_date: {
          [Op.between]: [today, nextWeek],
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Target customer statistics retrieved successfully",
      data: {
        total_customers: totalCustomers,
        active_customers: activeCustomers,
        inactive_customers: totalCustomers - activeCustomers,
        status_breakdown: statusCounts,
        interest_level_breakdown: interestLevelCounts,
        total_estimated_value: totalEstimatedValue || 0,
        customers_added_this_month: customersThisMonth,
        upcoming_followups: upcomingFollowups,
      },
    });
  } catch (error) {
    console.error("Error fetching target customer stats:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetTargetCustomerStats;
