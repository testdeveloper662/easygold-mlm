const db = require("../../models");
const { Op } = db.Sequelize;
const { roundToTwoDecimalPlaces } = require("../../utils/Helper");

const MAX_LEVEL = 5;
const RECENT_ORDERS_LIMIT = 5;

/** Calculate broker level based on parent hierarchy */
const calculateBrokerLevel = (broker, allBrokers) => {
  if (!broker.parent_id) return 1;

  let level = 1;
  let currentParentId = broker.parent_id;
  const visited = new Set([broker.id]);

  while (currentParentId && level < MAX_LEVEL) {
    if (visited.has(currentParentId)) break;
    visited.add(currentParentId);

    const parent = allBrokers.find(b => b.id === currentParentId);
    if (!parent) break;

    level++;
    currentParentId = parent.parent_id;
  }

  return level;
};

const GetDashboardData = async (req, res) => {
  try {
    const { user } = req.user;
    const { filterType, from, to } = req.query;

    if (!user || !user.ID) {
      return res.status(400).json({
        success: false,
        message: "User information is missing from request",
      });
    }

    let startDate, endDate;
    const now = new Date();

    switch (filterType) {
      case "today":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "last_7_days":
        startDate = new Date();
        startDate.setDate(now.getDate() - 6); // including today
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "last_30_days":
        startDate = new Date();
        startDate.setDate(now.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "last_year":
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "custom":
        if (!from || !to) {
          return res.status(400).json({ success: false, message: "Please provide from and to dates for custom filter" });
        }
        startDate = new Date(from);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        break;

      default:
        // default: last 7 days
        startDate = new Date();
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
    }


    // Find current broker
    const currentBroker = await db.Brokers.findOne({
      where: { user_id: user.ID },
    });

    if (!currentBroker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    // Fetch all brokers for network calculations
    const allBrokers = await db.Brokers.findAll({
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "user_email", "display_name"],
        },
      ],
    });

    // Build broker level map
    const brokerLevelMap = {};
    allBrokers.forEach(broker => {
      brokerLevelMap[broker.id] = calculateBrokerLevel(broker, allBrokers);
    });

    // Get all commission history for current broker
    // const whereClause = {
    //   user_id: user.ID,
    //   [db.Sequelize.Op.or]: [
    //     { is_seller: true },
    //     { [db.Sequelize.Op.and]: [{ is_seller: false }, { is_payment_done: true }] },
    //   ],
    // };

    const whereClause = {
      user_id: user.ID,
      [Op.or]: [
        // 👉 Seller Logic
        {
          is_seller: true,
          [Op.or]: [
            { selected_payment_method: 1 }, // seller + method 1 = always show
            {
              [Op.and]: [
                { selected_payment_method: 2 }, // seller + method 2 only if payment done
                { is_payment_done: true },
              ],
            },
          ],
        },

        // 👉 Non-Seller Logic
        {
          is_seller: false,
          [Op.or]: [
            {
              [Op.and]: [
                { selected_payment_method: 1 },
                { is_payment_done: true }, // must be payment done
              ],
            },
            {
              [Op.and]: [
                { selected_payment_method: 2 },
                { is_payment_done: true }, // again must be payment done
              ],
            },
          ],
        },
      ],
    };

    const allCommissions = await db.BrokerCommissionHistory.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    // Get current month for filtering
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const currentMonthStr = `${currentYear}-${currentMonth}`;

    // Start and end of current month for filtering
    const startOfMonth = new Date(currentYear, currentDate.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(currentYear, currentDate.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);


    const currentMonthWhereClause = {
      ...whereClause,
      createdAt: {
        [db.Sequelize.Op.between]: [startOfMonth, endOfMonth],
      },
    };

    const directCommissionWhere = {
      user_id: user.ID,
      selected_payment_method: 1,
      createdAt: {
        [Op.between]: [startOfMonth, endOfMonth],
      },
      [Op.or]: [
        // ✅ Seller → always count
        {
          is_seller: true,
        },

        // ✅ Non-seller → count only if payment done
        {
          is_seller: false,
          is_payment_done: true,
        },
      ],
    };

    const payoutWhere = {
      broker_id: currentBroker.id,
      status: "APPROVED",
      createdAt: {
        [db.Sequelize.Op.between]: [startOfMonth, endOfMonth],
      },
    };

    // 1. Total Order Sale Amount (Current Monthly basis)
    const orderSaleByMonth = await db.BrokerCommissionHistory.findAll({
      where: currentMonthWhereClause,
      attributes: [
        [db.sequelize.literal(`'${currentMonthStr}'`), "month"],
        [db.sequelize.fn("SUM", db.sequelize.col("order_amount")), "total_amount"],
      ],
      raw: true,
    });

    // 2. Total Earnings (Current Monthly basis) - commission_amount
    const earningsByMonth = await db.BrokerCommissionHistory.findAll({
      where: currentMonthWhereClause,
      attributes: [
        [db.sequelize.literal(`'${currentMonthStr}'`), "month"],
        [db.sequelize.fn("SUM", db.sequelize.col("commission_amount")), "total_earnings"],
      ],
      raw: true,
    });

    const directCommissionByMonth = await db.BrokerCommissionHistory.findAll({
      where: directCommissionWhere,
      attributes: [
        [db.sequelize.literal(`'${currentMonthStr}'`), "month"],
        [db.sequelize.fn("SUM", db.sequelize.col("commission_amount")), "total_commission"],
      ],
      raw: true,
    });

    const approvedPayouts = await db.BrokerPayoutRequests.findAll({
      where: payoutWhere,
      attributes: [
        [db.sequelize.literal(`'${currentMonthStr}'`), "month"],
        [db.Sequelize.fn("SUM", db.Sequelize.col("amount")), "total_payout"],
      ],
      raw: true,
    });

    const totalDirectCommission = roundToTwoDecimalPlaces(
      parseFloat(directCommissionByMonth?.[0]?.total_commission || 0)
    );

    const totalApprovedPayout = roundToTwoDecimalPlaces(
      parseFloat(approvedPayouts?.[0]?.total_payout || 0)
    );

    const commissionReceivedTotal = roundToTwoDecimalPlaces(
      totalDirectCommission + totalApprovedPayout
    );


    // 3. Number of Sub Brokers - Count total and by level
    // Find all sub-brokers (brokers where current broker is in their parent chain)
    const findSubBrokersWithLevel = (parentId, brokers, level = 2, result = []) => {
      if (level > MAX_LEVEL) return;

      const children = brokers.filter(b => b.parent_id === parentId);
      children.forEach(child => {
        result.push({ broker: child, level });
        findSubBrokersWithLevel(child.id, brokers, level + 1, result);
      });
      return result;
    };

    const subBrokersWithLevel = findSubBrokersWithLevel(currentBroker.id, allBrokers);
    const totalSubBrokers = subBrokersWithLevel.length;

    // Count by level
    const subBrokersByLevel = {};
    subBrokersWithLevel.forEach(({ broker, level }) => {
      subBrokersByLevel[level] = (subBrokersByLevel[level] || 0) + 1;
    });

    // Format level counts
    const subBrokersByLevelFormatted = [];
    for (let level = 1; level <= MAX_LEVEL; level++) {
      subBrokersByLevelFormatted.push({
        level,
        count: subBrokersByLevel[level] || 0,
      });
    }

    // 4. Recent Orders - Latest 4-5 entries from commissions
    const recentOrders = allCommissions.filter(c => new Date(c.createdAt) >= startDate && new Date(c.createdAt) <= endDate).slice(0, RECENT_ORDERS_LIMIT).map(commission => ({
      id: commission.id,
      order_id: commission.order_id,
      order_type: commission.order_type,
      order_amount: commission.order_amount,
      commission_amount: commission.commission_amount,
      is_seller: commission.is_seller,
      createdAt: commission.createdAt,
    }));

    // 5. Commission Summary by Level
    // Group commissions by their position in the commission tree (distribution level)

    const commissionByLevel = {};
    allCommissions.forEach(commission => {
      if (!commission.tree) return;

      let level = 1; // Default to level 1

      if (commission.is_seller) {
        level = 1; // Seller is always level 1
      } else {
        // For non-seller commissions, find position in tree
        const brokerIds = commission.tree.split("->").map(id => parseInt(id));
        // Find the position of current broker in the tree
        const currentBrokerInTree = brokerIds.findIndex(brokerId => {
          const broker = allBrokers.find(b => b.id === brokerId);
          return broker && broker.user_id === user.ID;
        });

        // Level is position + 1 (0 = seller/level 1, 1 = first parent/level 2, etc.)
        level = currentBrokerInTree >= 0 ? currentBrokerInTree + 1 : 1;
      }

      if (!commissionByLevel[level]) {
        commissionByLevel[level] = {
          level,
          total_commission: 0,
          count: 0,
        };
      }

      commissionByLevel[level].total_commission += parseFloat(commission.commission_amount || 0);
      commissionByLevel[level].count += 1;
    });

    // Format commission summary
    const commissionSummaryByLevel = [];
    for (let level = 1; level <= MAX_LEVEL; level++) {
      commissionSummaryByLevel.push({
        level,
        total_commission: roundToTwoDecimalPlaces(commissionByLevel[level]?.total_commission || 0),
        count: commissionByLevel[level]?.count || 0,
      });
    }

    // 6. Monthly Growth Chart (network + earnings) - Current Month Only
    // Group network by level (X-axis: levels, Y-axis: user count per level)
    const networkByLevel = {};
    subBrokersWithLevel.forEach(({ broker, level }) => {
      if (!networkByLevel[level]) {
        networkByLevel[level] = {
          level,
          users: [],
          count: 0,
        };
      }
      const brokerUser = allBrokers.find(b => b.id === broker.id)?.user;
      networkByLevel[level].users.push({
        broker_id: broker.id,
        user_id: broker.user_id,
        user_email: brokerUser?.user_email || null,
        display_name: brokerUser?.display_name || null,
        referral_code: broker.referral_code || null,
      });
      networkByLevel[level].count += 1;
    });

    // Format network by level (for graph: X-axis = levels, Y-axis = user count)
    const formattedNetwork = [];
    for (let level = 1; level <= MAX_LEVEL; level++) {
      formattedNetwork.push({
        level,
        users: networkByLevel[level]?.users || [],
        count: networkByLevel[level]?.count || 0,
      });
    }

    // Get all commission records for current month and group by level
    const currentMonthCommissions = await db.BrokerCommissionHistory.findAll({
      where: currentMonthWhereClause,
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    // Group earnings by level (X-axis: levels, Y-axis: commission amounts per level)
    const earningsByLevel = {};
    currentMonthCommissions.forEach(commission => {
      if (!commission.tree) return;

      let level = 1;
      if (commission.is_seller) {
        level = 1;
      } else {
        const brokerIds = commission.tree.split("->").map(id => parseInt(id));
        const currentBrokerInTree = brokerIds.findIndex(brokerId => {
          const broker = allBrokers.find(b => b.id === brokerId);
          return broker && broker.user_id === user.ID;
        });
        level = currentBrokerInTree >= 0 ? currentBrokerInTree + 1 : 1;
      }

      if (!earningsByLevel[level]) {
        earningsByLevel[level] = {
          level,
          commissions: [],
          total_amount: 0,
        };
      }

      earningsByLevel[level].commissions.push({
        id: commission.id,
        order_id: commission.order_id,
        order_type: commission.order_type,
        order_amount: roundToTwoDecimalPlaces(parseFloat(commission.order_amount) || 0),
        commission_amount: roundToTwoDecimalPlaces(parseFloat(commission.commission_amount) || 0),
        is_seller: commission.is_seller,
        createdAt: commission.createdAt,
      });

      earningsByLevel[level].total_amount += parseFloat(commission.commission_amount || 0);
    });

    // Format earnings by level (for graph: X-axis = levels, Y-axis = commission amounts)
    const formattedEarnings = [];
    for (let level = 1; level <= MAX_LEVEL; level++) {
      formattedEarnings.push({
        level,
        commissions: earningsByLevel[level]?.commissions || [],
        total_amount: roundToTwoDecimalPlaces(earningsByLevel[level]?.total_amount || 0),
      });
    }

    // Monthly growth chart grouped by level
    const monthlyGrowthChart = [{
      month: currentMonthStr,
      network: formattedNetwork,
      earnings: formattedEarnings,
    }];

    return res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: {
        total_order_sale_by_month: orderSaleByMonth.length > 0 ? [{
          month: orderSaleByMonth[0].month,
          total_amount: roundToTwoDecimalPlaces(parseFloat(orderSaleByMonth[0].total_amount) || 0),
        }] : [{
          month: currentMonthStr,
          total_amount: 0,

        }],
        total_earnings_by_month: earningsByMonth.length > 0 ? [{
          month: earningsByMonth[0].month,
          total_earnings: roundToTwoDecimalPlaces(parseFloat(earningsByMonth[0].total_earnings) || 0),
        }] : [{
          month: currentMonthStr,
          total_earnings: 0,
        }],
        total_commission_received_by_month: [{
          month: currentMonthStr,
          direct_commission: totalDirectCommission,
          payout_amount: totalApprovedPayout,
          total_commission_received: commissionReceivedTotal
        }],
        sub_brokers: {
          total: totalSubBrokers,
          by_level: subBrokersByLevelFormatted,
        },
        recent_orders: recentOrders,
        commission_summary_by_level: commissionSummaryByLevel,
        monthly_growth_chart: monthlyGrowthChart,
        untermaklervertrag_doc: currentBroker.untermaklervertrag_doc ? `${process.env.NODE_URL}${currentBroker.untermaklervertrag_doc}` : null,
        maklervertrag_doc: currentBroker.maklervertrag_doc ? `${process.env.NODE_URL}${currentBroker.maklervertrag_doc}` : null,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = GetDashboardData;