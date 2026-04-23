// const db = require("../../models");

// const GetOrderDetails = async (req, res) => {
//   try {
//     const { orderId, orderType } = req.body;

//     let orderShippingMeta = [];
//     let orderPivots = [];
//     let orderData = {};

//     // Fetch order shipping details and pivots
//     if (orderType === "landing_page") {
//       orderData = await db.LpOrders.findOne({
//         where: { id: orderId },
//       });
//       orderShippingMeta = await db.LpOrderShippingOptions.findAll({
//         where: { lp_order_id: orderId },
//       });

//       orderPivots = await db.LpOrderPivots.findAll({
//         where: { order_id: orderId },
//       });
//     } else if (orderType === "my_store" || orderType === "api") {
//       orderShippingMeta = await db.MyStoreOrderShippingOptions.findAll({
//         where: { my_store_order_id: orderId },
//       });

//       orderPivots = await db.MyStoreOrderPivots.findAll({
//         where: { order_id: orderId },
//       });
//     }

//     // Collect product IDs from pivots
//     const productIds = orderPivots.map((pivot) => pivot.product_id);

//     // Get all product details
//     const products = await db.Product.findAll({
//       where: { id: productIds },
//     });

//     // Combine product + pivot info
//     const productsDetails = orderPivots.map((pivot) => {
//       const product = products.find((p) => p.id === pivot.product_id);
//       return {
//         ...product?.dataValues,
//         quantity: pivot.quantity || 1,
//       };
//     });

//     // Build order details object from shipping meta
//     const orderDetails = {
//       order_id: orderId,
//       order_type: orderType,
//       seller_id: orderData?.user_id
//     };

//     orderShippingMeta.forEach((o) => {
//       const { meta_key, meta_value } = o.dataValues;
//       orderDetails[meta_key] = meta_value;
//     });
//     orderPivots.forEach((o) => {
//       const { quantity } = o.dataValues;
//       orderDetails["quantity"] = quantity;
//     });

//     return res.status(200).json({
//       success: true,
//       data: {
//         products: productsDetails,
//         orderDetails,
//       },
//     });
//   } catch (error) {
//     console.error("Error in Order Details:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error.",
//     });
//   }
// };

// module.exports = GetOrderDetails;
const db = require("../../models");

const GetOrderDetails = async (req, res) => {
  try {
    const { orderId, orderType } = req.body;

    let order = null;
    let orderShippingMeta = [];
    let orderPivots = [];
    let userId = null;

    const isGoldType = [
      "gold_purchase",
      "gold_purchase_sell_orders",
      "goldflex",
      "easygoldtoken",
      "primeinvest",
    ].includes(orderType);

    // ===============================
    // ✅ GOLD TYPES
    // ===============================
    if (isGoldType) {
      if (orderType === "gold_purchase") {
        order = await db.GoldPurchaseOrder.findOne({ where: { id: orderId } });
      } else if (orderType === "gold_purchase_sell_orders") {
        order = await db.GoldPurchaseSellOrders.findOne({
          where: { id: orderId },
        });
      } else {
        // goldflex / easygoldtoken / primeinvest
        order = await db.BrokerCommissionHistory.findOne({
          where: { order_id: orderId },
        });
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      userId = order.user_id;

      // ✅ Broker commissions
      const brokerCommissions = await db.BrokerCommissionHistory.findAll({
        where: { order_id: orderId },
        include: [
          {
            model: db.Users,
            as: "commission_from_user",
            attributes: ["ID", "user_email"],
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
          is_seller: json.is_seller,
          is_payment_done: json.is_payment_done,
          is_payment_declined: json.is_payment_declined,
          tree: json.tree,
        };
      });

      const totalProfit = brokerCommissions.reduce(
        (sum, bc) => sum + parseFloat(bc.commission_amount || 0),
        0
      );

      return res.json({
        success: true,
        data: {
          order_id: orderId,
          order_type: orderType,
          order_amount:
            order.confirmed_price || order.estimated_value || order.order_amount || 0,
          profit_amount: totalProfit,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
          broker_commissions: formattedBrokerCommissions,
          tree: brokerCommissions?.[0]?.tree || null,

          customer: {
            name: `${order.first_name || ""} ${order.last_name || ""}`,
            email: order.email,
            phone: order.phone,
            address: order.address,
            city: order.city,
            country: order.country,
          },
        },
      });
    }

    // ===============================
    // ✅ NORMAL TYPES
    // ===============================
    if (orderType === "landing_page") {
      order = await db.LpOrders.findOne({ where: { id: orderId } });
      orderShippingMeta = await db.LpOrderShippingOptions.findAll({
        where: { lp_order_id: orderId },
      });
      orderPivots = await db.LpOrderPivots.findAll({
        where: { order_id: orderId },
      });
    } else if (orderType === "my_store" || orderType === "api") {
      order = await db.MyStoreOrder.findOne({ where: { id: orderId } });
      orderShippingMeta = await db.MyStoreOrderShippingOptions.findAll({
        where: { my_store_order_id: orderId },
      });
      orderPivots = await db.MyStoreOrderPivots.findAll({
        where: { order_id: orderId },
      });
    }

    userId = order?.user_id;

    // Products
    const productIds = orderPivots.map((p) => p.product_id);
    const productsData = await db.Product.findAll({
      where: { id: productIds },
    });

    const products = orderPivots.map((pivot) => {
      const product = productsData.find((p) => p.id === pivot.product_id);
      return {
        ...product?.dataValues,
        quantity: pivot.quantity || 1,
        price: pivot.price || product?.price || 0,
      };
    });

    // Order details
    const orderDetails = {
      order_id: orderId,
      order_type: orderType,
    };

    orderShippingMeta.forEach((o) => {
      const { meta_key, meta_value } = o.dataValues;
      orderDetails[meta_key] = meta_value;
    });

    // Partner
    const partnerData = await db.Users.findOne({
      where: { ID: userId },
    });

    return res.status(200).json({
      success: true,
      data: {
        products,
        orderDetails,
        partner: {
          name: partnerData?.display_name || "-",
          email: partnerData?.user_email || "-",
        },
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