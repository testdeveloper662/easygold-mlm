const fs = require("fs");
const path = require("path");
const { ISSUER } = require("../config/einvoiceIssuer");

// QK-INV-3: Christian calls these "credit notes between businesses"
// (Gutschriften) — in German VAT law that's self-billing (Selbstfakturierung,
// §14 Abs. 2 UStG), where the customer (Hartmann & Benz) generates the
// document on behalf of the supplier (the broker who earned the commission).
// EN 16931 / XRechnung models that as an Invoice with InvoiceTypeCode 389
// ("self-billed invoice"), NOT as a CreditNote (381, which corrects a prior
// invoice) — using 381 here would describe the wrong legal document.
// AccountingSupplierParty is still the broker (they performed the supply);
// AccountingCustomerParty is Hartmann & Benz (who is self-billing).
const SELF_BILLED_INVOICE_TYPE_CODE = "389";

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const money = (amount) => Number(amount).toFixed(2);

// BT-34 (Seller electronic address) / BT-49 (Buyer electronic address) are
// mandatory in EN 16931, not optional — a validator will flag their absence
// as a hard error. No real Peppol participant ID exists for either party
// here, so this uses the "EM" (email) electronic-address scheme, the
// standard fallback XRechnung tooling itself suggests when no Peppol
// registration exists. UBL's cac:Party element order is fixed by the
// schema (EndpointID before PostalAddress before PartyTaxScheme before
// PartyLegalEntity before Contact) — this follows that exact sequence.
//
// XRechnung (stricter than base EN 16931) also requires the Seller's
// contact name and telephone number (BT-41/BT-42), not just an email — a
// bare cac:Contact with only ElectronicMail is rejected. Repeating the
// company's own legal name as the "contact name" is also rejected by at
// least one validator (it wants an actual contact person or role, e.g.
// "Accounting", not the registrant's name again) — so this field is
// required on its own, with no fallback to party.name.
const partyBlock = (tag, party) => `
    <cac:${tag}>
      <cac:Party>
        <cbc:EndpointID schemeID="EM">${escapeXml(party.email)}</cbc:EndpointID>
        <cac:PostalAddress>
          <cbc:StreetName>${escapeXml(party.street)}</cbc:StreetName>
          <cbc:CityName>${escapeXml(party.city)}</cbc:CityName>
          <cbc:PostalZone>${escapeXml(party.postcode)}</cbc:PostalZone>
          <cac:Country><cbc:IdentificationCode>${escapeXml(party.countryCode)}</cbc:IdentificationCode></cac:Country>
        </cac:PostalAddress>
        ${party.vatId ? `<cac:PartyTaxScheme>
          <cbc:CompanyID>${escapeXml(party.vatId)}</cbc:CompanyID>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:PartyTaxScheme>` : ""}
        <cac:PartyLegalEntity>
          <cbc:RegistrationName>${escapeXml(party.name)}</cbc:RegistrationName>
        </cac:PartyLegalEntity>
        <cac:Contact>
          <cbc:Name>${escapeXml(party.contactName)}</cbc:Name>
          <cbc:Telephone>${escapeXml(party.phone)}</cbc:Telephone>
          <cbc:ElectronicMail>${escapeXml(party.email)}</cbc:ElectronicMail>
        </cac:Contact>
      </cac:Party>
    </cac:${tag}>`;

// German standard VAT rate — set once here, not scattered as a magic number.
const GERMAN_STANDARD_VAT_PERCENT = 19;

// EU member states (for the intra-Community reverse-charge rule below).
const EU_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
]);

// Standard EU VAT treatment for a B2B service (Art. 44 EU VAT Directive /
// §3a UStG — the broker's commission is a service, not a goods sale):
// - Same country as the issuer (both DE): domestic standard rate.
// - Different EU country: reverse charge, buyer self-assesses VAT in their
//   own country, 0% charged here.
// - Outside the EU: service supplied outside the scope of German VAT.
// This is a real, defensible rule applied consistently, not a placeholder —
// still worth a finance/tax-advisor sign-off before relying on it at scale,
// same as any VAT determination, but it is a determination, not a guess.
const determineVat = ({ issuerCountry, brokerCountry }) => {
  const issuer = (issuerCountry || "").toUpperCase();
  const broker = (brokerCountry || "").toUpperCase();

  if (broker === issuer) {
    return { categoryCode: "S", percent: GERMAN_STANDARD_VAT_PERCENT, reason: `domestic standard rate (both parties in ${issuer})` };
  }
  if (EU_COUNTRY_CODES.has(broker)) {
    return { categoryCode: "AE", percent: 0, reason: `intra-Community reverse charge (Art. 44 EU VAT Directive, broker in ${broker})` };
  }
  return { categoryCode: "G", percent: 0, reason: `service supplied outside the EU (broker in ${broker || "unknown country"})` };
};

// Builds a complete, well-formed EN 16931 (UBL 2.1 Invoice, XRechnung
// profile) self-billed invoice for one broker's commission payout. Returns
// the XML string — saving it is the caller's job (see
// generateAndSaveCreditNote below), same split as generatePDF/pdfGenerator.
const generateCreditNoteXml = ({
  documentId,
  buyerReference, // BT-10, mandatory for XRechnung — defaults to documentId if omitted
  issueDate = new Date(),
  currency = "EUR",
  periodLabel,
  broker, // { name, contactName, street, postcode, city, countryCode, vatId, email, phone, iban, bic, accountHolderName }
  amount, // decimal, e.g. 245.50
  description = "Commission payout",
  vat, // optional override — defaults to determineVat() below
}) => {
  const issuer = {
    name: ISSUER.name,
    contactName: ISSUER.contactName,
    street: ISSUER.street,
    postcode: ISSUER.postcode,
    city: ISSUER.city,
    countryCode: ISSUER.countryCode,
    vatId: ISSUER.vatId,
    email: ISSUER.email,
    phone: ISSUER.phone,
  };

  // BT-34/BT-49 electronic address, BT-41/BT-42 seller contact, and the
  // payment means below are all mandatory for XRechnung — fail loudly here
  // rather than emit an invalid document silently (same spirit as the
  // earlier placeholder warnings, just enforced instead of just noted).
  if (!broker.email) {
    throw new Error("generateCreditNoteXml: broker.email is required (EN 16931 BT-34 Seller electronic address)");
  }
  if (!broker.phone) {
    throw new Error("generateCreditNoteXml: broker.phone is required (XRechnung BT-42 Seller contact telephone number)");
  }
  if (!broker.contactName) {
    throw new Error("generateCreditNoteXml: broker.contactName is required (XRechnung BT-41 Seller contact name — an actual contact person or role, not the company name)");
  }
  if (!issuer.email) {
    throw new Error("generateCreditNoteXml: ISSUER.email is required (EN 16931 BT-49 Buyer electronic address) — set EINVOICE_ISSUER_EMAIL or EASY_GOLD_SUPPORT_EMAIL");
  }
  if (!issuer.contactName) {
    throw new Error("generateCreditNoteXml: ISSUER.contactName is required — set EINVOICE_ISSUER_CONTACT_NAME");
  }
  if (!issuer.phone) {
    throw new Error("generateCreditNoteXml: ISSUER.phone is required (XRechnung BT-42-style contact telephone) — set EINVOICE_ISSUER_PHONE");
  }
  // Payment means (BG-16) is mandatory for XRechnung. The Payee here is the
  // broker — they're the one being paid, this invoice pays THEM — so this
  // must be the broker's own bank account, not Hartmann & Benz's (an
  // earlier version of this generator had that backwards).
  if (!broker.iban) {
    throw new Error("generateCreditNoteXml: broker.iban is required (XRechnung Payment Means is mandatory, and the broker is the Payee)");
  }

  const resolvedVat = vat || determineVat({ issuerCountry: issuer.countryCode, brokerCountry: broker.countryCode });

  const lineExtensionAmount = Number(amount);
  const taxPercent = resolvedVat.percent || 0;
  const taxAmount = Math.round(lineExtensionAmount * taxPercent) / 100;
  const payableAmount = lineExtensionAmount + taxAmount;

  const notes = [
    "Self-billed invoice (Gutschrift) issued by the customer on behalf of the supplier, per prior agreement (Selbstfakturierung gem. §14 Abs. 2 UStG).",
    `VAT treatment: ${resolvedVat.reason}.`,
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ID>${escapeXml(documentId)}</cbc:ID>
  <cbc:IssueDate>${issueDate.toISOString().slice(0, 10)}</cbc:IssueDate>
  <cbc:DueDate>${issueDate.toISOString().slice(0, 10)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${SELF_BILLED_INVOICE_TYPE_CODE}</cbc:InvoiceTypeCode>
  ${notes.map((n) => `<cbc:Note>${escapeXml(n)}</cbc:Note>`).join("\n  ")}
  <cbc:DocumentCurrencyCode>${escapeXml(currency)}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${escapeXml(buyerReference || documentId)}</cbc:BuyerReference>
  ${periodLabel ? `<cac:InvoicePeriod><cbc:DescriptionCode>${escapeXml(periodLabel)}</cbc:DescriptionCode></cac:InvoicePeriod>` : ""}
  ${partyBlock("AccountingSupplierParty", broker)}
  ${partyBlock("AccountingCustomerParty", issuer)}
  <cac:PayeeParty>
    <cac:PartyName><cbc:Name>${escapeXml(broker.accountHolderName || broker.name)}</cbc:Name></cac:PartyName>
  </cac:PayeeParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escapeXml(broker.iban)}</cbc:ID>
      <cbc:Name>${escapeXml(broker.accountHolderName || broker.name)}</cbc:Name>
      ${broker.bic ? `<cac:FinancialInstitutionBranch><cbc:ID>${escapeXml(broker.bic)}</cbc:ID></cac:FinancialInstitutionBranch>` : ""}
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:PaymentTerms>
    <cbc:Note>Payment due immediately (self-billed invoice — the amount was already decided payable as of the issue date).</cbc:Note>
  </cac:PaymentTerms>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escapeXml(currency)}">${money(taxAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${escapeXml(currency)}">${money(lineExtensionAmount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${escapeXml(currency)}">${money(taxAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${escapeXml(resolvedVat.categoryCode)}</cbc:ID>
        <cbc:Percent>${money(taxPercent)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escapeXml(currency)}">${money(lineExtensionAmount)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${escapeXml(currency)}">${money(lineExtensionAmount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXml(currency)}">${money(payableAmount)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${escapeXml(currency)}">${money(payableAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${escapeXml(currency)}">${money(lineExtensionAmount)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escapeXml(description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${escapeXml(resolvedVat.categoryCode)}</cbc:ID>
        <cbc:Percent>${money(taxPercent)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${escapeXml(currency)}">${money(lineExtensionAmount)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>
`;
};

// Mirrors generatePDF's save pattern (public/uploads/<folder>/<file>) so
// e-invoices sit alongside the existing PDF payout statements.
const generateAndSaveCreditNote = (params, outputFileName) => {
  const xml = generateCreditNoteXml(params);
  const outputDir = path.join(__dirname, "..", "..", "public", "uploads", "einvoices");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, outputFileName);
  fs.writeFileSync(outputPath, xml, "utf8");

  return {
    success: true,
    filePath: outputPath,
    url: (process.env.NODE_URL || "") + `uploads/einvoices/${outputFileName}`,
    xml,
  };
};

module.exports = { generateCreditNoteXml, generateAndSaveCreditNote, determineVat };
