const db = require("../../models");

const GetOrderDetails = async (req, res) => {
  try {
    const { orderId, orderType } = req.body;

    let orderShippingMeta = [];
    let orderPivots = [];
    let order = null;
    let userId = null;

    // Fetch order shipping details, pivots, and order info based on type
    if (orderType === "landing_page") {
      orderShippingMeta = await db.LpOrderShippingOptions.findAll({
        where: { lp_order_id: orderId },
      });

      orderPivots = await db.LpOrderPivots.findAll({
        where: { order_id: orderId },
      });

      order = await db.LpOrders.findOne({
        where: { id: orderId },
      });

      userId = order?.user_id;
    } else if (orderType === "my_store" || orderType === "api") {
      orderShippingMeta = await db.MyStoreOrderShippingOptions.findAll({
        where: { my_store_order_id: orderId },
      });

      orderPivots = await db.MyStoreOrderPivots.findAll({
        where: { order_id: orderId },
      });

      order = await db.MyStoreOrder.findOne({
        where: { id: orderId },
      });

      userId = order?.user_id;
    }

    // Collect product IDs
    const productIds = orderPivots.map((pivot) => pivot.product_id);

    // Fetch all product details
    const productsData = await db.Product.findAll({
      where: { id: productIds },
    });

    // Combine product + pivot info
    const products = orderPivots.map((pivot) => {
      const product = productsData.find((p) => p.id === pivot.product_id);
      return {
        ...product?.dataValues,
        quantity: pivot.quantity || 1,
        price: pivot.price || product?.dataValues?.price || 0,
      };
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

    // Get partner details
    let partner = {};
    const partnerData = await db.Users.findOne({
      where: { ID: userId },
    });

    const partnerMeta = await db.UsersMeta.findAll({
      where: { user_id: userId },
    });

    partner = {
      display_name: partnerData?.display_name || "-",
      user_nicename: partnerData?.user_nicename || "-",
      user_street_no: "",
      user_street: "",
      user_location: "",
      user_country: "",
    };

    partnerMeta.forEach((u) => {
      const { meta_key, meta_value } = u.dataValues;
      if (meta_key === "u_street_no") partner.user_street_no = meta_value;
      else if (meta_key === "u_street") partner.user_street = meta_value;
      else if (meta_key === "u_location") partner.user_location = meta_value;
      else if (meta_key === "u_country") partner.user_country = meta_value;
    });

    return res.status(200).json({
      success: true,
      data: {
        products,
        partner,
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
