// Shared constants for the broker product-link declaration (distribution
// policy) confirmation feature, used by both the broker-facing and
// admin-facing controllers.
//
// Each product has its OWN terms_and_conditions entry (own content, own PDF,
// managed independently from the admin Terms and Conditions page), so the
// document_key is derived per product rather than being a single shared key.

const DECLARATION_DOCUMENT_KEY_PREFIX = "broker_product_declaration_";

// Legacy single shared key used before per-product declarations existed.
// Kept only so admin can still find/retire that old entry if it lingers.
const LEGACY_DECLARATION_DOCUMENT_KEY = "broker_product_declaration";

const DECLARATION_PRODUCTS = [
  { key: "easygold", label: "EasyGold" },
  { key: "primeinvest", label: "PrimeInvest" },
  { key: "goldflex", label: "Goldflex" },
];

const DECLARATION_PRODUCT_KEYS = DECLARATION_PRODUCTS.map((p) => p.key);

function getProductLabel(productKey) {
  return DECLARATION_PRODUCTS.find((p) => p.key === productKey)?.label || productKey;
}

function getDeclarationDocumentKey(productKey) {
  return `${DECLARATION_DOCUMENT_KEY_PREFIX}${productKey}`;
}

function isReservedDeclarationDocumentKey(documentKey) {
  return !!documentKey && (
    documentKey.startsWith(DECLARATION_DOCUMENT_KEY_PREFIX) ||
    documentKey === LEGACY_DECLARATION_DOCUMENT_KEY
  );
}

module.exports = {
  DECLARATION_DOCUMENT_KEY_PREFIX,
  LEGACY_DECLARATION_DOCUMENT_KEY,
  DECLARATION_PRODUCTS,
  DECLARATION_PRODUCT_KEYS,
  getProductLabel,
  getDeclarationDocumentKey,
  isReservedDeclarationDocumentKey,
};
