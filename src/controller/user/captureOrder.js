const db = require("../../models");

const CaptureOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    // Step 1: Get the order
    const order = await db.LpOrders.findOne({ where: { id: orderId } });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // Step 2: Get the pivot info
    const lpOrderPivot = await db.LpOrderPivots.findOne({
      where: { order_id: orderId },
    });
    if (!lpOrderPivot)
      return res
        .status(404)
        .json({ success: false, message: "LpOrderPivot not found" });

    // Step 3: Calculate total commission % and total profit (€)
    const totalCommissionPercent =
      (lpOrderPivot.price / lpOrderPivot.b2b_price - 1) * 100;
    const totalProfitAmount = lpOrderPivot.price - lpOrderPivot.b2b_price;

    // Step 4: Get broker (seller)
    const broker = await db.Brokers.findOne({
      where: { user_id: order.user_id },
    });
    if (!broker)
      return res
        .status(404)
        .json({ success: false, message: "Broker not found" });

    // Step 5: Get up to 4 parent brokers
    const parentBrokers = [];
    let currentParentId = broker.parent_id;
    let level = 0;

    while (currentParentId && level < 4) {
      const parent = await db.Brokers.findOne({
        where: { id: currentParentId },
      });
      if (!parent) break;
      parentBrokers.push(parent);
      currentParentId = parent.parent_id;
      level++;
    }

    // Step 6: Base percentages for 5 possible levels
    const basePercentages = [50, 20, 15, 10, 5];
    const activeLevels = [broker, ...parentBrokers];
    const activeBase = basePercentages.slice(0, activeLevels.length);

    // 🧮 Step 6a: Distribute remaining percent to level 1 (seller)
    const totalBase = activeBase.reduce((a, b) => a + b, 0);
    const remaining = 100 - totalBase;

    // Add missing percent to seller (level 1)
    activeBase[0] += remaining;

    // Normalize (should already be 100, but keep clean math)
    const normalizedPercents = activeBase.map((p) =>
      parseFloat(((p / 100) * 100).toFixed(2))
    );

    // Step 7: Build tree string (e.g., "1->2->3")
    const tree = activeLevels.map((b) => b.id).join("->");

    // Step 8: Calculate each broker’s commission and store in DB
    const distribution = [];

    for (let i = 0; i < activeLevels.length; i++) {
      const currentBroker = activeLevels[i];
      const commissionPercent = normalizedPercents[i];

      // Calculate each broker’s profit (€)
      const commissionAmount = parseFloat(
        ((commissionPercent / 100) * totalProfitAmount).toFixed(2)
      );

      distribution.push({
        level: i + 1,
        broker_id: currentBroker.id,
        user_id: currentBroker.user_id,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount,
      });

      // ✅ Step 8a: Save in commission history
      await db.BrokerCommissionHistory.create({
        broker_id: currentBroker.id,
        user_id: currentBroker.user_id,
        order_id: orderId,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount,
        tree,
      });

      // ✅ Step 8b: Increment total_commission_amount
      await db.Brokers.increment(
        { total_commission_amount: commissionAmount },
        { where: { id: currentBroker.id } }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Commission distribution calculated and stored successfully",
      data: {
        totalCommissionPercent: parseFloat(totalCommissionPercent.toFixed(2)),
        totalProfitAmount: parseFloat(totalProfitAmount.toFixed(2)),
        distribution,
        tree,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = CaptureOrder;
