const db = require("../../models");
const { Op } = require("sequelize");

const GetTargetCustomers = async (req, res) => {
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

    // Get pagination and filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    // Build where clause
    const whereClause = {
      broker_id: broker.id,
    };

    // Add search filter
    if (search) {
      whereClause[Op.or] = [
        { customer_name: { [Op.like]: `%${search}%` } },
        { customer_email: { [Op.like]: `%${search}%` } },
      ];
    }

    // Get total count
    const totalCount = await db.TargetCustomers.count({
      where: whereClause,
    });

    // Get paginated target customers
    const targetCustomers = await db.TargetCustomers.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset,
    });

    return res.status(200).json({
      success: true,
      message: "Target customers retrieved successfully",
      data: {
        customers: targetCustomers,
        total: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limit: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching target customers:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetTargetCustomers;
