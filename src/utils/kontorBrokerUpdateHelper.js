const db = require("../models");

// Kontor's own status vocabulary isn't fully pinned down yet (their example
// payload used "approved" as the initial state, not "activated"), so this
// maps loosely by intent rather than an exact enum match.
const ACTIVE_STATUSES = ["approved", "activated", "active"];
const PENDING_STATUSES = ["pending", "submitted", "review"];
// Anything else (blocked, deactivated, suspended, rejected, terminated,
// cancelled, ...) suspends login via user_status=1. The exact reason stays
// on brokers.kontor_status, not on user_status, so other account types
// sharing that column are unaffected.

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

// Applies whatever subset of {status, company, contact, package, approved_at,
// activated_at} is present in body to an existing Kontor-sourced broker.
// Used by both the dedicated status endpoint and the general update endpoint
// since Kontor described both as "updates of the same record".
const applyKontorBrokerUpdate = async (broker, body) => {
  const { status, approved_at, activated_at, package: kontorPackage, company = {}, contact = {} } = body;
  const { legal_name, legal_form, street, postcode, city, country, vat_id } = company;
  const { name: contactName, email, phone, locale } = contact;

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

  const metaUpdates = {
    u_company: legal_name,
    u_legal_status: legal_form,
    u_street: street,
    u_location: city,
    u_postcode: postcode,
    u_country: country,
    u_vat_no: vat_id,
    u_phone: phone,
    language: locale ? (String(locale).toLowerCase().startsWith("de") ? "de-DE" : "en-US") : undefined,
    kontor_package: kontorPackage,
    kontor_approved_at: approved_at,
    kontor_activated_at: activated_at,
  };

  for (const [key, value] of Object.entries(metaUpdates)) {
    if (value !== undefined && value !== null && value !== "") {
      await saveMeta(broker.user_id, key, value);
    }
  }
};

const findKontorBroker = async ({ customer_no, mlm_customer_number }) => {
  if (customer_no) {
    const broker = await db.Brokers.findOne({
      where: { source: "kontor", external_ref: String(customer_no) },
    });
    if (broker) return broker;
  }
  if (mlm_customer_number) {
    return db.Brokers.findOne({ where: { mlm_customer_number: String(mlm_customer_number) } });
  }
  return null;
};

module.exports = { applyKontorBrokerUpdate, findKontorBroker, mapStatusToUserStatus };
