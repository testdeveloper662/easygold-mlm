const db = require("../../models");

const UpdateBrokerPaymentStatus = async (req, res) => {
  try {
    const { order_id, order_type, tree } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: "order_id is required",
      });
    }

    // Build where clause
    const whereClause = { order_id };
    
    // If order_type is provided, add it to where clause
    if (order_type) {
      whereClause.order_type = order_type;
    }
    
    // If tree is provided, add it to where clause
    if (tree) {
      whereClause.tree = tree;
    }

    // If neither order_type nor tree provided, get order_type from first record
    if (!order_type && !tree) {
      const firstRecord = await db.BrokerCommissionHistory.findOne({
        where: { order_id },
        attributes: ["order_type"],
        raw: true,
      });
      
      if (firstRecord && firstRecord.order_type) {
        whereClause.order_type = firstRecord.order_type;
      }
    }

    // Update payment status to true for all brokers matching the where clause
    const [updatedCount] = await db.BrokerCommissionHistory.update(
      { is_payment_done: true },
      {
        where: whereClause,
      }
    );
    // const updatedCount = 1;
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
