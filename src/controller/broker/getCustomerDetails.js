const db = require("../../models");

const GetCustomerDetails = async (req, res) => {
  try {
    const { orderId, orderType } = req.body;
    const { user } = req.user;

    let commission_data = await db.BrokerCommissionHistory.findOne({
      where: {
        order_id: orderId,
        order_type: orderType,
        user_id: user.ID,
        is_deleted: false,
      },
      raw: true,
    });

    if (!commission_data) {
      return res.status(400).json({
        success: false,
        message: "Commission Data not found"
      })
    }

    let customer = await db.TargetCustomers.findOne({
      where: {
        id: commission_data.customer_id
      },
      raw: true,
    });

    return res.status(200).json({
      success: true,
      data: {
        commission_data,
        customer
      },
    });
  } catch (error) {
    console.error("Error in customer Details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = GetCustomerDetails;
