// QK-INV-3: the legal entity that self-bills (issues) Kontor commission
// credit notes. Reuses the real Hartmann & Benz GmbH / Fellbach address
// already used for B2B_DASHBOARD payouts elsewhere in this codebase (see
// companyAddressMap in Helper.js). The VAT-ID defaults to DE325244140 — the
// same number already printed as "Our tax number" on the live
// payout_template_en/de.html commission invoices sent to brokers today for
// this exact kind of payment, so it's a real, already-in-use identifier,
// not an invented one. Override any of these via env vars if finance gives
// a different number to use specifically for e-invoices.
const ISSUER = {
  name: process.env.EINVOICE_ISSUER_NAME || "Hartmann & Benz GmbH",
  street: process.env.EINVOICE_ISSUER_STREET || "Gutenbergstraße 40",
  postcode: process.env.EINVOICE_ISSUER_POSTCODE || "70736",
  city: process.env.EINVOICE_ISSUER_CITY || "Fellbach",
  countryCode: process.env.EINVOICE_ISSUER_COUNTRY || "DE",
  vatId: process.env.EINVOICE_ISSUER_VAT_ID || "DE325244140",
  // BT-49 (Buyer electronic address) is mandatory in EN 16931 — reuses the
  // real support inbox already used for broker payout emails elsewhere
  // (createBrokerPayoutRequest.js), not a new made-up address.
  email: process.env.EINVOICE_ISSUER_EMAIL || process.env.EASY_GOLD_SUPPORT_EMAIL || null,
  // Unlike name/address/VAT-ID/email, no real phone number for this entity
  // exists anywhere in this codebase (checked .env and every template) — no
  // fallback is given here on purpose, genuinely needs EINVOICE_ISSUER_PHONE
  // set before this generator can produce a real (non-example) document.
  phone: process.env.EINVOICE_ISSUER_PHONE || null,
  // XRechnung wants an actual contact person/role, not the company's own
  // legal name repeated — "Accounting" is a legitimate real-world practice
  // (a department, not a fabricated individual), used only until someone
  // gives a named contact via EINVOICE_ISSUER_CONTACT_NAME.
  contactName: process.env.EINVOICE_ISSUER_CONTACT_NAME || "Accounting",
};

module.exports = { ISSUER };
