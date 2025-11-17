const db = require("../../models");

const CreateTargetCustomer = async (req, res) => {
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

    const { customer_name, customer_email, interest_in } = req.body;

    // Validate required fields
    if (!customer_name || !customer_email) {
      return res.status(400).json({
        success: false,
        message: "Customer name and email are required",
      });
    }

    // Check if customer email already exists for this broker
    const existingCustomer = await db.TargetCustomers.findOne({
      where: {
        broker_id: broker.id,
        customer_email: customer_email,
      },
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer with this email already exists in your target list",
      });
    }

    // Create target customer
    const targetCustomer = await db.TargetCustomers.create({
      broker_id: broker.id,
      customer_name,
      customer_email,
      interest_in: interest_in || null,
    });

    return res.status(201).json({
      success: true,
      message: "Target customer created successfully",
      data: targetCustomer,
    });
  } catch (error) {
    console.error("Error creating target customer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = CreateTargetCustomer;
