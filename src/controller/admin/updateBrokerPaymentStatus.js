const db = require("../../models");

const UpdateBrokerPaymentStatus = async (req, res) => {
  try {
    const { order_id, broker_id } = req.body;

    if (!order_id || !broker_id) {
      return res.status(400).json({
        success: false,
        message: "order_id and broker_id are required",
      });
    }

    // Update payment status to true for that broker and order
    const [updatedCount] = await db.BrokerCommissionHistory.update(
      { is_payment_done: true },
      {
        where: {
          order_id,
          broker_id,
        },
      }
    );

    if (updatedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No record found for given order_id and broker_id",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Broker payment status updated successfully.",
      data: {
        order_id,
        broker_id,
        is_payment_done: true,
      },
    });
  } catch (error) {
    console.error("Error updating broker payment status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = UpdateBrokerPaymentStatus;
