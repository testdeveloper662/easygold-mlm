const db = require("../models");

/**
 * Calculates the hierarchy level of a broker or affiliate.
 * Level 1: Root broker (no parent_id)
 * Level 2: Child of Level 1
 * Level 3: Child of Level 2
 * Level 4: Child of Level 3
 * Level 5: Child of Level 4
 *
 * @param {number|string} brokerId - ID of the broker/affiliate record
 * @returns {Promise<number>} - Hierarchy level (1-indexed)
 */
const getBrokerLevel = async (brokerId) => {
  if (!brokerId) return 1;

  let level = 1;
  let currentId = brokerId;
  const visited = new Set();

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    let broker = null;
    if (db.Brokers) {
      broker = await db.Brokers.findOne({
        where: { id: currentId },
        attributes: ["id", "parent_id"],
        raw: true,
      });
    }

    if (!broker && db.Affiliates) {
      broker = await db.Affiliates.findOne({
        where: { id: currentId },
        attributes: ["id", "parent_id"],
        raw: true,
      });
    }

    if (!broker || !broker.parent_id) break;

    level++;
    currentId = broker.parent_id;
  }

  return level;
};

module.exports = {
  getBrokerLevel,
};
