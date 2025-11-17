const db = require("../../models");

const UpdateTargetCustomer = async (req, res) => {
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
        broker_id: broker.id, // Ensure broker can only update their own customers
      },
    });

    if (!targetCustomer) {
      return res.status(404).json({
        success: false,
        message: "Target customer not found",
      });
    }

    const { customer_name, customer_email, interest_in } = req.body;

    // If email is being changed, check if it already exists for this broker
    if (customer_email && customer_email !== targetCustomer.customer_email) {
      const existingCustomer = await db.TargetCustomers.findOne({
        where: {
          broker_id: broker.id,
          customer_email: customer_email,
          id: { [db.Sequelize.Op.ne]: id }, // Exclude current customer
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
