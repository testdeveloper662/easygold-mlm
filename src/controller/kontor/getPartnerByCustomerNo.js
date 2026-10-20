const db = require("../../models");
const { fetchMetaByUserId, formatPartner } = require("../../utils/kontorPartnerFormatter");
const { kontorError } = require("../../utils/kontorErrorCodes");

const GetKontorPartnerByCustomerNo = async (req, res) => {
  try {
    const { external_ref } = req.params;

    // Accepts our own broker_id or Kontor's external_ref (their customer
    // number) in the same path segment — external_ref can itself be a
    // numeric-looking string (e.g. "70001"), so a numeric id lookup alone
    // isn't enough; fall back to external_ref whenever the id lookup misses.
    const isNumeric = /^\d+$/.test(external_ref);
    let broker = null;
    if (isNumeric) {
      broker = await db.Brokers.findOne({
        where: { id: external_ref, source: "kontor" },
        include: [{ model: db.Users, as: "user", attributes: ["display_name", "user_email"] }],
      });
    }
    if (!broker) {
      broker = await db.Brokers.findOne({
        where: { source: "kontor", external_ref: String(external_ref) },
        include: [{ model: db.Users, as: "user", attributes: ["display_name", "user_email"] }],
      });
    }

    if (!broker) {
      return kontorError(res, 404, "NOT_FOUND", "No Kontor-sourced broker found for this broker_id/external_ref");
    }

    const metaByUserId = await fetchMetaByUserId([broker.user_id]);

    return res.status(200).json({
      success: true,
      data: formatPartner(broker, broker.user, metaByUserId[broker.user_id] || {}),
    });
  } catch (error) {
    console.error("[Kontor] Error in GetKontorPartnerByCustomerNo:", error);
    return kontorError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
};

module.exports = GetKontorPartnerByCustomerNo;
