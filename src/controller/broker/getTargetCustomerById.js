const db = require("../../models");

const GetTargetCustomerById = async (req, res) => {
  try {
    const { user } = req.user;
    const { id } = req.params;

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

    // Get target customer
    const targetCustomer = await db.TargetCustomers.findOne({
      where: {
        id: id,
        broker_id: broker.id, // Ensure broker can only access their own customers
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

