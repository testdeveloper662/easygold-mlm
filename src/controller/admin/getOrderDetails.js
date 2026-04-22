const db = require("../../models");

const GetOrderDetails = async (req, res) => {
  try {
    const { orderId, orderType } = req.body;

    let order = null;
    let userId = null;

    // ===============================
    // ✅ GOLD ORDER TYPES
    // ===============================
    if (orderType === "gold_purchase") {
      order = await db.GoldPurchaseOrder.findOne({
        where: { id: orderId },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      userId = order.user_id;

      // ✅ GET BROKER COMMISSIONS
      const brokerCommissions = await db.BrokerCommissionHistory.findAll({
        where: {
          order_id: orderId,
          order_type: orderType,
        },
        include: [
          {
            model: db.Users,
            as: "commission_from_user", // ✅ MUST MATCH ASSOCIATION
            attributes: ["ID", "user_email"],
            required: false,
          },
        ],
      });

      const formattedBrokerCommissions = brokerCommissions.map((bc) => {
        const json = bc.toJSON();

        return {
          broker_id: json.broker_id,
          user_id: json.user_id,
          user_email: json.commission_from_user?.user_email || null,

          commission_percent: json.commission_percent,
          commission_amount: json.commission_amount,

          selected_payment_method: json.selected_payment_method,

          is_seller: json.is_seller,
          is_payment_done: json.is_payment_done,
          is_payment_declined: json.is_payment_declined,

          tree: json.tree,
        };
      });

      const totalProfit = brokerCommissions.reduce((sum, bc) => {
        return sum + parseFloat(bc.commission_amount || 0);
      }, 0);

      const paymentMethod = brokerCommissions?.[0]?.selected_payment_method;

      const paymentType =
        paymentMethod === 1
          ? "Bank Transfer"
          : paymentMethod === 2
            ? "Crypto Payment"
            : paymentMethod === 3
              ? "Cash"
              : paymentMethod === 4
                ? "Card"
                : null;

      return res.json({
        success: true,
        data: {
          order_id: order.id,
          order_type: orderType,

          order_amount: order.confirmed_price || 0,
          profit_amount: totalProfit || 0,

          payment_type: paymentType,

          tracking_number: order.tracking_number,
          createdAt: order.created_at,
          updatedAt: order.updated_at,

          broker_commissions: formattedBrokerCommissions || [],
          tree: brokerCommissions?.[0]?.tree || null,

          customer: {
            name: `${order.first_name} ${order.last_name}`,
            email: order.email,
            phone: order.phone,
            address: order.address,
            city: order.city,
            country: order.country,
          },
        },
      });
    }

    if (orderType === "gold_purchase_sell_orders") {
      order = await db.GoldPurchaseSellOrders.findOne({
        where: { id: orderId },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      userId = order.user_id;

      const brokerCommissions = await db.BrokerCommissionHistory.findAll({
        where: {
          order_id: orderId,
          order_type: orderType,
        },
        include: [
          {
            model: db.Users,
            as: "commission_from_user", // ✅ MUST MATCH ASSOCIATION
            attributes: ["ID", "user_email"],
            required: false,
          },
        ],
      });

      const formattedBrokerCommissions = brokerCommissions.map((bc) => {
        const json = bc.toJSON();

        return {
          broker_id: json.broker_id,
          user_id: json.user_id,
          user_email: json.commission_from_user?.user_email || null,

          commission_percent: json.commission_percent,
          commission_amount: json.commission_amount,

          selected_payment_method: json.selected_payment_method,

          is_seller: json.is_seller,
          is_payment_done: json.is_payment_done,
          is_payment_declined: json.is_payment_declined,

          tree: json.tree,
        };
      });

      const totalProfit = brokerCommissions.reduce((sum, bc) => {
        return sum + parseFloat(bc.commission_amount || 0);
      }, 0);

      const paymentMethod = brokerCommissions?.[0]?.selected_payment_method;

      const paymentType =
        paymentMethod === 1
          ? "Bank Transfer"
          : paymentMethod === 2
            ? "Crypto Payment"
            : paymentMethod === 3
              ? "Cash"
              : paymentMethod === 4
                ? "Card"
                : null;

      return res.json({
        success: true,
        data: {
          order_id: order.id,
          order_type: orderType,

          order_amount: order.confirmed_price || order.estimated_value || 0,
          profit_amount: totalProfit || 0,

          payment_type: paymentType,

          tracking_number: order.tracking_number,
          createdAt: order.created_at,
          updatedAt: order.updated_at,

          broker_commissions: formattedBrokerCommissions || [],
          tree: brokerCommissions?.[0]?.tree || null,

          customer: {
            name: `${order.first_name || ""} ${order.last_name || ""}`,
            email: order.email,
            phone: order.phone,
            address: order.address,
            city: order.city,
          },
        },
      });
    }

    let orderShippingMeta = [];
    let orderPivots = [];

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
