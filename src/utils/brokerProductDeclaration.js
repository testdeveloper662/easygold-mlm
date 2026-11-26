// Shared constants for the broker product-link declaration (distribution
// policy) confirmation feature, used by both the broker-facing and
// admin-facing controllers.

const DECLARATION_DOCUMENT_KEY = "broker_product_declaration";

const DECLARATION_PRODUCTS = [
  { key: "easygold", label: "EasyGold" },
  { key: "primeinvest", label: "PrimeInvest" },
  { key: "goldflex", label: "Goldflex" },
];

const DECLARATION_PRODUCT_KEYS = DECLARATION_PRODUCTS.map((p) => p.key);

function getProductLabel(productKey) {
  return DECLARATION_PRODUCTS.find((p) => p.key === productKey)?.label || productKey;
}

module.exports = {
  DECLARATION_DOCUMENT_KEY,
  DECLARATION_PRODUCTS,
  DECLARATION_PRODUCT_KEYS,
  getProductLabel,
};
