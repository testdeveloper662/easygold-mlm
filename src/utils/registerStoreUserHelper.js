require("dotenv").config();
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const db = require("../models");
const SendEmailHelper = require("./sendEmailHelper");

/**
 * Native Node re-implementation of the legacy PHP `Register` endpoint
 * (previously proxied via axios to `${EASY_GOLD_URL}/api/Register`).
 * Returns a shape compatible with what callers expected from the old
 * axios response: { success, message, data: { user_id } }.
 */

const saveBufferToPublicUploads = (buffer, folderName, originalname) => {
  const uploadDir = path.join(__dirname, "../../public/uploads", folderName);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const ext = path.extname(originalname || "") || "";
  const fileName = `${Date.now()}${ext}`;
  fs.writeFileSync(path.join(uploadDir, fileName), buffer);
  return `uploads/${folderName}/${fileName}`;
};

const saveUserMeta = async (user_id, meta_key, meta_value) => {
  await db.UsersMeta.create({
    user_id,
    meta_key,
    meta_value: meta_value === undefined || meta_value === null ? "" : String(meta_value),
  });
};

const parseVatId = (vatId, country) => {
  if (!vatId) return null;
  const cleanVat = vatId.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (cleanVat.length < 3) return null;

  // Check if first 2 characters are letters
  const firstTwo = cleanVat.substring(0, 2);
  const remaining = cleanVat.substring(2);
  if (/^[A-Z]{2}$/.test(firstTwo)) {
    return { countryCode: firstTwo, vatNumber: remaining };
  }

  // Fallback to mapping country parameter if first two are not letters
  if (country) {
    const cleanCountry = country.trim().toUpperCase();
    let countryCode = null;
    if (cleanCountry.length === 2) {
      countryCode = cleanCountry;
    } else {
      const countryMap = {
        "AFGHANISTAN": "AF", "EGYPT": "EG", "ALBANIA": "AL", "ALGERIA": "DZ",
        "ANDORRA": "AD", "ANGOLA": "AO", "ANTIGUA AND BARBUDA": "AG", "EQUATORIAL GUINEA": "GQ",
        "ARGENTINA": "AR", "ARMENIA": "AM", "AZERBAIJAN": "AZ", "ETHIOPIA": "ET",
        "AUSTRALIA": "AU", "BAHAMAS": "BS", "BAHRAIN": "BH", "BANGLADESH": "BD",
        "BARBADOS": "BB", "BELARUS": "BY", "BELGIUM": "BE", "BELIZE": "BZ",
        "BENIN": "BJ", "BHUTAN": "BT", "BOLIVIA": "BO", "BOSNIA AND HERZEGOVINA": "BA",
        "BOTSWANA": "BW", "BRAZIL": "BR", "BRUNEI": "BN", "BULGARIA": "BG",
        "BURKINA FASO": "BF", "BURUNDI": "BI", "CHILE": "CL", "COSTA RICA": "CR",
        "DENMARK": "DK", "GERMANY": "DE", "DEUTSCHLAND": "DE", "DOMINICA": "DM", "DOMINICAN REPUBLIC": "DO",
        "DJIBOUTI": "DJ", "ECUADOR": "EC", "ENGLAND": "GB", "EL SALVADOR": "SV",
        "IVORY COAST": "CI", "ERITREA": "ER", "ESTONIA": "EE", "ESWATINI": "SZ",
        "FIJI": "FJ", "FINLAND": "FI", "FRANCE": "FR", "FRANKREICH": "FR", "GABON": "GA",
        "GAMBIA": "GM", "GEORGIA": "GE", "GHANA": "GH", "GRENADA": "GD",
        "GREECE": "GR", "GUATEMALA": "GT", "GUINEA": "GN", "GUINEA-BISSAU": "GW",
        "GUYANA": "GY", "HAITI": "HT", "HONDURAS": "HN", "INDIA": "IN",
        "INDONESIA": "ID", "IRAQ": "IQ", "IRAN": "IR", "IRELAND": "IE",
        "ICELAND": "IS", "ISRAEL": "IL", "ITALY": "IT", "ITALIEN": "IT", "JAMAICA": "JM",
        "JAPAN": "JP", "YEMEN": "YE", "JORDAN": "JO", "CAMBODIA": "KH",
        "CAMEROON": "CM", "CANADA": "CA", "CAPE VERDE": "CV", "KAZAKHSTAN": "KZ",
        "QATAR": "QA", "KENYA": "KE", "KYRGYZSTAN": "KG", "KIRIBATI": "KI",
        "COLOMBIA": "CO", "COMOROS": "KM", "DEMOCRATIC REPUBLIC OF THE CONGO": "CD",
        "REPUBLIC OF THE CONGO": "CG", "KOSOVO": "XK", "CROATIA": "HR",
        "CUBA": "CU", "KUWAIT": "KW", "LAOS": "LA", "LESOTHO": "LS",
        "LATVIA": "LV", "LEBANON": "LB", "LIBERIA": "LR", "LIBYA": "LY",
        "LIECHTENSTEIN": "LI", "LITHUANIA": "LT", "LUXEMBOURG": "LU", "LUXEMBURG": "LU", "MALAWI": "MW",
        "MALAYSIA": "MY", "MALDIVES": "MV", "MALI": "ML", "MALTA": "MT",
        "MOROCCO": "MA", "MARSHALL ISLANDS": "MH", "MAURITANIA": "MR", "MAURITIUS": "MU",
        "MEXICO": "MX", "MICRONESIA": "FM", "MOLDOVA": "MD", "MONACO": "MC",
        "MONGOLIA": "MN", "MONTENEGRO": "ME", "MOZAMBIQUE": "MZ", "MYANMAR": "MM",
        "NAMIBIA": "NA", "NAURU": "NR", "NEPAL": "NP", "NEW ZEALAND": "NZ",
        "NICARAGUA": "NI", "NETHERLANDS": "NL", "NIEDERLANDE": "NL", "NIGER": "NE", "NIGERIA": "NG",
        "NORTH KOREA": "KP", "NORTH MACEDONIA": "MK", "NORWAY": "NO", "OMAN": "OM",
        "AUSTRIA": "AT", "ÖSTERREICH": "AT", "OESTERREICH": "AT", "TIMOR-LESTE": "TL", "PAKISTAN": "PK",
        "PALAU": "PW", "PALESTINE": "PS", "PANAMA": "PA", "PAPUA NEW GUINEA": "PG",
        "PARAGUAY": "PY", "PERU": "PE", "PHILIPPINES": "PH", "POLAND": "PL",
        "PORTUGAL": "PT", "RWANDA": "RW", "ROMANIA": "RO", "RUSSIA": "RU",
        "SAUDI ARABIA": "SA", "SWEDEN": "SE", "SWITZERLAND": "CH", "SCHWEIZ": "CH", "SENEGAL": "SN",
        "SERBIA": "RS", "SEYCHELLES": "SC", "SIERRA LEONE": "SL", "ZIMBABWE": "ZW",
        "SINGAPORE": "SG", "SLOVAKIA": "SK", "SLOVENIA": "SI", "SOMALIA": "SO",
        "SOUTH AFRICA": "ZA", "SOUTH KOREA": "KR", "SURINAME": "SR", "SYRIA": "SY",
        "TAJIKISTAN": "TJ", "TAIWAN": "TW", "TANZANIA": "TZ", "THAILAND": "TH",
        "TOGO": "TG", "TONGA": "TO", "TRINIDAD AND TOBAGO": "TT", "CHAD": "TD",
        "CZECH REPUBLIC": "CZ", "TUNISIA": "TN", "TURKEY": "TR", "TURKMENISTAN": "TM",
        "TUVALU": "TV", "UGANDA": "UG", "UKRAINE": "UA", "HUNGARY": "HU",
        "URUGUAY": "UY", "UZBEKISTAN": "UZ", "CHINA": "CN", "VANUATU": "VU",
        "VATICAN CITY": "VA", "VENEZUELA": "VE", "UNITED ARAB EMIRATES": "AE",
        "UNITED STATES": "US", "UNITED STATES OF AMERICA": "US", "VIETNAM": "VN",
        "WESTERN SAHARA": "EH", "CYPRUS": "CY", "ZAMBIA": "ZM"
      };
      countryCode = countryMap[cleanCountry] || null;
    }
    if (countryCode) {
      return { countryCode, vatNumber: cleanVat };
    }
  }

  return null;
};

const pullVeriffMedia = async (user_id, veriffSessionId) => {
  const apiKey = process.env.VERIFF_API_KEY;
  const apiSecret = process.env.VERIFF_API_SECRET;

  if (!veriffSessionId || !apiKey || !apiSecret) {
    return;
  }

  const crypto = require("crypto");
  const signature = crypto.createHmac("sha256", apiSecret).update(veriffSessionId).digest("hex");

  try {
    const sessionUrl = `https://stationapi.veriff.com/v1/sessions/${veriffSessionId}/media`;
    const sessionResponse = await axios.get(sessionUrl, {
      headers: {
        "X-AUTH-CLIENT": apiKey,
        "X-HMAC-SIGNATURE": signature,
      },
    });

    const images = sessionResponse.data?.images;
    if (!Array.isArray(images) || images.length === 0) return;

    const destinationPath = path.join(__dirname, "../../public/assets/veriff", `user_${user_id}`);
    if (!fs.existsSync(destinationPath)) {
      fs.mkdirSync(destinationPath, { recursive: true });
    }

    for (const item of images) {
      const mediaUrl = item.url;
      const mediaId = path.basename(mediaUrl);
      const name = (item.name || "image").toLowerCase();

      let filename;
      switch (name) {
        case "face":
        case "face-pre":
          filename = `${user_id}_selfie.jpg`;
          break;
        case "document-front":
        case "document-front-pre":
          filename = `${user_id}_id_front.jpg`;
          break;
        case "document-back":
        case "document-back-pre":
          filename = `${user_id}_id_back.jpg`;
          break;
        default:
          filename = `${mediaId}.jpg`;
          break;
      }

      const mediaSignature = crypto.createHmac("sha256", apiSecret).update(mediaId).digest("hex");

      const mediaResponse = await axios.get(mediaUrl, {
        headers: {
          "X-AUTH-CLIENT": apiKey,
          "X-HMAC-SIGNATURE": mediaSignature,
        },
        responseType: "arraybuffer",
      });

      if (mediaResponse.status === 200 && mediaResponse.data) {
        fs.writeFileSync(path.join(destinationPath, filename), mediaResponse.data);
      }
    }
  } catch (error) {
    console.error("[registerStoreUserHelper] Veriff media fetch failed:", error.message);
  }
};

const saveLegalTextsRow = async (user_id) => {
  try {
    const [tableExists] = await db.sequelize.query(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '6lwup_legal_texts'"
    );
    if (!tableExists?.[0]?.cnt) return;

    await db.sequelize.query(
      "INSERT INTO `6lwup_legal_texts` (user_id) SELECT :user_id WHERE NOT EXISTS (SELECT 1 FROM `6lwup_legal_texts` WHERE user_id = :user_id)",
      { replacements: { user_id } }
    );
  } catch (error) {
    console.error("[registerStoreUserHelper] LegalTexts row creation skipped:", error.message);
  }
};

const sendRegistrationEmails = async (user, languageForApi) => {
  try {
    const emailTemplate = await db.EmailView.findByPk(1);
    if (!emailTemplate) {
      console.warn("[registerStoreUserHelper] Email template id=1 not found, skipping registration emails.");
      return;
    }

    const isGerman = languageForApi === "de-DE";
    let subject = isGerman ? emailTemplate.subject_german : emailTemplate.subject_english;
    let content = isGerman ? emailTemplate.content_german : emailTemplate.content_english;

    if (!subject || !content) return;

    content = isGerman
      ? content.replace(/\[Kundenname\]/g, user.display_name)
      : content.replace(/\[customer name\]/g, user.display_name);

    const recipients = [user.user_email, process.env.ADMIN_EMAIL, process.env.ADMIN_EMAIL_FOR_ORDER].filter(Boolean);

    for (const to of recipients) {
      try {
        await SendEmailHelper(subject, content, to);
      } catch (mailError) {
        console.error(`[registerStoreUserHelper] Failed sending registration email to ${to}:`, mailError.message);
      }
    }
  } catch (error) {
    console.error("[registerStoreUserHelper] sendRegistrationEmails failed:", error.message);
  }
};

const createStoreUser = async (payload) => {
  const {
    u_display_name,
    u_company,
    u_contact_person,
    u_street_no,
    u_street,
    u_location,
    u_postcode,
    u_country,
    u_vat_no,
    u_tax_no,
    u_email,
    u_phone,
    u_landline_number,
    u_username,
    u_password,
    language,
    u_date,
    u_web_site,
    u_account_owner,
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
    internationalTrade,
    thirdPartyTransactions,
    beneficialOwners,
    beneficialOwnersDetails,
    monthlyVolume,
    investigationProceedings,
    u_country_origin,
    u_recipient_country,
    veriff_session_id,
    files,
    role_id,
  } = payload;

  const mystorekey = String(u_company || "").replace(/ /g, "_");

  const existingByStoreKey = await db.Users.findOne({ where: { mystorekey } });
  if (existingByStoreKey) {
    return { success: false, message: "Company name already exists. Please use another name." };
  }

  let hashedPassword = await bcrypt.hash(u_password, 10);
  hashedPassword = hashedPassword.replace(/^\$2b/, "$2y");

  const user = await db.Users.create({
    user_login: u_username,
    user_pass: hashedPassword,
    user_nicename: String(u_account_owner || "").replace(/ /g, "_"),
    user_email: u_email,
    user_registered: new Date(),
    user_status: 2,
    display_name: u_display_name,
    user_type: 0,
    mystorekey,
    role_id: role_id || 2,
  });

  const user_id = user.ID;

  await db.MyStoreSetting.findOrCreate({
    where: { user_id },
    defaults: {
      user_id,
      category: "all",
      paymentOption: "Cash_question, Card_question, Bank_Transfer_question",
    },
  });

  await saveLegalTextsRow(user_id);
  await pullVeriffMedia(user_id, veriff_session_id);

  if (files?.u_trade_register?.[0]) {
    const file = files.u_trade_register[0];
    const relPath = saveBufferToPublicUploads(file.buffer, "trade_license", file.originalname);
    await saveUserMeta(user_id, "u_trade_register", relPath);
  }

  if (files?.u_travel_id?.[0]) {
    const file = files.u_travel_id[0];
    const relPath = saveBufferToPublicUploads(file.buffer, "ID_card", file.originalname);
    await saveUserMeta(user_id, "u_travel_id", relPath);
  }

  if (files?.bill_upload?.[0]) {
    const file = files.bill_upload[0];
    const relPath = saveBufferToPublicUploads(file.buffer, "bill_upload", file.originalname);
    await saveUserMeta(user_id, "bill_upload", relPath);
  }

  if (files?.signatureData?.[0]) {
    const file = files.signatureData[0];
    const relPath = saveBufferToPublicUploads(file.buffer, "signatureData", file.originalname || "signature.png");
    await saveUserMeta(user_id, "signatureData", relPath);
  } else if (payload.signatureDataBase64) {
    const imageData = Buffer.from(
      payload.signatureDataBase64.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );
    const uploadDir = path.join(__dirname, "../../public/uploads/signatureData");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const fileName = `signature_${Date.now()}.png`;
    fs.writeFileSync(path.join(uploadDir, fileName), imageData);
    await saveUserMeta(user_id, "signatureData", `uploads/signatureData/${fileName}`);
  }

  let banksJson = "[]";
  if (banks) {
    try {
      const parsed = typeof banks === "string" ? JSON.parse(banks) : banks;
      banksJson = JSON.stringify(parsed || []);
    } catch {
      banksJson = "[]";
    }
  }

  let isVatVerified = false;
  if (u_vat_no) {
    try {
      const parsedVat = parseVatId(u_vat_no, u_country);
      if (parsedVat) {
        const { countryCode, vatNumber } = parsedVat;
        const viesUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${countryCode}/vat/${vatNumber}`;
        console.log(`[VIES API] Calling ${viesUrl}`);
        const response = await axios.get(viesUrl, { timeout: 10000 });
        if (response.data && response.data.isValid === true) {
          isVatVerified = true;
          console.log(`[VIES API] VAT ID ${u_vat_no} is VALID`);
        } else {
          console.log(`[VIES API] VAT ID ${u_vat_no} is INVALID`);
        }
      } else {
        console.log(`[VIES API] Could not parse VAT ID ${u_vat_no} for country ${u_country}`);
      }
    } catch (error) {
      console.error("[VIES API] Error validating VAT:", error.message);
      isVatVerified = false;
    }
  }

  const metaEntries = {
    u_company,
    u_contact_person,
    u_street_no,
    u_street,
    u_location,
    u_postcode,
    u_country,
    u_vat_no,
    u_tax_no,
    u_tax_jurisdiction: taxJurisdiction,
    u_legal_status: legalStatus,
    u_tax_number_label: taxNumberLabel,
    u_vatId_label: vatIdLabel,
    u_phone,
    u_landline_number,
    language,
    date: new Date().toISOString().split("T")[0],
    u_web_site,
    u_date,
    business_activity_check,
    business_activity_other,
    businessDescription,
    purpose_of_business_relationship_check,
    businesspurposeother,
    internationalTrade,
    thirdPartyTransactions,
    beneficialOwners,
    beneficialOwnersDetails,
    monthlyVolume,
    investigationProceedings,
    u_country_origin,
    u_recipient_country,
    u_account_owner,
    banks: banksJson,
    is_vat_verified: isVatVerified ? "true" : "false",
  };

  for (const [key, value] of Object.entries(metaEntries)) {
    await saveUserMeta(user_id, key, value ?? "");
  }

  await sendRegistrationEmails(user, language);

  return { success: true, message: "Register Successfully", data: { user_id } };
};

module.exports = { createStoreUser, parseVatId, pullVeriffMedia };
