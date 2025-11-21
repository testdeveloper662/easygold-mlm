const db = require("../../models");

const CaptureOrder = async (req, res) => {
  const startTime = new Date();
  console.log(`\n [CAPTURE ORDER] ==========================================`);
  console.log(` [CAPTURE ORDER] START TIME: ${startTime.toISOString()}`);
  console.log(` [CAPTURE ORDER] ==========================================\n`);

  try {
    // Log request source information
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const referer = req.headers['referer'] || req.headers['referrer'] || 'Direct';
    const origin = req.headers['origin'] || 'Unknown';
    
    console.log(` [CAPTURE ORDER] Request Source Information:`);
    console.log(`   - Client IP: ${clientIP}`);
    console.log(`   - User Agent: ${userAgent}`);
    console.log(`   - Referer: ${referer}`);
    console.log(`   - Origin: ${origin}`);
    console.log(`   - Method: ${req.method}`);
    console.log(`   - URL: ${req.originalUrl || req.url}`);
    console.log(`   - Request Body:`, req.body ? JSON.stringify(req.body, null, 2) : 'undefined');
    console.log(`   - Content-Type: ${req.headers['content-type'] || 'Not set'}`);

    // Check if req.body exists
    if (!req.body) {
      console.error(` [CAPTURE ORDER] req.body is undefined. Check body parser middleware.`);
      return res.status(400).json({
        success: false,
        message: "Request body is missing. Please ensure Content-Type: application/json header is set.",
      });
    }

    const { orderId, orderType } = req.body;

    console.log(` [CAPTURE ORDER] Request received - orderId: ${orderId}, orderType: ${orderType}`);

    if (!orderId || !orderType) {
      console.error(` [CAPTURE ORDER] Missing required fields - orderId: ${orderId}, orderType: ${orderType}`);
      return res.status(400).json({
        success: false,
        message: "Missing required fields: orderId and orderType",
      });
    }

    // Step 1: 
    let OrderModel, PivotModel;

    if (orderType === "landing_page") {
      OrderModel = db.LpOrders;
      PivotModel = db.LpOrderPivots;
    } else if (orderType === "my_store") {
      OrderModel = db.MyStoreOrder;
      PivotModel = db.MyStoreOrderPivots;
    } else if (orderType === "api") {
      OrderModel = db.MyStoreOrder;
      PivotModel = db.MyStoreOrderPivots;
    } else {
      return res.status(400).json({
        success: false,
        message: `Invalid orderType: ${orderType}`,
      });
    }

    // Step 2: Get the order
    const order = await OrderModel.findOne({ where: { id: orderId } });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // Step 3: Get the pivot info
    const orderPivot = await PivotModel.findOne({
      where: { order_id: orderId },
    });
    if (!orderPivot)
      return res
        .status(404)
        .json({ success: false, message: "Order pivot not found" });

    // Step 4: Calculate total commission % and total profit (€)
    const totalCommissionPercent =
      (orderPivot.price / orderPivot.b2b_price - 1) * 100;
    const totalProfitAmount = (orderPivot.price - orderPivot.b2b_price) * orderPivot.quantity;

    // Step 5: Get broker (seller)
    const broker = await db.Brokers.findOne({
      where: { user_id: order.user_id },
    });
    if (!broker)
      return res
        .status(404)
        .json({ success: false, message: "Broker not found" });

    // Step 6: Get up to 4 parent brokers
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

    // Step 7: Map orderType to serviceType for dynamic commission fetching
    const orderTypeToServiceType = {
      landing_page: "Landing page",
      my_store: "My Store",
      api: "Order Terminal",
    };

    const serviceType = orderTypeToServiceType[orderType];
    if (!serviceType) {
      console.error(`❌ [CAPTURE ORDER] Invalid orderType: ${orderType}`);
      return res.status(400).json({
        success: false,
        message: `Invalid orderType: ${orderType}. Must be one of: landing_page, my_store, api`,
      });
    }

    console.log(` [CAPTURE ORDER] Fetching variable broker commissions for serviceType: ${serviceType}, orderType: ${orderType}`);

    // Step 7.1: Fetch dynamic commission percentages from database (Variable Broker Commissions)
    await db.AdminVariableBrokerCommission.sync();
    
    const commissionRecords = await db.AdminVariableBrokerCommission.findAll({
      where: {
        service_type: serviceType,
      },
      order: [["level", "ASC"]],
    });

    console.log(` [CAPTURE ORDER] Found ${commissionRecords.length} commission records for serviceType: ${serviceType}`);

    // Extract percentages from database records
    let basePercentages = [];
    if (commissionRecords && commissionRecords.length > 0) {
      basePercentages = commissionRecords.map((record) => record.percentage || 0);
      console.log(` [CAPTURE ORDER] Dynamic percentages from DB: [${basePercentages.join(", ")}]`);
    } else {
      // Fallback to static values if database is empty
      console.warn(` [CAPTURE ORDER] No commission records found in DB for serviceType: ${serviceType}. Using fallback static values.`);
      basePercentages = [50, 20, 15, 10, 5];
      console.log(` [CAPTURE ORDER] Using fallback static percentages: [${basePercentages.join(", ")}]`);
    }

    // Ensure we have at least 5 levels (pad with 0 if needed)
    while (basePercentages.length < 5) {
      basePercentages.push(0);
    }

    const activeLevels = [broker, ...parentBrokers];
    const activeBase = basePercentages.slice(0, activeLevels.length);
    
    console.log(` [CAPTURE ORDER] Active levels count: ${activeLevels.length}, Active base percentages: [${activeBase.join(", ")}]`);
    console.log(` [CAPTURE ORDER] Broker Hierarchy: Level 1 (Seller) + ${parentBrokers.length} Parent(s)`);

    // Distribute remaining percent to level 1 (seller)
    const totalBase = activeBase.reduce((a, b) => a + b, 0);
    const remaining = 100 - totalBase;
    activeBase[0] += remaining;

    console.log(`[CAPTURE ORDER] Commission Distribution Logic:`);
    console.log(`   - Total Base Percentages: ${totalBase}%`);
    console.log(`   - Remaining: ${remaining}%`);
    console.log(`   - Adjusted Level 1 (Seller): ${activeBase[0]}% (original: ${basePercentages[0]}% + remaining: ${remaining}%)`);
    console.log(`   - Level 2: ${activeBase[1] || 0}%`);
    console.log(`   - Level 3: ${activeBase[2] || 0}%`);
    console.log(`   - Level 4: ${activeBase[3] || 0}%`);
    console.log(`   - Level 5: ${activeBase[4] || 0}%`);

    // Normalize
    const normalizedPercents = activeBase.map((p) =>
      parseFloat(((p / 100) * 100).toFixed(2))
    );

    console.log(` [CAPTURE ORDER] Normalized percentages: [${normalizedPercents.join(", ")}]`);

    // Step 8: Build tree string (e.g., "1->2->3")
    const tree = activeLevels.map((b) => b.id).join("->");

    // Step 9: Calculate and store each broker's commission
    const distribution = [];

    console.log(` [CAPTURE ORDER] Starting commission distribution for ${activeLevels.length} brokers`);

    for (let i = 0; i < activeLevels.length; i++) {
      const currentBroker = activeLevels[i];
      const commissionPercent = normalizedPercents[i];

      const commissionAmount = parseFloat(
        ((commissionPercent / 100) * totalProfitAmount).toFixed(2)
      );

      const isSeller = i === 0;

      console.log(` [CAPTURE ORDER] Level ${i + 1} - Broker ID: ${currentBroker.id}, User ID: ${currentBroker.user_id}, Commission %: ${commissionPercent}%, Amount: €${commissionAmount}, Is Seller: ${isSeller}`);

      distribution.push({
        level: i + 1,
        broker_id: currentBroker.id,
        user_id: currentBroker.user_id,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount,
        is_seller: isSeller,
      });

      // ✅ Save in BrokerCommissionHistory with order_type and distribution timestamp
      const distributionTimestamp = new Date();
      console.log(`\n [CAPTURE ORDER] Saving commission to database:`);
      console.log(`   - Broker ID: ${currentBroker.id}`);
      console.log(`   - User ID: ${currentBroker.user_id}`);
      console.log(`   - Order ID: ${orderId}`);
      console.log(`   - Order Type: ${orderType}`);
      console.log(`   - Commission Percent: ${commissionPercent}%`);
      console.log(`   - Commission Amount: €${commissionAmount}`);
      console.log(`   - Profit Amount: €${totalProfitAmount}`);
      console.log(`   - Is Seller: ${isSeller}`);
      console.log(`   - Tree: ${tree}`);
      console.log(`   - Distribution Timestamp: ${distributionTimestamp.toISOString()}`);

      const commissionRecord = await db.BrokerCommissionHistory.create({
        broker_id: currentBroker.id,
        user_id: currentBroker.user_id,
        order_id: orderId,
        order_type: orderType,
        order_amount: orderPivot.price * orderPivot.quantity,
        profit_amount: totalProfitAmount,
        commission_percent: commissionPercent,  
        commission_amount: commissionAmount,
        tree,
        is_seller: isSeller,
      });

      console.log(` [CAPTURE ORDER] Commission saved successfully:`);
      console.log(`   - Database Record ID: ${commissionRecord.id}`);
      console.log(`   - Commission Percent (DB): ${commissionRecord.commission_percent}%`);
      console.log(`   - Commission Amount (DB): €${commissionRecord.commission_amount}`);
      console.log(`   - Created At (DB): ${commissionRecord.createdAt}`);
      console.log(`   - This commission_percent will be shown in frontend via getAllBrokerCommissionHistory API\n`);
      
      if (i === 0) {
        // ✅ Increment total commission in Brokers table
        await db.Brokers.increment(
          { total_commission_amount: commissionAmount },
          { where: { id: currentBroker.id } }
        );
        console.log(` [CAPTURE ORDER] Updated total commission for broker ID: ${currentBroker.id}`);
      }
    }

    const endTime = new Date();
    const duration = endTime - startTime;
    
    console.log(`\n✅ [CAPTURE ORDER] ==========================================`);
    console.log(`✅ [CAPTURE ORDER] Commission distribution completed successfully`);
    console.log(`✅ [CAPTURE ORDER] Order ID: ${orderId}`);
    console.log(`✅ [CAPTURE ORDER] Order Type: ${orderType}`);
    console.log(`✅ [CAPTURE ORDER] Service Type: ${serviceType}`);
    console.log(`✅ [CAPTURE ORDER] Total Brokers: ${activeLevels.length}`);
    console.log(`✅ [CAPTURE ORDER] Tree Structure: ${tree}`);
    console.log(`✅ [CAPTURE ORDER] Total Profit Amount: €${totalProfitAmount}`);
    console.log(`✅ [CAPTURE ORDER] Total Commission Percent: ${totalCommissionPercent.toFixed(2)}%`);
    console.log(`✅ [CAPTURE ORDER] Commission Distribution Summary:`);
    distribution.forEach((dist, idx) => {
      console.log(`   Level ${idx + 1}: Broker ${dist.broker_id} → ${dist.commission_percent}% (€${dist.commission_amount})`);
    });
    console.log(`✅ [CAPTURE ORDER] END TIME: ${endTime.toISOString()}`);
    console.log(`✅ [CAPTURE ORDER] DURATION: ${duration}ms`);
    console.log(`✅ [CAPTURE ORDER] ==========================================\n`);

    return res.status(200).json({
      success: true,
      message: "Commission distribution stored successfully",
      data: {
        totalCommissionPercent: parseFloat(totalCommissionPercent.toFixed(2)),
        totalProfitAmount: parseFloat(totalProfitAmount.toFixed(2)),
        distribution,
        tree,
        timestamp: endTime.toISOString(),
        duration: `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("Error in CaptureOrder:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = CaptureOrder;
