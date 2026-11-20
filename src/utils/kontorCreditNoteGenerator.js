const db = require("../models");
const { fetchMetaByUserId } = require("./kontorPartnerFormatter");
const { generateAndSaveCreditNote } = require("./einvoiceGenerator");

// Convenience wrapper: builds the self-billed-invoice "broker" party straight
// from a Kontor broker's stored profile (same meta keys kontorPartnerFormatter
// already reads), so generating a real credit note doesn't require the
// caller to assemble that shape by hand.
// vat: optional override — generateCreditNoteXml determines it automatically
// (determineVat) from the broker's country when omitted.
const generateKontorCreditNote = async ({ brokerId, amount, periodLabel, documentId, buyerReference, vat }) => {
  const broker = await db.Brokers.findOne({
    where: { id: brokerId },
    include: [
      { model: db.Users, as: "user", attributes: ["display_name", "user_email"] },
      // attributes scoped explicitly — the live broker_bank_details table is
      // missing the user_id column the model declares (schema drift,
      // pre-existing, same reason createBrokerPayoutRequest.js scopes this
      // the same way); selecting it blind throws ER_BAD_FIELD_ERROR.
      { model: db.BrokerBankDetails, as: "bank_details", attributes: ["ac_holder_name", "iban", "bic_swift_code", "bank_name"], required: false },
    ],
  });
  if (!broker) throw new Error(`No broker found for id=${brokerId}`);

  const meta = (await fetchMetaByUserId([broker.user_id]))[broker.user_id] || {};
  const bankDetails = broker.bank_details;

  if (!bankDetails?.iban) {
    throw new Error(`generateKontorCreditNote: broker ${brokerId} has no bank details on file — required as the Payee on the e-invoice`);
  }

  const brokerParty = {
    name: meta.u_company || broker.user?.display_name || `Broker ${broker.id}`,
    // XRechnung wants an actual contact person, distinct from the company's
    // own legal name (a validator rejects repeating party.name here) — the
    // broker's own account name is the real contact person in this system.
    contactName: broker.user?.display_name || "Accounting",
    street: meta.u_street || "",
    postcode: meta.u_postcode || "",
    city: meta.u_location || "",
    countryCode: meta.u_country || "DE",
    vatId: meta.u_vat_no || null,
    email: broker.user?.user_email || null,
    phone: meta.u_phone || null,
    iban: bankDetails.iban,
    bic: bankDetails.bic_swift_code || null,
    accountHolderName: bankDetails.ac_holder_name || null,
  };

  const fileName = `creditnote_${documentId}.xml`;
  const result = generateAndSaveCreditNote(
    {
      documentId,
      buyerReference,
      periodLabel,
      broker: brokerParty,
      amount,
      description: periodLabel ? `Commission payout — ${periodLabel}` : "Commission payout",
      vat,
    },
    fileName
  );

  return { ...result, broker: brokerParty };
};

module.exports = { generateKontorCreditNote };
