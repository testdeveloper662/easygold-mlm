const db = require("../models");
const { encryptJson } = require("./encryptionHelper");

// Confirmed by Christian: "activated" is the live example value. Mapped
// loosely by intent rather than an exact enum match, since the exact set of
// strings Kontor might send (blocked, deactivated, suspended, rejected,
// terminated, cancelled, ...) isn't fully pinned down.
const ACTIVE_STATUSES = ["activated", "approved", "active"];
const PENDING_STATUSES = ["pending", "submitted", "review"];
// Anything else suspends login via user_status=1. The exact reason stays on
// brokers.kontor_status (plus reason_key in meta), not on user_status, so
// other account types sharing that column are unaffected.

const mapStatusToUserStatus = (status) => {
  const s = String(status || "").toLowerCase().trim();
  if (ACTIVE_STATUSES.includes(s)) return 0;
  if (PENDING_STATUSES.includes(s)) return 2;
  return 1;
};

const saveMeta = async (user_id, meta_key, meta_value) => {
  const existing = await db.UsersMeta.findOne({ where: { user_id, meta_key } });
  if (existing) {
    await existing.update({ meta_value: String(meta_value) });
  } else {
    await db.UsersMeta.create({ user_id, meta_key, meta_value: String(meta_value) });
  }
};

// Applies whatever subset of fields is present in body to an existing
// Kontor-sourced broker. Used by both the dedicated status endpoint and the
// general update endpoint since Kontor described both as "updates of the
// same record".
const applyKontorBrokerUpdate = async (broker, body) => {
  const {
    status,
    approved_at,
    package: kontorPackage,
    company = {},
    contact = {},
    bank,
    effective_at,
    reason_key,
    lang,
    landing_page_url,
  } = body;
  const { legal_name, legal_form, street, postcode, city, country, vat_id, vat_id_verified_at, tax_number } = company;
  const { name: contactName, email, phone, language } = contact;

  if (status) {
    await broker.update({ kontor_status: String(status).toLowerCase().trim() });
    await db.Users.update(
      { user_status: mapStatusToUserStatus(status) },
      { where: { ID: broker.user_id } }
    );
  }

  const userUpdates = {};
  if (contactName) userUpdates.display_name = contactName;
  if (email) userUpdates.user_email = email;
  if (legal_name) userUpdates.mystorekey = String(legal_name).replace(/ /g, "_");
  if (Object.keys(userUpdates).length > 0) {
    await db.Users.update(userUpdates, { where: { ID: broker.user_id } });
  }

  const resolvedLanguage = language || lang;

  const metaUpdates = {
    u_company: legal_name,
    u_legal_status: legal_form,
    u_street: street,
    u_location: city,
    u_postcode: postcode,
    u_country: country,
    u_vat_no: vat_id,
    u_vat_id_verified_at: vat_id_verified_at,
    u_tax_number: tax_number,
    u_phone: phone,
    language: resolvedLanguage
      ? (String(resolvedLanguage).toLowerCase().startsWith("de") ? "de-DE" : "en-US")
      : undefined,
    kontor_package: kontorPackage,
    kontor_approved_at: approved_at,
    kontor_effective_at: effective_at,
    kontor_reason_key: reason_key,
    // The Kontor-hosted page at goldsilberstore.com/partner/<name> — Kontor
    // owns name selection and hosting, this is just a read-only mirror so
    // our own dashboard can show/link it without building that logic twice.
    kontor_landing_page_url: landing_page_url,
  };

  for (const [key, value] of Object.entries(metaUpdates)) {
    if (value !== undefined && value !== null && value !== "") {
      await saveMeta(broker.user_id, key, value);
    }
  }

  if (bank) {
    await saveMeta(broker.user_id, "kontor_bank_details_encrypted", encryptJson(bank));
  }
};

// Kontor references brokers by our own broker_id going forward, with
// external_ref as a fallback (and mlm_customer_number kept for our own
// internal/legacy use only).
const findKontorBroker = async ({ broker_id, external_ref, customer_no, mlm_customer_number }) => {
  if (broker_id) {
    const broker = await db.Brokers.findOne({ where: { id: broker_id, source: "kontor" } });
    if (broker) return broker;
  }
  const ref = external_ref ?? customer_no;
  if (ref) {
    const broker = await db.Brokers.findOne({
      where: { source: "kontor", external_ref: String(ref) },
    });
    if (broker) return broker;
  }
  if (mlm_customer_number) {
    return db.Brokers.findOne({ where: { mlm_customer_number: String(mlm_customer_number) } });
  }
  return null;
};

module.exports = { applyKontorBrokerUpdate, findKontorBroker, mapStatusToUserStatus };
