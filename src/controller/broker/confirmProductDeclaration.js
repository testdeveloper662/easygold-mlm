require("dotenv").config();
const db = require("../../models");
const {
  DECLARATION_DOCUMENT_KEY,
  DECLARATION_PRODUCT_KEYS,
} = require("../../utils/brokerProductDeclaration");

const ConfirmProductDeclaration = async (req, res) => {
  try {
    const { user } = req.user;
    const { product } = req.body;

    if (!DECLARATION_PRODUCT_KEYS.includes(product)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product",
      });
    }

    // Brokers may only confirm the declaration for their own account, never
    // on behalf of another broker (even in admin view-as-broker mode).
    const broker = await db.Brokers.findOne({ where: { user_id: user.ID } });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    const terms = await db.TermsAndCondition.findOne({
      where: { document_key: DECLARATION_DOCUMENT_KEY },
    });

    if (!terms) {
      return res.status(404).json({
        success: false,
        message: "Declaration content is not configured yet. Please contact admin.",
      });
    }

    const ipAddress = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "")
      .toString()
      .split(",")[0]
      .trim();

    // text_version is a STRING column; terms.updatedAt is a Date instance,
    // so it must be serialized before being stored.
    const textVersion = new Date(terms.updatedAt).toISOString();

    const [declaration] = await db.BrokerProductDeclaration.findOrCreate({
      where: { broker_id: broker.id, product },
      defaults: {
        broker_id: broker.id,
        user_id: user.ID,
        product,
        terms_and_conditions_id: terms.id,
        text_version: textVersion,
        confirmed_at: new Date(),
        ip_address: ipAddress,
      },
    });

    await declaration.update({
      terms_and_conditions_id: terms.id,
      text_version: textVersion,
      confirmed_at: new Date(),
      ip_address: ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Declaration confirmed successfully",
      data: declaration,
    });
  } catch (error) {
    console.error("Error confirming broker product declaration:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = ConfirmProductDeclaration;
