const db = require("../../models");

const GetOrderDetails = async (req, res) => {
  try {
    const { orderId, orderType } = req.body;

    let orderShippingMeta = [];
    let orderPivots = [];

    // Fetch order shipping details and pivots
    if (orderType === "landing_page") {
      orderShippingMeta = await db.LpOrderShippingOptions.findAll({
        where: { lp_order_id: orderId },
      });

      orderPivots = await db.LpOrderPivots.findAll({
        where: { order_id: orderId },
      });
    } else if (orderType === "my_store" || orderType === "api") {
      orderShippingMeta = await db.MyStoreOrderShippingOptions.findAll({
        where: { my_store_order_id: orderId },
      });

      orderPivots = await db.MyStoreOrderPivots.findAll({
        where: { order_id: orderId },
      });
    }

    // Collect product IDs from pivots
    const productIds = orderPivots.map((pivot) => pivot.product_id);

    // Get all product details
    const products = await db.Product.findAll({
      where: { id: productIds },
    });

    // Build order details object from shipping meta
    const orderDetails = {
      order_id: orderId,
      order_type: orderType,
    };

    orderShippingMeta.forEach((o) => {
      const { meta_key, meta_value } = o.dataValues;
      orderDetails[meta_key] = meta_value;
    });

    return res.status(200).json({
      success: true,
      data: {
        products,
        orderDetails,
      },
    });
  } catch (error) {
    console.error("Error in Order Details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = GetOrderDetails;
