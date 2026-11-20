const db = require("../../models");
const { Op } = require("sequelize");
const { fetchMetaByUserId, formatPartner } = require("../../utils/kontorPartnerFormatter");
const { getUplineLevelsAndRate } = require("../../utils/kontorUplineRate");
const { kontorError } = require("../../utils/kontorErrorCodes");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const GetKontorPartners = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;

    const where = { source: "kontor" };
    if (cursor) {
      where.id = { [Op.gt]: cursor };
    }

    const brokers = await db.Brokers.findAll({
      where,
      include: [{ model: db.Users, as: "user", attributes: ["display_name", "user_email"] }],
      order: [["id", "ASC"]],
      limit: limit + 1,
    });

    const hasMore = brokers.length > limit;
    const page = hasMore ? brokers.slice(0, limit) : brokers;

    const metaByUserId = await fetchMetaByUserId(page.map((b) => b.user_id));
    // N+1 by design, same as the chain walk in captureOrder.js — the Kontor
    // partner base is small enough that this isn't worth a bulk query yet.
    const partners = await Promise.all(
      page.map(async (b) => {
        const uplineInfo = await getUplineLevelsAndRate(b.user_id);
        return formatPartner(b, b.user, metaByUserId[b.user_id] || {}, uplineInfo);
      })
    );

    return res.status(200).json({
      success: true,
      message: "Partners retrieved successfully",
      data: {
        partners,
        next_cursor: hasMore ? String(page[page.length - 1].id) : null,
      },
    });
  } catch (error) {
    console.error("[Kontor] Error in GetKontorPartners:", error);
    return kontorError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
};

module.exports = GetKontorPartners;
