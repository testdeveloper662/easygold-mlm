const db = require("../../models");

const DeleteTargetCustomer = async (req, res) => {
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
        broker_id: broker.id, // Ensure broker can only delete their own customers
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

