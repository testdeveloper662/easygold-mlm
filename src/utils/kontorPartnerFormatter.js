const db = require("../models");
const { Op } = require("sequelize");

const META_KEYS = [
  "u_company",
  "u_legal_status",
  "u_street",
  "u_location",
  "u_postcode",
  "u_country",
  "u_vat_no",
  "u_vat_id_verified_at",
  "u_tax_number",
  "u_phone",
  "kontor_package",
  "kontor_approved_at",
  "kontor_bank_details_encrypted",
  "kontor_landing_page_url",
];

// Batch-fetches UsersMeta for a set of user_ids and groups it, so list
// endpoints don't run one query per row.
const fetchMetaByUserId = async (userIds) => {
  if (!userIds.length) return {};
  const rows = await db.UsersMeta.findAll({
    where: { user_id: { [Op.in]: userIds }, meta_key: { [Op.in]: META_KEYS } },
    raw: true,
  });
  const byUserId = {};
  rows.forEach((row) => {
    byUserId[row.user_id] = byUserId[row.user_id] || {};
    byUserId[row.user_id][row.meta_key] = row.meta_value;
  });
  return byUserId;
};

// Kontor references brokers by broker_id now; external_ref (their own
// customer number) and mlm_customer_number (our legacy internal id) are
// kept for reference/backward compatibility.
const formatPartner = (broker, user, meta = {}) => ({
  broker_id: broker.id,
  external_ref: broker.external_ref,
  mlm_customer_number: broker.mlm_customer_number,
  status: broker.kontor_status,
  company: {
    legal_name: meta.u_company || null,
    legal_form: meta.u_legal_status || null,
    street: meta.u_street || null,
    postcode: meta.u_postcode || null,
    city: meta.u_location || null,
    country: meta.u_country || null,
    vat_id: meta.u_vat_no || null,
    vat_id_verified_at: meta.u_vat_id_verified_at || null,
    tax_number: meta.u_tax_number || null,
  },
  contact: {
    name: user?.display_name || null,
    email: user?.user_email || null,
    phone: meta.u_phone || null,
  },
  // Never surface the decrypted bank data on a list/read call — just
  // whether one is on file.
  bank_on_file: Boolean(meta.kontor_bank_details_encrypted),
  package: meta.kontor_package || null,
  approved_at: meta.kontor_approved_at || null,
  // Kontor owns name selection and hosting for this page — we just mirror
  // whatever URL they send us via broker/update so our own dashboard can
  // show/link it without rebuilding that logic.
  landing_page_url: meta.kontor_landing_page_url || null,
  created_at: broker.createdAt,
  updated_at: broker.updatedAt,
});

module.exports = { fetchMetaByUserId, formatPartner };
