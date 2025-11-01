const db = require("../../models");

const GetOrderDetails = async (req, res) => {
  try {
    const { orderId, orderType } = req.body;

    let orderShippingMeta;
    let orderPivot;
    let productId;

    // Fetch order shipping details
    if (orderType === "landing_page") {
      orderShippingMeta = await db.LpOrderShippingOptions.findAll({
        where: {
          lp_order_id: orderId,
        },
      });

      orderPivot = await db.LpOrderPivots.findOne({
        where: {
          order_id: orderId,
        },
      });

      productId = orderPivot.product_id;
    } else if (orderType === "my_store") {
      orderShippingMeta = await db.MyStoreOrderShippingOptions.findAll({
        where: {
          my_store_order_id: orderId,
        },
      });

      orderPivot = await db.MyStoreOrderPivots.findOne({
        where: {
          order_id: orderId,
        },
      });

      productId = orderPivot.product_id;
    } else if (orderType === "api") {
      orderShippingMeta = await db.MyStoreOrderShippingOptions.findAll({
        where: {
          my_store_order_id: orderId,
        },
      });

      orderPivot = await db.MyStoreOrderPivots.findOne({
        where: {
          order_id: orderId,
        },
      });

      productId = orderPivot.product_id;
    }

    // Get product details
    const product = await db.Product.findOne({
      where: {
        id: productId,
      },
    });

    const orderDetails = {};
    orderDetails.order_id = orderId;
    orderDetails.order_type = orderType;

    orderShippingMeta.forEach((o) => {
      const { meta_key, meta_value } = o.dataValues;
      orderDetails[meta_key] = meta_value;
    });

    return res.status(200).json({
      success: true,
      data: {
        product: product,
        orderDetails: orderDetails,
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
