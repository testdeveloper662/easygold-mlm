const db = require("../../models");

const GetOrderDetails = async (req, res) => {
  try {
    const { orderId, orderType } = req.body;

    let orderShippingMeta;
    let orderPivot;
    let order;
    let productId;
    let userId;

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

      order = await db.LpOrders.findOne({
        where: {
          id: orderId,
        },
      });

      userId = order.user_id;
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

      order = await db.MyStoreOrder.findOne({
        where: {
          id: orderId,
        },
      });

      userId = order.user_id;
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

    // Get partner details
    let partner = {};
    const partnerData = await db.Users.findOne({
      where: {
        ID: userId,
      },
    });

    const partnerMeta = await db.UsersMeta.findAll({
      where: {
        user_id: userId,
      },
    });

    partner = {
      display_name: partnerData.display_name,
      user_nicename: partnerData.user_nicename,
      user_street_no: "",
      user_street: "",
      user_location: "",
      user_country: "",
    };

    partnerMeta.forEach((u) => {
      const { meta_key, meta_value } = u.dataValues;

      if (meta_key === "u_street_no") {
        partner.user_street_no = meta_value;
      } else if (meta_key === "u_street") {
        partner.user_street = meta_value;
      } else if (meta_key === "u_location") {
        partner.user_location = meta_value;
      } else if (meta_key === "u_country") {
        partner.user_country = meta_value;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        product: product,
        partner: partner,
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
