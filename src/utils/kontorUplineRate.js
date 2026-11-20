const db = require("../models");

// Same default split captureOrder.js falls back to when no admin-configured
// percentages exist for the order's service_type. QK-INV-2 is a pre-order
// estimate (Kontor doesn't know the order type yet at checkout), so the
// default table is the right one to quote against.
const DEFAULT_PERCENTAGES = [50, 20, 15, 10, 5];
const MAX_LEVELS_ABOVE = DEFAULT_PERCENTAGES.length - 1; // 4

// How many broker levels exist above this user, and the combined commission
// percentage they represent (0 / 20 / 35 / 45 / 50%) — what a contract
// partner (QK-18) needs to bill the customer correctly at checkout, without
// ever seeing the chain itself.
const getUplineLevelsAndRate = async (userId) => {
  let currentUserId = userId;
  let levelsAbove = 0;

  while (levelsAbove < MAX_LEVELS_ABOVE) {
    const ref = await db.UserReferrals.findOne({ where: { user_id: currentUserId } });
    const parentUserId = ref?.parent_user_id || null;
    if (!parentUserId) break;

    const parentBroker = await db.Brokers.findOne({ where: { user_id: parentUserId } });
    if (!parentBroker) break;

    levelsAbove += 1;
    currentUserId = parentUserId;
  }

  const combinedRatePercent = DEFAULT_PERCENTAGES.slice(1, 1 + levelsAbove).reduce((a, b) => a + b, 0);

  return { levels_above: levelsAbove, combined_rate_percent: combinedRatePercent };
};

module.exports = { getUplineLevelsAndRate };
