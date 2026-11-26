const db = require("../../models");
const {
  DECLARATION_DOCUMENT_KEY,
  DECLARATION_PRODUCTS,
} = require("../../utils/brokerProductDeclaration");

const GetBrokerProductDeclarations = async (req, res) => {
  try {
    const { brokerId } = req.params;

    const broker = await db.Brokers.findOne({
      where: { id: brokerId },
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "display_name", "user_email"],
        },
      ],
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    const terms = await db.TermsAndCondition.findOne({
      where: { document_key: DECLARATION_DOCUMENT_KEY },
    });

    const records = await db.BrokerProductDeclaration.findAll({
      where: { broker_id: broker.id },
      include: [{ model: db.TermsAndCondition, as: "terms", attributes: ["id", "english_name", "updatedAt"] }],
    });

    const brokerName = broker.user?.display_name || "-";

    const rows = DECLARATION_PRODUCTS.map(({ key, label }) => {
      const record = records.find((r) => r.product === key);

      if (!record) {
        return {
          product: key,
          product_name: label,
          broker_id: broker.id,
          broker_name: brokerName,
          confirmed: false,
          confirmed_at: null,
          text_version: null,
          affected_products: label,
        };
      }

      // Flag as pending again if admin republished the declaration content
      // after this broker already accepted an earlier version of it.
      const isStale = terms && record.terms_and_conditions_id !== terms.id;

      return {
        product: key,
        product_name: label,
        broker_id: broker.id,
        broker_name: brokerName,
        confirmed: !isStale,
        confirmed_at: record.confirmed_at,
        text_version: record.text_version,
        affected_products: label,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Broker product declarations retrieved successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching broker product declarations:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetBrokerProductDeclarations;
