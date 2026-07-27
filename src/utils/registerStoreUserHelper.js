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
  };

  for (const [key, value] of Object.entries(metaEntries)) {
    await saveUserMeta(user_id, key, value ?? "");
  }

  await sendRegistrationEmails(user, language);

  return { success: true, message: "Register Successfully", data: { user_id } };
};

module.exports = { createStoreUser };
