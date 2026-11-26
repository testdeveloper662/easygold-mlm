require("dotenv").config();
const db = require("../../models");
const { Op } = require("sequelize");
const {
  DECLARATION_PRODUCT_KEYS,
  getDeclarationDocumentKey,
} = require("../../utils/brokerProductDeclaration");

const buildFileUrl = (filename) =>
  filename ? `${process.env.NODE_URL}uploads/contracts/${filename}` : null;

const serializeTerms = (terms) =>
  terms
    ? {
      id: terms.id,
      document_key: terms.document_key,
      english_name: terms.english_name,
      german_name: terms.german_name,
      english_template_text: terms.english_template_text,
      german_template_text: terms.german_template_text,
      english_pdf_file: buildFileUrl(terms.english_pdf_file),
      german_pdf_file: buildFileUrl(terms.german_pdf_file),
      updatedAt: terms.updatedAt,
    }
    : null;

const GetProductDeclarations = async (req, res) => {
  try {
    const { user } = req.user;

    const targetUserId = (user.role === "SUPER_ADMIN" && req.query.viewUserId)
      ? parseInt(req.query.viewUserId)
      : user.ID;

    const broker = await db.Brokers.findOne({ where: { user_id: targetUserId } });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    const documentKeys = DECLARATION_PRODUCT_KEYS.map(getDeclarationDocumentKey);

    const termsRows = await db.TermsAndCondition.findAll({
      where: { document_key: { [Op.in]: documentKeys } },
    });

    const termsByProduct = {};
    for (const productKey of DECLARATION_PRODUCT_KEYS) {
      termsByProduct[productKey] = serializeTerms(
        termsRows.find((t) => t.document_key === getDeclarationDocumentKey(productKey))
      );
    }

    const existingDeclarations = await db.BrokerProductDeclaration.findAll({
      where: { broker_id: broker.id },
    });

    const declarations = {};
    for (const productKey of DECLARATION_PRODUCT_KEYS) {
      const record = existingDeclarations.find((d) => d.product === productKey);
      const currentTerms = termsByProduct[productKey];

      if (!record) {
        declarations[productKey] = {
          confirmed: false,
          confirmed_at: null,
          text_version: null,
        };
        continue;
      }

      // If admin has edited/republished this product's declaration since the
      // broker last confirmed it, treat it as unconfirmed again.
      const isStale = currentTerms && record.terms_and_conditions_id !== currentTerms.id;

      declarations[productKey] = {
        confirmed: !isStale,
        confirmed_at: record.confirmed_at,
        text_version: record.text_version,
      };
    }

    return res.status(200).json({
      success: true,
      message: "Product declarations retrieved successfully",
      data: {
        terms: termsByProduct,
        declarations,
      },
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

module.exports = GetProductDeclarations;
