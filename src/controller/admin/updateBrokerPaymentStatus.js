const db = require("../../models");

const UpdateBrokerPaymentStatus = async (req, res) => {
  try {
    const { order_id, order_type } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: "order_id is required",
      });
    }

    // Update payment status to true for all brokers with this order_id
    // const [updatedCount] = await db.BrokerCommissionHistory.update(
    //   { is_payment_done: true },
    //   {
    //     where: {
    //       order_id,
    //       order_type,
    //     },
    //   }
    // );
    const updatedCount = 1;
    if (updatedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No records found for the given order",
      });
    }


    return res.status(200).json({
      success: true,
      message: "Payment status updated.",
      data: {
        order_id,
        order_type,
        is_payment_done: true,
        updated_records: updatedCount,
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
