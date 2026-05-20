const db = require("../../models");

const GetCustomerDetails = async (req, res) => {
  try {
    const { orderId, orderType } = req.body;

    if (!orderId || !orderType) {
      return res.status(400).json({
        success: false,
        message: "orderId and orderType are required",
      });
    }

    const normalizedOrderId = String(orderId).trim();

    // 🔹 Get all commission rows
    const commissionRows = await db.BrokerCommissionHistory.findAll({
      where: {
        order_id: normalizedOrderId,
        order_type: orderType,
        is_deleted: false,
      },
      raw: true,
    });

    if (!commissionRows.length) {
      return res.status(404).json({
        success: false,
        message: "Commission Data not found",
      });
    }

    // 🔹 Get unique customer IDs
    const customerIds = [
      ...new Set(
        commissionRows
          .map((item) => item.customer_id)
          .filter(Boolean)
      ),
    ];

    // 🔹 Fetch customers
    const customers = await db.TargetCustomers.findAll({
      where: {
        id: customerIds,
      },
      raw: true,
    });

    // 🔹 Create customer map
    const customerMap = {};
    customers.forEach((customer) => {
      customerMap[customer.id] = customer;
    });

    // 🔹 Attach customer to each commission row
    const result = commissionRows.map((commission) => ({
      ...commission,
      customer: customerMap[commission.customer_id] || null,
    }));

    return res.status(200).json({
      success: true,
      data: result,
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
