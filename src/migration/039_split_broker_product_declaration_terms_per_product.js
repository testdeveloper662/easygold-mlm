const db = require("../models");

// Each product (EasyGold / PrimeInvest / Goldflex) now gets its own
// terms_and_conditions entry (own content, own PDF, editable independently
// from the admin Terms and Conditions page) instead of one entry shared by
// all three. document_key becomes `broker_product_declaration_<product>`.
//
// The old shared entry (document_key = "broker_product_declaration") is
// renamed/re-labelled into the EasyGold entry so its id is preserved and any
// confirmations already recorded against it (brokers who approved the
// EasyGold link before this split) stay valid instead of being reset.

const LEGACY_DOCUMENT_KEY = "broker_product_declaration";

const PRODUCTS = [
  {
    key: "easygold",
    documentKey: "broker_product_declaration_easygold",
    englishName: "Broker/Dealer Product Declaration - EasyGold (used for the EasyGold referral link approval)",
    germanName: "Haendler-/Broker-Produkterklaerung - EasyGold (fuer die Freigabe des EasyGold-Empfehlungslinks)",
  },
  {
    key: "primeinvest",
    documentKey: "broker_product_declaration_primeinvest",
    englishName: "Broker/Dealer Product Declaration - PrimeInvest (used for the PrimeInvest referral link approval)",
    germanName: "Haendler-/Broker-Produkterklaerung - PrimeInvest (fuer die Freigabe des PrimeInvest-Empfehlungslinks)",
  },
  {
    key: "goldflex",
    documentKey: "broker_product_declaration_goldflex",
    englishName: "Broker/Dealer Product Declaration - Goldflex (used for the Goldflex referral link approval)",
    germanName: "Haendler-/Broker-Produkterklaerung - Goldflex (fuer die Freigabe des Goldflex-Empfehlungslinks)",
  },
];

async function findByDocumentKey(documentKey) {
  const [rows] = await db.sequelize.query(
    "SELECT `id`, `english_template_text`, `german_template_text` FROM `terms_and_conditions` WHERE `document_key` = :document_key LIMIT 1;",
    { replacements: { document_key: documentKey } }
  );
  return rows[0] || null;
}

async function splitBrokerProductDeclarationTermsPerProduct() {
  try {
    const legacyRow = await findByDocumentKey(LEGACY_DOCUMENT_KEY);

    for (const product of PRODUCTS) {
      const existing = await findByDocumentKey(product.documentKey);
      if (existing) {
        console.log(`ℹ️ ${product.documentKey} already exists, skipping.`);
        continue;
      }

      if (product.key === "easygold" && legacyRow) {
        // Re-label the legacy shared row into the EasyGold-specific entry,
        // preserving its id (and therefore any existing confirmations).
        await db.sequelize.query(
          `UPDATE \`terms_and_conditions\`
             SET \`document_key\` = :document_key,
                 \`english_name\` = :english_name,
                 \`german_name\` = :german_name,
                 \`updatedAt\` = NOW()
           WHERE \`id\` = :id;`,
          {
            replacements: {
              document_key: product.documentKey,
              english_name: product.englishName,
              german_name: product.germanName,
              id: legacyRow.id,
            },
          }
        );
        console.log(`✅ Re-labelled legacy shared declaration into ${product.documentKey}.`);
        continue;
      }

      // Fresh entry for this product, seeded from the legacy/easygold text so
      // content starts out identical across products (admin can edit each
      // independently afterwards).
      const sourceText = legacyRow || (await findByDocumentKey("broker_product_declaration_easygold"));

      await db.sequelize.query(
        `INSERT INTO \`terms_and_conditions\`
          (\`english_name\`, \`german_name\`, \`english_template_text\`, \`german_template_text\`, \`showonregister\`, \`document_key\`, \`createdAt\`, \`updatedAt\`)
         VALUES
          (:english_name, :german_name, :english_template_text, :german_template_text, false, :document_key, NOW(), NOW());`,
        {
          replacements: {
            english_name: product.englishName,
            german_name: product.germanName,
            english_template_text: sourceText?.english_template_text || "",
            german_template_text: sourceText?.german_template_text || "",
            document_key: product.documentKey,
          },
        }
      );
      console.log(`✅ Seeded ${product.documentKey}.`);
    }
  } catch (error) {
    console.error("❌ Error splitting broker product declaration terms per product:", error);
    throw error;
  }
}

module.exports = splitBrokerProductDeclarationTermsPerProduct;
