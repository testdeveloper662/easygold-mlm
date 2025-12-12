const db = require("../../models");
const { Op } = require("sequelize");

const GetBrokerCommissionHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "user id is required",
      });
    }

    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const isSellerFilter = req.query.is_seller !== undefined
      ? req.query.is_seller === "true"
      : null;

    // const whereClause = {
    //   user_id: id,
    //   [Op.or]: [
    //     { is_seller: true },
    //     {
    //       [Op.and]: [{ is_seller: false }, { is_payment_done: true }],
    //     },
    //   ],
    // };

    let whereClause;

    if (isSellerFilter === true) {
      whereClause = {
        user_id: id,
        is_seller: true,
        selected_payment_method: 1
      };
    } else {
      whereClause = {
        user_id: id,
        [Op.or]: [
          // Seller logic
          {
            is_seller: true,
            [Op.or]: [
              { selected_payment_method: 1 }, // seller + method 1 (always show)
              {
                [Op.and]: [
                  { selected_payment_method: 2 },
                  { is_payment_done: true }, // seller + method 2 only if payment done
                ],
              },
            ],
          },

          // Non Seller logic
          {
            is_seller: false,
            [Op.or]: [
              {
                [Op.and]: [
                  { selected_payment_method: 1 },
                  { is_payment_done: true }, // *** NEW: must be payment done ***
                ],
              },
              {
                [Op.and]: [
                  { selected_payment_method: 2 }, // method 2 only if payment done
                  { is_payment_done: true },
                ],
              },
            ],
          },
        ],
      };
    }

    // Get total count
    const totalCount = await db.BrokerCommissionHistory.count({
      where: whereClause,
    });

    // Fetch paginated commission history ordered from latest to oldest
    const history = await db.BrokerCommissionHistory.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset,
    });

    // Enrich with seller info and order details
    // 1) Seller info (user_nicename and user_login) from Users table
    const userIds = [...new Set(history.map((h) => h.user_id))];

    let usersMap = {};
    if (userIds.length) {
      const users = await db.Users.findAll({
        where: { ID: { [Op.in]: userIds } },
        attributes: ["ID", "user_nicename", "user_login"],
        raw: true,
      });

      usersMap = users.reduce((acc, u) => {
        acc[u.ID] = {
          user_nicename: u.user_nicename || null,
          user_login: u.user_login || null,
        };
        return acc;
      }, {});
    }

    // 2) Order details by order_type → fetch from respective tables
    const myStoreOrderIds = history
      .filter((h) => h.order_type === "my_store")
      .map((h) => h.order_id);
    const apiOrderIds = history
      .filter((h) => h.order_type === "api")
      .map((h) => h.order_id);
    const lpOrderIds = history
      .filter((h) => h.order_type === "landing_page" || h.order_type === "lp_order")
      .map((h) => h.order_id);

    const goldPuracheIds = history
      .filter((h) => h.order_type === "gold_purchase")
      .map((h) => h.order_id);

    const goldPuracheSellOrdersIds = history
      .filter((h) => h.order_type === "gold_purchase_sell_orders")
      .map((h) => h.order_id);

    let myStoreOrderMap = {};
    if (myStoreOrderIds.length) {
      const myStoreOrders = await db.MyStoreOrder.findAll({
        where: { id: { [Op.in]: myStoreOrderIds } },
        raw: true,
      });
      myStoreOrderMap = myStoreOrders.reduce((acc, o) => {
        acc[o.id] = o;
        return acc;
      }, {});
    }

    // Note: API orders are stored in MyStoreOrder in this schema
    let apiOrderMap = {};
    if (apiOrderIds.length) {
      const apiOrders = await db.MyStoreOrder.findAll({
        where: { id: { [Op.in]: apiOrderIds } },
        raw: true,
      });
      apiOrderMap = apiOrders.reduce((acc, o) => {
        acc[o.id] = o;
        return acc;
      }, {});
    }

    let lpOrderMap = {};
    if (lpOrderIds.length) {
      const lpOrders = await db.LpOrders.findAll({
        where: { id: { [Op.in]: lpOrderIds } },
        raw: true,
      });
      lpOrderMap = lpOrders.reduce((acc, o) => {
        acc[o.id] = o;
        return acc;
      }, {});
    }

    let goldPurchaseOrderMap = {};
    if (goldPuracheIds.length) {
      const goldPurchaseOrders = await db.GoldPurchaseOrder.findAll({
        where: { id: { [Op.in]: goldPuracheIds } },
        raw: true,
      });
      goldPurchaseOrderMap = goldPurchaseOrders.reduce((acc, o) => {
        acc[o.id] = o;
        return acc;
      }, {});
    }

    let goldPurchaseSellOrderMap = {};
    if (goldPuracheSellOrdersIds.length) {
      const goldPurchaseSellOrders = await db.GoldPurchaseSellOrders.findAll({
        where: { id: { [Op.in]: goldPuracheSellOrdersIds } },
        raw: true,
      });
      goldPurchaseSellOrderMap = goldPurchaseSellOrders.reduce((acc, o) => {
        acc[o.id] = o;
        return acc;
      }, {});
    }

    // Collect user_ids from fetched orders to resolve user_login
    const orderUserIds = new Set();
    Object.values(myStoreOrderMap).forEach((o) => o?.user_id && orderUserIds.add(o.user_id));
    Object.values(apiOrderMap).forEach((o) => o?.user_id && orderUserIds.add(o.user_id));
    Object.values(lpOrderMap).forEach((o) => o?.user_id && orderUserIds.add(o.user_id));
    Object.values(goldPurchaseOrderMap).forEach((o) => o?.user_id && orderUserIds.add(o.user_id));
    Object.values(goldPurchaseSellOrderMap).forEach((o) => o?.user_id && orderUserIds.add(o.user_id));

    let orderUsersMap = {};
    if (orderUserIds.size) {
      const users = await db.Users.findAll({
        where: { ID: { [Op.in]: Array.from(orderUserIds) } },
        attributes: ["ID", "user_login"],
        raw: true,
      });
      orderUsersMap = users.reduce((acc, u) => {
        acc[u.ID] = u.user_login || "Unknown";
        return acc;
      }, {});
    }

    const enrichedHistory = history.map((item) => {
      const json = item.toJSON();
      const sellerInfo = usersMap[item.user_id] || {};

      let order_details = null;
      if (json.order_type === "my_store" || json.order_type === "api") {
        // differentiate maps for lookup, both fallback to respective map
        order_details =
          (json.order_type === "my_store"
            ? myStoreOrderMap[json.order_id]
            : apiOrderMap[json.order_id]) || null;
      } else if (json.order_type === "landing_page" || json.order_type === "lp_order") {
        order_details = lpOrderMap[json.order_id] || null;
      } else if (json.order_type === "gold_purchase") {
        order_details = goldPurchaseOrderMap[json.order_id] || null;
      } else if (json.order_type === "gold_purchase_sell_orders") {
        order_details = goldPurchaseSellOrderMap[json.order_id] || null;
      }

      const relatedUserLogin = order_details?.user_id
        ? orderUsersMap[order_details.user_id] || "Unknown"
        : "Unknown";

      return {
        ...json,
        seller_name: sellerInfo.user_nicename || null,
        seller_username: sellerInfo.user_login || null,
        user_login: relatedUserLogin,
        order_details,
        payment_type:
          json.selected_payment_method === 1
            ? "Bank Transfer"
            : json.selected_payment_method === 2
              ? "Crypto Payment"
              : null,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Broker commission history fetched successfully.",
      data: enrichedHistory || [],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching broker commission history:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = GetBrokerCommissionHistory;
