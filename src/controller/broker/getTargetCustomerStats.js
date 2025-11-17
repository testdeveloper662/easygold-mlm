const db = require("../../models");

const GetTargetCustomerStats = async (req, res) => {
  try {
    const { user } = req.user;

    // Get broker details
    const broker = await db.Brokers.findOne({
      where: { user_id: user.ID },
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    // Get total customers
    const totalCustomers = await db.TargetCustomers.count({
      where: { broker_id: broker.id },
    });

    // Get active customers
    const activeCustomers = await db.TargetCustomers.count({
      where: { broker_id: broker.id, is_active: true },
    });

    // Get customers by status
    const statusCounts = await db.TargetCustomers.findAll({
      where: { broker_id: broker.id },
      attributes: [
        "status",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    // Get customers by interest level
    const interestLevelCounts = await db.TargetCustomers.findAll({
      where: { broker_id: broker.id },
      attributes: [
        "interest_level",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
      ],
      group: ["interest_level"],
      raw: true,
    });

    // Get total estimated value
    const totalEstimatedValue = await db.TargetCustomers.sum("estimated_value", {
      where: { broker_id: broker.id },
    });

    // Get customers added this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const customersThisMonth = await db.TargetCustomers.count({
      where: {
        broker_id: broker.id,
        createdAt: {
          [db.Sequelize.Op.gte]: startOfMonth,
        },
      },
    });

    // Get upcoming followups (next 7 days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const upcomingFollowups = await db.TargetCustomers.count({
      where: {
        broker_id: broker.id,
        next_followup_date: {
          [db.Sequelize.Op.between]: [today, nextWeek],
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

