const fs = require("fs");
const path = require("path");
const { PDFDocument, PDFName, AFRelationship } = require("pdf-lib");
const { generatePDF } = require("./pdfGenerator");
const { generateCreditNoteXml, determineVat } = require("./einvoiceGenerator");
const { ISSUER } = require("../config/einvoiceIssuer");

// "factur-x.xml" is the required attachment filename per the Factur-X/ZUGFeRD
// spec — e-invoicing software looks for this exact name, not an arbitrary one.
const EMBEDDED_XML_FILENAME = "factur-x.xml";

const xmpPacket = ({ documentId, conformanceLevel = "EN 16931" }) => `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
    xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
   <pdfaid:part>3</pdfaid:part>
   <pdfaid:conformance>B</pdfaid:conformance>
   <fx:DocumentType>INVOICE</fx:DocumentType>
   <fx:DocumentFileName>${EMBEDDED_XML_FILENAME}</fx:DocumentFileName>
   <fx:Version>1.0</fx:Version>
   <fx:ConformanceLevel>${conformanceLevel}</fx:ConformanceLevel>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

// Builds a human-readable invoice page for the PDF side of the hybrid —
// the data passed to kontor_credit_note_template.html, mirroring the fields
// generateCreditNoteXml computes so the two halves of the hybrid agree.
const buildPdfTemplateData = ({ documentId, buyerReference, issueDate, periodLabel, currency, broker, amount, description, vat }) => {
  const resolvedVat = vat || determineVat({ issuerCountry: ISSUER.countryCode, brokerCountry: broker.countryCode });
  const net = Number(amount);
  const vatPercent = resolvedVat.percent || 0;
  const vatAmount = Math.round(net * vatPercent) / 100;
  const payable = net + vatAmount;

  const notes = [
    "Self-billed invoice (Gutschrift) issued by the customer on behalf of the supplier, per prior agreement (Selbstfakturierung gem. §14 Abs. 2 UStG).",
    `VAT treatment: ${resolvedVat.reason}.`,
  ];

  return {
    document_id: documentId,
    buyer_reference: buyerReference || documentId,
    issue_date: issueDate.toISOString().slice(0, 10),
    due_date: issueDate.toISOString().slice(0, 10),
    period_label: periodLabel || "-",
    currency,
    currency_symbol: currency === "EUR" ? "€" : currency + " ",
    supplier_name: broker.name,
    supplier_street: broker.street,
    supplier_postcode: broker.postcode,
    supplier_city: broker.city,
    supplier_country: broker.countryCode,
    supplier_vat_id: broker.vatId || "-",
    supplier_contact_name: broker.contactName || "",
    supplier_email: broker.email || "",
    supplier_phone: broker.phone || "",
    supplier_account_holder_name: broker.accountHolderName || broker.name,
    supplier_iban: broker.iban || "",
    supplier_bic: broker.bic || "",
    customer_name: ISSUER.name,
    customer_street: ISSUER.street,
    customer_postcode: ISSUER.postcode,
    customer_city: ISSUER.city,
    customer_country: ISSUER.countryCode,
    customer_vat_id: ISSUER.vatId,
    customer_contact_name: ISSUER.contactName || "",
    customer_email: ISSUER.email || "",
    customer_phone: ISSUER.phone || "",
    description,
    net_amount: net.toFixed(2),
    vat_percent: vatPercent.toFixed(2),
    vat_amount: vatAmount.toFixed(2),
    payable_amount: payable.toFixed(2),
    notes_html: notes.map((n) => `<p>${n}</p>`).join(""),
  };
};

// Factur-X/ZUGFeRD hybrid: a human-readable PDF with the EN 16931 XML
// embedded as a file attachment, so one document serves both a person
// opening it and a system parsing it.
//
// Caveat (documented here deliberately, not hidden): this attaches the XML
// and sets the XMP metadata ZUGFeRD-aware readers look for, but the PDF
// itself (Puppeteer's output) hasn't been run through a PDF/A-3 validator
// (e.g. veraPDF) — things strict PDF/A-3 conformance also requires, like an
// embedded ICC output intent and fully embedded fonts, aren't verified here.
// Good enough for a system to extract and process the XML; treat as a
// starting point, not an audited-compliant document, until that's run.
const generateHybridInvoice = async (params, outputFileName) => {
  const xml = generateCreditNoteXml(params);
  const pdfTemplateData = buildPdfTemplateData(params);

  const tempPdfName = `_tmp_${outputFileName.replace(/\.pdf$/i, "")}.pdf`;
  const pdfResult = await generatePDF(pdfTemplateData, "kontor_credit_note_template.html", "einvoices", tempPdfName);
  if (!pdfResult.success) {
    return pdfResult;
  }

  const pdfBytes = fs.readFileSync(pdfResult.filePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  await pdfDoc.attach(Buffer.from(xml, "utf8"), EMBEDDED_XML_FILENAME, {
    mimeType: "application/xml",
    description: "Factur-X/ZUGFeRD EN 16931 invoice data",
    creationDate: params.issueDate || new Date(),
    modificationDate: params.issueDate || new Date(),
    afRelationship: AFRelationship.Alternative,
  });

  const metadataStream = pdfDoc.context.stream(xmpPacket({ documentId: params.documentId }), {
    Type: "Metadata",
    Subtype: "XML",
  });
  const metadataRef = pdfDoc.context.register(metadataStream);
  pdfDoc.catalog.set(PDFName.of("Metadata"), metadataRef);

  const hybridBytes = await pdfDoc.save();

  const outputDir = path.join(__dirname, "..", "..", "public", "uploads", "einvoices");
  const outputPath = path.join(outputDir, outputFileName);
  fs.writeFileSync(outputPath, hybridBytes);
  fs.unlinkSync(pdfResult.filePath); // drop the intermediate PDF-only file

  return {
    success: true,
    filePath: outputPath,
    url: (process.env.NODE_URL || "") + `uploads/einvoices/${outputFileName}`,
    xml,
  };
};

module.exports = { generateHybridInvoice };
