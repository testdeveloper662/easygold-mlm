const db = require("../../models");
const { fetchMetaByUserId, formatPartner } = require("../../utils/kontorPartnerFormatter");

const GetKontorPartnerByCustomerNo = async (req, res) => {
  try {
    const { customer_no } = req.params;

    const broker = await db.Brokers.findOne({
      where: { source: "kontor", external_ref: String(customer_no) },
      include: [{ model: db.Users, as: "user", attributes: ["display_name", "user_email"] }],
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "No Kontor-sourced broker found for this customer_no",
      });
    }

    const metaByUserId = await fetchMetaByUserId([broker.user_id]);

    return res.status(200).json({
      success: true,
      message: "Partner retrieved successfully",
      data: formatPartner(broker, broker.user, metaByUserId[broker.user_id] || {}),
    });
  } catch (error) {
    console.error("[Kontor] Error in GetKontorPartnerByCustomerNo:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetKontorPartnerByCustomerNo;
