const db = require("../../models");
const { Op } = require("sequelize");
const {
  DECLARATION_PRODUCTS,
  getDeclarationDocumentKey,
} = require("../../utils/brokerProductDeclaration");

const GetBrokerProductDeclarations = async (req, res) => {
  try {
    const { userId } = req.params;

    // Looked up by user_id (not brokers.id) so the same endpoint serves both
    // the broker detail page and the affiliate/private-individual detail
    // page - affiliates and private individuals are synced into the brokers
    // table (see migrations 022 and 028) but their own admin pages only ever
    // carry a user_id, never a brokers.id.
    const broker = await db.Brokers.findOne({
      where: { user_id: userId },
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

    const documentKeys = DECLARATION_PRODUCTS.map(({ key }) => getDeclarationDocumentKey(key));

    const termsRows = await db.TermsAndCondition.findAll({
      where: { document_key: { [Op.in]: documentKeys } },
    });

    const records = await db.BrokerProductDeclaration.findAll({
      where: { broker_id: broker.id },
      include: [{ model: db.TermsAndCondition, as: "terms", attributes: ["id", "english_name", "updatedAt"] }],
    });

    const brokerName = broker.user?.display_name || "-";

    const rows = DECLARATION_PRODUCTS.map(({ key, label }) => {
      const record = records.find((r) => r.product === key);
      const currentTerms = termsRows.find((t) => t.document_key === getDeclarationDocumentKey(key));

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

      // Flag as pending again if admin republished this product's
      // declaration content after the broker already accepted an earlier
      // version of it.
      const isStale = currentTerms && record.terms_and_conditions_id !== currentTerms.id;

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
