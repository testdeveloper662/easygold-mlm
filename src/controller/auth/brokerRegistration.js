require("dotenv").config();
const db = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const { generateAgreementPDF } = require("../../utils/agreementPdfHelper");
const { generateImageUrl } = require("../../utils/Helper");
const { generatePartnerShipPDF } = require("../../utils/partnerShipPdfHelper");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const SendEmailHelper = require("../../utils/sendEmailHelper");
const { generatePartnerPDF } = require("../../utils/partnerPdfHelper");
const { createStoreUser } = require("../../utils/registerStoreUserHelper");
const { getBrokerLevel } = require("../../utils/brokerLevelHelper");

const JWT_ACCESS_TOKEN = process.env.JWT_ACCESS_TOKEN;
const MAIL_SENDER = process.env.MAIL_SENDER;

const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const getMetaValue = (metaArray, key) => {
  return metaArray?.find(m => m.meta_key === key)?.meta_value || null;
};

const formatLegalDate = (dateInput) => {
  const date = new Date(dateInput);

  const day = date.getDate();

  const suffix =
    day > 3 && day < 21
      ? "th"
      : ["th", "st", "nd", "rd"][day % 10] || "th";

  return {
    day: `${day}${suffix}`,
    month: date.toLocaleString("en-US", { month: "long" }),
    year: date.getFullYear(),
  };
};

const getSignatureImgHtml = (relativePath) => {
  if (!relativePath || relativePath === "null" || relativePath === "undefined") return "";
  try {
    const cleanPath = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
    const fullPath = path.join(__dirname, "../../public", cleanPath);
    if (fs.existsSync(fullPath)) {
      const ext = path.extname(fullPath).replace(".", "") || "png";
      const base64 = fs.readFileSync(fullPath).toString("base64");
      return `<img src="data:image/${ext};base64,${base64}" style="width:150px;height:100px;object-fit:contain;" />`;
    }
  } catch (err) {
    console.error("[getSignatureImgHtml] Error reading signature file for PDF:", err);
  }
  const cleanRel = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
  const baseUrl = process.env.NODE_URL || "";
  const finalUrl = baseUrl.endsWith("/") ? `${baseUrl}${cleanRel}` : `${baseUrl}/${cleanRel}`;
  return `<img src="${finalUrl}" style="width:150px;height:100px;object-fit:contain;" />`;
};

const runBrokerRegisterBackground = async ({
  fullName,
  username,
  u_street_no,
  address,
  city,
  country,
  postalCode,
  languageForApi,
  ip,
  parentBroker,
  apiResponse,
  isAdminParent,
  veriff_session_id,
  phone,
  vatId,
  taxNumber,
  website,
  lang,
  languageParam,
  email,
  mobile,
  company,
  newReferralCode,
  banks,
  legalStatus,
}) => {

  try {
    const userSign = await db.UsersMeta.findOne({
      where: {
        user_id: apiResponse.data?.data?.user_id,
        meta_key: "signatureData"
      },
      attributes: ["meta_value"],
      raw: true
    });

    const addressParts = [u_street_no, address, city, postalCode, country]
      .map(v => v?.toString().trim())                                          // remove spaces
      .filter(v => v && v !== "undefined" && v !== "null");                    // remove bad values

    const formattedAddress = addressParts.join(", ");

    const parentCompanyName = getMetaValue(
      parentBroker.user?.user_meta,
      "u_company"
    );

    const parentSignature = getMetaValue(
      parentBroker.user?.user_meta,
      "signatureData"
    );

    const parentstreetno = getMetaValue(
      parentBroker.user?.user_meta,
      "u_street_no"
    );

    const parentaddress = getMetaValue(
      parentBroker.user?.user_meta,
      "u_street"
    );

    const parentcity = getMetaValue(
      parentBroker.user?.user_meta,
      "u_location"
    );

    const parentpostalcode = getMetaValue(
      parentBroker.user?.user_meta,
      "u_postcode"
    );

    const parentCountry = getMetaValue(
      parentBroker.user?.user_meta,
      "u_country"
    )

    const parentaddressParts = [parentstreetno, parentaddress, parentcity, parentpostalcode, parentCountry]
      .map(v => v?.toString().trim())                                          // remove spaces
      .filter(v => v && v !== "undefined" && v !== "null");                    // remove bad values

    const parentformattedAddress = parentaddressParts.join(", ");

    const parentVatId = getMetaValue(
      parentBroker.user?.user_meta,
      "u_vat_no"
    )

    const parentTaxId = getMetaValue(
      parentBroker.user?.user_meta,
      "u_tax_no"
    )

    const parentPhone = getMetaValue(
      parentBroker.user?.user_meta,
      "u_phone"
    )

    const parentInfoParts = [parentBroker.user?.display_name, parentVatId, parentTaxId, parentformattedAddress, parentPhone]
      .map(v => v?.toString().trim())                                          // remove spaces
      .filter(v => v && v !== "undefined" && v !== "null");                    // remove bad values

    const parentInfo = parentInfoParts.join(", ");

    const partnerInfoParts = [username, vatId, taxNumber, formattedAddress, phone]
      .map(v => v?.toString().trim())                                          // remove spaces
      .filter(v => v && v !== "undefined" && v !== "null");                    // remove bad values

    const partnerInfo = partnerInfoParts.join(", ");

    const brokerInfoParts = [username, vatId, taxNumber, formattedAddress, phone, website]
      .map(v => v?.toString().trim())                                          // remove spaces
      .filter(v => v && v !== "undefined" && v !== "null");                    // remove bad values

    const brokerInfo = brokerInfoParts.join(", ");

    const { day, month, year } = formatLegalDate(new Date());

    const userIdVal = apiResponse.data?.data?.user_id || "";

    let partnerPdfData = {
      b2b_name: fullName || "",
      b2b_address: formattedAddress || "",
      b2b_location: city || "",
      b2b_company: company || "",
      company: company || "",
      b2b_email: email || "",
      email: email || "",
      b2b_signature: getSignatureImgHtml(userSign?.meta_value),
      b2b_userid: userIdVal,
      user_id: userIdVal,
      b2b_user_id: userIdVal,
      parent_b2b_signature: getSignatureImgHtml(parentSignature),
      date: new Date().toISOString().split("T")[0],
      ip_address: ip || "",
      parent_b2b_name: parentBroker.user?.display_name || "",
      parent_b2b_address: parentformattedAddress || "",
      parent_b2b_email: parentBroker.user?.user_email || "",
      parent_b2b_location: parentcity || "",
      language: languageForApi,
      day: day,
      month: month,
      year: year,
      legal_status: legalStatus || "N/A",
      legalStatus: legalStatus || "N/A",
      b2b_legal_status: legalStatus || "N/A",
      b2b_vat_id: vatId || "N/A",
      partner_vat_id: vatId || "N/A",
      vat_id: vatId || "N/A",
      vatId: vatId || "N/A",
      b2b_info: partnerInfo || "N/A",
      b2b_info_full: brokerInfo || "N/A",
    };

    console.log("📄 [partnerPdfData Data Check]:", JSON.stringify(partnerPdfData, null, 2));

    let partnerDocsData = await generatePartnerPDF(partnerPdfData);

    const user_id = apiResponse.data?.data?.user_id;
    console.log("user_id:", user_id);

    if (!user_id) {
      console.error("[BrokerRegistration] External API did not return a valid user_id");
      return;
    }

    // Verify user exists in database before creating broker (with retries for replication/transaction lag)
    let userExists = null;
    for (let i = 0; i < 5; i++) {
      userExists = await db.Users.findOne({
        where: { ID: user_id },
      });
      if (userExists) break;
      console.log(`[BrokerRegistration] User ${user_id} not found in database yet, retrying in 1s... (Attempt ${i + 1}/5)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!userExists) {
      console.error(`[BrokerRegistration] User with ID ${user_id} was created in external system but not found in database after 5 attempts.`);
      return;
    }

    // Ensure user role_id is set to 2 for broker
    await db.Users.update(
      { role_id: 2 },
      { where: { ID: user_id } }
    );

    console.log(partnerDocsData, "partnerDocsData");

    // Map frontend language codes to database format (we'll save this at the end)
    // Accept both 'lang' and 'language' from request body (frontend sends 'language')
    const langParam = lang || languageParam; // Use 'lang' if provided, otherwise use 'language'
    let languageValue = "en-US"; // Default to English

    if (langParam) {
      const langStr = String(langParam).toLowerCase().trim();
      if (langStr === "de-DE" || langStr === "de" || langStr === "german" || langStr === "deutsch") {
        languageValue = "de-DE"; // German format
      } else if (langStr === "en" || langStr === "english") {
        languageValue = "en-US"; // English format
      }
    }
    console.log(`[BrokerRegistration] Language mapping - lang: "${lang}", language: "${languageParam}", using: "${langParam}", mapped to: "${languageValue}"`);

    // Create broker entry
    const broker = await db.Brokers.create({
      user_id: user_id,
      parent_id: isAdminParent ? null : parentBroker?.id || null,
      referral_code: newReferralCode,
      referred_by_code: isAdminParent ? process.env.ADMIN_REFERRAL_CODE : parentBroker.referral_code,
      children_count: 0,
      total_commission_amount: 0,
      veriff_session_id: veriff_session_id || null,
      untermaklervertrag_doc: `uploads/agreements/${partnerDocsData.untermaklervertrag_doc}`,
      maklervertrag_doc: `uploads/agreements/${partnerDocsData.maklervertrag_doc}`,
      inc_partnership_doc: `uploads/agreements/${partnerDocsData.inc_partnership_doc}`,
      llc_partnership_doc: `uploads/agreements/${partnerDocsData.llc_partnership_doc}`,
      goldflex_partnership_doc: `uploads/agreements/${partnerDocsData.goldflex_partnership_doc}`,
      hartmann_benz_gmbh_doc: `uploads/agreements/${partnerDocsData["hartmann_benz_gmbh_white-label_service_doc"]}`,
      binding_loi_doc: `uploads/agreements/${partnerDocsData.binding_loi_doc}`,
      partner_tax_billing_doc: `uploads/agreements/${partnerDocsData.partner_tax_billing_doc}`,
      uk_company_sales_platform_doc: `uploads/agreements/${partnerDocsData.uk_company_sales_platform_doc}`,
      ncnda_doc: partnerDocsData.ncnda_doc ? `uploads/agreements/${partnerDocsData.ncnda_doc}` : null,
      option_subscription_doc: partnerDocsData.option_subscription_doc ? `uploads/agreements/${partnerDocsData.option_subscription_doc}` : null,
    });

    // Create affiliate entry (every Broker is an Affiliate)
    if (db.Affiliates) {
      try {
        await db.Affiliates.create({
          user_id: user_id,
          parent_id: isAdminParent ? null : parentBroker?.id || null,
          referral_code: newReferralCode,
          referred_by_code: isAdminParent ? process.env.ADMIN_REFERRAL_CODE : parentBroker.referral_code,
          person_typ: legalStatus || "",
          land: country || "",
          steuer_id: taxNumber || "",
          children_count: 0,
          total_commission_amount: 0,
          veriff_session_id: veriff_session_id || null,
          untermaklervertrag_doc: `uploads/agreements/${partnerDocsData.untermaklervertrag_doc}`,
          maklervertrag_doc: `uploads/agreements/${partnerDocsData.maklervertrag_doc}`,
          inc_partnership_doc: `uploads/agreements/${partnerDocsData.inc_partnership_doc}`,
          llc_partnership_doc: `uploads/agreements/${partnerDocsData.llc_partnership_doc}`,
          goldflex_partnership_doc: `uploads/agreements/${partnerDocsData.goldflex_partnership_doc}`,
          hartmann_benz_gmbh_doc: `uploads/agreements/${partnerDocsData["hartmann_benz_gmbh_white-label_service_doc"]}`,
          binding_loi_doc: `uploads/agreements/${partnerDocsData.binding_loi_doc}`,
          partner_tax_billing_doc: `uploads/agreements/${partnerDocsData.partner_tax_billing_doc}`,
          uk_company_sales_platform_doc: `uploads/agreements/${partnerDocsData.uk_company_sales_platform_doc}`,
          ncnda_doc: partnerDocsData.ncnda_doc ? `uploads/agreements/${partnerDocsData.ncnda_doc}` : null,
          option_subscription_doc: partnerDocsData.option_subscription_doc ? `uploads/agreements/${partnerDocsData.option_subscription_doc}` : null,
        });
      } catch (affErr) {
        console.error("Error inserting into Affiliates table during broker registration:", affErr.message);
      }
    }

    const invitation = await db.BrokerInvitations.findOne({
      where: {
        email
      },
    });

    if (invitation) {
      try {
        await db.BrokerInvitations.update({
          invitation_status: "REGISTERED",
        });
      } catch (error) {
        console.log("=========================FAILED TO UPDATE INVITATION RECORD==============");
        console.log("error = ", error);
        console.log("=========================FAILED TO UPDATE INVITATION RECORD==============");
      }
    } else {
      await db.BrokerInvitations.create({
        email,
        invitation_status: "REGISTERED",
        invited_by: parentBroker?.id,
        last_invitation_sent: new Date(),
      });
      console.log("===================NEW EMAIL WITH INVITATION=====================");
    }


    // Update parent's children count
    if (!isAdminParent && parentBroker) {
      await parentBroker.update({
        children_count: parentBroker.children_count + 1,
      });
    }

    // ✅ Save language to UsersMeta table
    console.log(`[BrokerRegistration] Saving language to UsersMeta - user_id: ${user_id}, language: "${languageValue}"`);

    try {
      // Check if language meta already exists
      const existingLanguageMeta = await db.UsersMeta.findOne({
        where: {
          user_id: user_id,
          meta_key: "language",
        },
      });

      if (existingLanguageMeta) {
        // Update existing entry
        await existingLanguageMeta.update({
          meta_value: languageValue,
        });
        console.log(`[BrokerRegistration] ✅ Updated language meta: "${languageValue}"`);
      } else {
        // Create new entry
        await db.UsersMeta.create({
          user_id: user_id,
          meta_key: "language",
          meta_value: languageValue,
        });
        console.log(`[BrokerRegistration] ✅ Created language meta: "${languageValue}"`);
      }

      // Verify it was saved
      const verifyMeta = await db.UsersMeta.findOne({
        where: {
          user_id: user_id,
          meta_key: "language",
        },
      });

      if (verifyMeta) {
        console.log(`[BrokerRegistration] ✅ Verified language saved: "${verifyMeta.meta_value}"`);
      } else {
        console.error(`[BrokerRegistration] ❌ ERROR: Language meta not found after save`);
      }
    } catch (langError) {
      console.error(`[BrokerRegistration] ❌ Error saving language:`, langError);
      // Don't fail the registration if language save fails
    }

    // Create user object for frontend
    const userResponse = {
      ID: user_id,
      fullName,
      email,
      username,
      referral_code: newReferralCode,
      role: "BROKER",
    };

    // Generate JWT token
    const token = jwt.sign({ user: userResponse }, JWT_ACCESS_TOKEN, {
      expiresIn: process.env.JWT_EXPIRE || "90d",
    });

    const templateVariables = {
      name: fullName,
      email: email,
      mobile_number: mobile,
    };

    let emailData;
    try {
      // Template ID 92 used (adjust as required)
      emailData = await getRenderedEmail(96, parentBroker.language, templateVariables);
    } catch (templateError) {
      console.error(templateError);
      throw new Error(
        "Email template (ID: 92) not found. Please ensure it exists in 6lwup_email_view table."
      );
    }

    let finalFrom = MAIL_SENDER; // fallback to verified sender domain

    mailOptions = {
      from: finalFrom,
      to: parentBroker.user?.user_email,
      subject: emailData.subject,
      html: emailData.htmlContent,
    };

    await SendEmailHelper(mailOptions.subject, mailOptions.html, mailOptions.to, null, null, from = null);

    console.log(`Broker Registeration Process Completed Successfully for -> ${fullName} ${email}`);

    await db.Users.update(
      {
        deleted_at: null,
      },
      {
        where: {
          ID: apiResponse.data?.data?.user_id,
        },
      }
    );
  } catch (error) {
    console.error("Error in BrokerRegistration:", error);
  }
};

const registerViaExternalApi = async (req, fields) => {
  const form = new FormData();
  form.append("veriff_session_id", fields.veriffId);
  form.append("u_display_name", fields.fullName);
  form.append("u_company", fields.company);
  form.append("u_contact_person", fields.contactPerson);
  form.append("u_street_no", fields.u_street_no);
  form.append("u_street", fields.address);
  form.append("u_location", fields.city);
  form.append("u_postcode", fields.postalCode);
  form.append("u_country", fields.country);
  form.append("u_vat_no", fields.vatId || "");
  form.append("u_tax_no", fields.taxNumber || "");
  form.append("u_email", fields.email);
  form.append("u_landline_number", fields.phone);
  form.append("u_phone", fields.mobile);
  form.append("u_username", fields.username);
  form.append("u_password", fields.password);
  form.append("u_web_site", fields.website);
  form.append("u_account_owner", fields.fullName);
  form.append("u_i_or_we", "I");
  form.append("u_describe_business", fields.u_describe_business || "");
  form.append("u_business_purpose", fields.u_business_purpose || "");
  form.append("u_export_import", fields.u_export_import);
  form.append("u_country_origin", fields.u_country_origin);
  form.append("u_recipient_country", fields.u_recipient_country);
  form.append("selectedDate", new Date().toISOString().split("T")[0]);
  form.append("banks", JSON.stringify(fields.banks));
  form.append("taxJurisdiction", fields.taxJurisdiction || "");
  form.append("legalStatus", fields.legalStatus || "");
  form.append("taxNumberLabel", fields.taxNumberLabel || "");
  form.append("vatIdLabel", fields.vatIdLabel || "");

  form.append("business_activity_check", fields.business_activity_check);
  form.append("business_activity_other", fields.business_activity_other || "");
  form.append("businessDescription", fields.businessDescription || "");
  form.append("purpose_of_business_relationship_check", fields.purpose_of_business_relationship_check);
  form.append("businesspurposeother", fields.businesspurposeother || "");
  form.append("thirdPartyTransactions", fields.thirdPartyTransactions);
  form.append("beneficialOwners", fields.beneficialOwners);
  form.append("beneficialOwnersDetails", fields.beneficialOwnersDetails || "");
  form.append("monthlyVolume", fields.monthlyVolume);
  form.append("investigationProceedings", fields.investigationProceedings);
  form.append("internationalTrade", fields.u_export_import);
  form.append("language", fields.languageForApi);
  form.append("u_date", fields.idExpiryDate || new Date().toISOString().split("T")[0]);
  form.append("role_id", 2);

  if (req.files?.u_travel_id?.[0]) {
    const file = req.files.u_travel_id[0];
    form.append("u_travel_id", file.buffer, { filename: file.originalname });
  }

  if (req.files?.bill_upload?.[0]) {
    const file = req.files.bill_upload[0];
    form.append("bill_upload", file.buffer, { filename: file.originalname });
  }

  if (req.files?.u_trade_register?.[0]) {
    const file = req.files.u_trade_register[0];
    form.append("u_trade_register", file.buffer, { filename: file.originalname });
  }

  if (req.files?.signatureData?.[0]) {
    const file = req.files.signatureData[0];
    const sigBase64 = file.buffer.toString("base64");
    form.append("signatureData", sigBase64);
  }

  return axios.post(`${process.env.EASY_GOLD_URL}/api/Register`, form, {
    headers: form.getHeaders(),
  });
};

const registerViaLocalHelper = async (req, fields) => {
  const registrationResult = await createStoreUser({
    u_display_name: fields.fullName,
    u_company: fields.company,
    u_contact_person: fields.contactPerson,
    u_street_no: fields.u_street_no,
    u_street: fields.address,
    u_location: fields.city,
    u_postcode: fields.postalCode,
    u_country: fields.country,
    u_vat_no: fields.vatId || "",
    u_tax_no: fields.taxNumber || "",
    u_email: fields.email,
    u_phone: fields.phone,
    u_landline_number: fields.mobile,
    u_username: fields.username,
    u_password: fields.password,
    u_web_site: fields.website,
    u_account_owner: fields.fullName,
    u_country_origin: fields.u_country_origin,
    u_recipient_country: fields.u_recipient_country,
    banks: fields.banks,
    taxJurisdiction: fields.taxJurisdiction,
    legalStatus: fields.legalStatus,
    taxNumberLabel: fields.taxNumberLabel,
    vatIdLabel: fields.vatIdLabel,
    business_activity_check: fields.business_activity_check,
    business_activity_other: fields.business_activity_other,
    businessDescription: fields.businessDescription,
    purpose_of_business_relationship_check: fields.purpose_of_business_relationship_check,
    businesspurposeother: fields.businesspurposeother,
    internationalTrade: fields.u_export_import,
    thirdPartyTransactions: fields.thirdPartyTransactions,
    beneficialOwners: fields.beneficialOwners,
    beneficialOwnersDetails: fields.beneficialOwnersDetails,
    monthlyVolume: fields.monthlyVolume,
    investigationProceedings: fields.investigationProceedings,
    language: fields.languageForApi,
    u_date: fields.idExpiryDate || new Date().toISOString().split("T")[0],
    veriff_session_id: fields.veriffId,
    files: req.files,
    role_id: 2,
  });

  return { data: registrationResult };
};

const BrokerRegistration = async (req, res) => {
  console.log("===========BrokerRegistration body = ", req.body);
  console.log("===========BrokerRegistration files = ", req.files);

  let ip =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  try {
    const {
      veriffId,
      referralCode,
      fullName,
      company,
      contactPerson,
      address,
      postalCode,
      city,
      country,
      vatId,
      taxNumber,
      email,
      phone,
      mobile,
      website,
      username,
      password,
      u_street_no,
      street,
      u_location,
      u_describe_business,
      u_business_purpose,
      u_export_import,
      u_country_origin,
      u_recipient_country,
      idExpiryDate,
      veriff_session_id,
      lang,
      language: languageParam, // Accept both 'lang' and 'language' from frontend (rename to avoid conflict)
      business_activity_check,
      business_activity_other,
      businessDescription,
      purpose_of_business_relationship_check,
      businesspurposeother,
      thirdPartyTransactions,
      beneficialOwners,
      beneficialOwnersDetails,
      monthlyVolume,
      investigationProceedings,
      banks,
      taxJurisdiction,
      legalStatus,
      taxNumberLabel,
      vatIdLabel,
    } = req.body;

    if (
      !referralCode ||
      !fullName ||
      !company ||
      !contactPerson ||
      !postalCode ||
      !city ||
      !country ||
      !email ||
      !phone ||
      !mobile ||
      !username ||
      !password ||
      !idExpiryDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: referralCode, fullName, company, contactPerson, postalCode, city, country, email, phone, mobile, username, password, idExpiryDate",
      });
    }
    console.log("111111111111111111111111");

    // Check if user already exists by email
    const existingUserByEmail = await db.Users.findOne({
      where: { user_email: email },
    });

    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists. Please use a different email address.",
      });
    }

    // // Check if username already exists
    const existingUserByUsername = await db.Users.findOne({
      where: { user_login: username },
    });

    if (existingUserByUsername) {
      return res.status(400).json({
        success: false,
        message: "This username is already taken. Please choose a different username.",
      });
    }

    // // Check if mystorekey already exists
    const existingUserByMyStore = await db.Users.findOne({
      where: { mystorekey: company },
    });

    if (existingUserByMyStore) {
      return res.status(400).json({
        success: false,
        message: "This company name is already taken. Please choose a different company name.",
      });
    }
    console.log("222222222222222222222222222");

    // Determine parent (admin or broker)
    const isAdminParent = referralCode === process.env.ADMIN_REFERRAL_CODE;
    let parentBroker = null;

    if (!isAdminParent) {
      parentBroker = await db.Brokers.findOne({
        where: { referral_code: referralCode },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: [
              "ID",
              "display_name",
              "user_email"
            ],
            include: [
              {
                model: db.UsersMeta,
                as: "user_meta",
                attributes: ["meta_key", "meta_value"],
                where: {
                  meta_key: ["u_street_no",
                    "u_street",
                    "u_location",
                    "u_postcode",
                    "signatureData",
                    "language", "u_company", "u_vat_no", "u_tax_no", "u_phone", "u_country", "u_postcode", "u_web_site"]
                },
                required: false
              }
            ]
          }
        ]
      });
      if (!parentBroker) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code",
        });
      }

      // Level check removed to allow referrals beyond level 5
    }
    console.log("3333333333333333333333333");

    const newReferralCode = generateReferralCode();
    console.log("444444444444444444444444444");

    // Determine language from request body (accept both 'lang' and 'language')
    // Map frontend language codes to database format
    const langForApi = lang || languageParam; // Use 'lang' if provided, otherwise use 'language'
    let languageForApi = "en-US"; // Default to English
    if (langForApi) {
      const langStr = String(langForApi).toLowerCase().trim();
      if (langStr === "de-DE" || langStr === "de" || langStr === "german" || langStr === "deutsch") {
        languageForApi = "de-DE"; // German format
      } else if (langStr === "en" || langStr === "english") {
        languageForApi = "en-US"; // English format
      }
    }
    console.log("[BrokerRegistration] Language for registration - lang:", lang, "language:", languageParam, "using:", langForApi, "-> Mapped to:", languageForApi);

    const registrationFields = {
      veriffId,
      fullName,
      company,
      contactPerson,
      u_street_no,
      address,
      city,
      postalCode,
      country,
      vatId,
      taxNumber,
      email,
      phone,
      mobile,
      username,
      password,
      website,
      u_describe_business,
      u_business_purpose,
      u_export_import,
      u_country_origin,
      u_recipient_country,
      banks,
      taxJurisdiction,
      legalStatus,
      taxNumberLabel,
      vatIdLabel,
      business_activity_check,
      business_activity_other,
      businessDescription,
      purpose_of_business_relationship_check,
      businesspurposeother,
      thirdPartyTransactions,
      beneficialOwners,
      beneficialOwnersDetails,
      monthlyVolume,
      investigationProceedings,
      languageForApi,
      idExpiryDate,
    };

    let apiResponse;

    // =========================================================================
    // REGISTRATION METHOD TOGGLE (Comment/uncomment to toggle between APIs)
    // =========================================================================

    // Method 1: External API Call (axios)
    apiResponse = await registerViaExternalApi(req, registrationFields);

    // Method 2: Local API Call (direct database/helper)
    //apiResponse = await registerViaLocalHelper(req, registrationFields);

    // =========================================================================

    // Check if registration returned an error
    if (!apiResponse.data?.success) {
      return res.status(400).json({
        success: false,
        message: apiResponse.data?.message || "Registration failed",
      });
    }

    await db.Users.update(
      {
        deleted_at: new Date(),
      },
      {
        where: {
          ID: apiResponse.data?.data?.user_id,
        },
      }
    );

    setImmediate(async () => {
      await runBrokerRegisterBackground({
        fullName,
        username,
        u_street_no,
        address,
        city,
        country,
        postalCode,
        languageForApi,
        ip,
        parentBroker,
        apiResponse,
        isAdminParent,
        veriff_session_id,
        phone,
        vatId: vatId || req.body.u_vat_no || req.body.vat_no || req.body.vat_id || "",
        taxNumber: taxNumber || req.body.u_tax_no || req.body.tax_no || "",
        website: website || req.body.u_web_site || "",
        lang,
        languageParam,
        email: email || req.body.u_email || "",
        mobile,
        company: company || req.body.u_company || "",
        newReferralCode,
        banks,
        legalStatus: legalStatus || req.body.person_typ || req.body.legal_status || "",
      });
    });

    return res.status(200).json({
      success: true,
      message: "Broker registered successfully",
      // data: {
      //   user: userResponse,
      //   token,
      // },
    });
  } catch (error) {
    console.error("Error in BrokerRegistration:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = BrokerRegistration;
