const db = require("../../models");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const SendEmailHelper = require("../../utils/sendEmailHelper");
const { createStoreUser } = require("../../utils/registerStoreUserHelper");
const { mapStatusToUserStatus } = require("../../utils/kontorBrokerUpdateHelper");
const { encryptJson } = require("../../utils/encryptionHelper");
const { kontorError } = require("../../utils/kontorErrorCodes");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");

const ADMIN_REFERRAL_CODE = process.env.ADMIN_REFERRAL_CODE;
const JWT_ACCESS_TOKEN = process.env.JWT_ACCESS_TOKEN;
const KONTOR_INVITE_EMAIL_TEMPLATE_ID = 163;

const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// Kept for our own internal/admin use (not part of the Kontor contract —
// Kontor references brokers by our own broker_id going forward).
const generateMlmCustomerNumber = (brokerId) => `M-${10000 + Number(brokerId)}`;

const sendInvitationEmail = async (user, languageForApi) => {
  const token = jwt.sign(
    { email: user.user_email },
    JWT_ACCESS_TOKEN || "defaultsecret",
    { expiresIn: "7d" }
  );
  const setPasswordLink = `${process.env.FRONTEND_URL || "http://localhost:8080"}/reset-password?token=${token}`;

  const lang = String(languageForApi || "").toLowerCase().startsWith("de") ? "de" : "en";
  const { subject, htmlContent } = await getRenderedEmail(KONTOR_INVITE_EMAIL_TEMPLATE_ID, lang, {
    name: user.display_name || "",
    set_password_link: `<a href="${setPasswordLink}">${setPasswordLink}</a>`,
  });

  await SendEmailHelper(subject, htmlContent, user.user_email);
};

const resolveParentByReferralCode = async (referralCode) => {
  if (!referralCode || referralCode === ADMIN_REFERRAL_CODE) {
    return { isAdminParent: true, parentBroker: null };
  }

  let parentBroker = await db.Brokers.findOne({ where: { referral_code: referralCode } });
  if (!parentBroker && db.Affiliates) {
    parentBroker = await db.Affiliates.findOne({ where: { referral_code: referralCode } });
  }
  if (!parentBroker) {
    const parentUserReferral = await db.UserReferrals.findOne({ where: { referral_code: referralCode } });
    if (parentUserReferral) {
      return { isAdminParent: false, parentBroker: { user_id: parentUserReferral.user_id, referral_code: referralCode } };
    }
  }

  if (!parentBroker) {
    return { isAdminParent: false, parentBroker: null, invalid: true };
  }

  return { isAdminParent: false, parentBroker };
};

const RegisterKontorBroker = async (req, res) => {
  try {
    const {
      source,
      external_ref,
      organisation_id,
      status,
      approved_at,
      package: kontorPackage,
      referralCode,
      company = {},
      contact = {},
      bank,
    } = req.body;

    const { legal_name, legal_form, street, postcode, city, country, vat_id, vat_id_verified_at, tax_number } = company;
    const { name: contactName, email, phone, language } = contact;

    if (!external_ref || !status || !legal_name || !postcode || !city || !country || !contactName || !email) {
      return kontorError(
        res,
        400,
        "VALIDATION_ERROR",
        "Missing required fields: external_ref, status, company.legal_name, company.postcode, company.city, company.country, contact.name, contact.email"
      );
    }

    // Idempotency: a retried call with the same external_ref returns the
    // existing broker (created: false) instead of creating a duplicate.
    const existingBroker = await db.Brokers.findOne({
      where: { source: "kontor", external_ref: String(external_ref) },
    });
    if (existingBroker) {
      return res.status(200).json({
        success: true,
        broker_id: existingBroker.id,
        user_id: existingBroker.user_id,
        created: false,
      });
    }

    const existingUserByEmail = await db.Users.findOne({ where: { user_email: email } });
    if (existingUserByEmail) {
      return kontorError(res, 400, "ALREADY_EXISTS", "A user with this email already exists. Please use a different email address.");
    }

    const mystorekey = String(legal_name).replace(/ /g, "_");
    const existingUserByMyStore = await db.Users.findOne({ where: { mystorekey } });
    if (existingUserByMyStore) {
      return kontorError(res, 400, "ALREADY_EXISTS", "This company name is already taken. Please choose a different company name.");
    }

    const { isAdminParent, parentBroker, invalid } = await resolveParentByReferralCode(referralCode);
    if (invalid) {
      return kontorError(res, 400, "VALIDATION_ERROR", `No broker/affiliate found for referralCode: ${referralCode}`);
    }

    let languageForApi = "en-US";
    if (language) {
      const languageStr = String(language).toLowerCase().trim();
      if (languageStr === "de" || languageStr === "de-de") languageForApi = "de-DE";
    }

    // Kontor never sends a password — every Kontor broker gets a random
    // unguessable password plus an invitation email to set their real one.
    const randomPassword = crypto.randomBytes(24).toString("hex");
    const effectiveUsername = `kontor_${email.split("@")[0]}_${Date.now().toString(36)}`;

    const registrationResult = await createStoreUser({
      u_display_name: contactName,
      u_company: legal_name,
      u_contact_person: contactName,
      u_street: street,
      u_location: city,
      u_postcode: postcode,
      u_country: country,
      u_vat_no: vat_id || "",
      u_email: email,
      u_phone: phone,
      u_username: effectiveUsername,
      u_password: randomPassword,
      u_account_owner: contactName,
      language: languageForApi,
      u_date: new Date().toISOString().split("T")[0],
      legalStatus: legal_form,
      role_id: 2,
    });

    if (!registrationResult.success) {
      return kontorError(res, 400, "VALIDATION_ERROR", registrationResult.message || "Registration failed");
    }

    const user_id = registrationResult.data.user_id;

    // "activated" (Kontor's confirmed initial status) grants immediate,
    // active access — Kontor-approved brokers skip our normal pending step.
    await db.Users.update({ user_status: mapStatusToUserStatus(status) }, { where: { ID: user_id } });

    const newReferralCode = generateReferralCode();
    const broker = await db.Brokers.create({
      user_id,
      parent_id: isAdminParent ? null : parentBroker?.id || null,
      referral_code: newReferralCode,
      referred_by_code: isAdminParent ? ADMIN_REFERRAL_CODE : parentBroker?.referral_code || referralCode,
      children_count: 0,
      total_commission_amount: 0,
      source: source || "kontor",
      external_ref: String(external_ref),
      kontor_status: String(status).toLowerCase().trim(),
    });

    // Kept for our own internal reference only — not part of the Kontor contract.
    await broker.update({ mlm_customer_number: generateMlmCustomerNumber(broker.id) });

    if (db.UserReferrals) {
      await db.UserReferrals.create({
        user_id,
        referral_code: newReferralCode,
        referred_by_code: isAdminParent ? ADMIN_REFERRAL_CODE : parentBroker?.referral_code || referralCode,
        parent_user_id: isAdminParent ? null : parentBroker?.user_id || null,
        children_count: 0,
      });

      if (!isAdminParent && parentBroker?.user_id) {
        await db.UserReferrals.increment("children_count", {
          by: 1,
          where: { user_id: parentBroker.user_id },
        });
      }
    }

    if (!isAdminParent && parentBroker?.update) {
      await parentBroker.update({ children_count: (parentBroker.children_count || 0) + 1 });
    }

    // Kontor-specific / VAT / tax metadata that doesn't warrant its own
    // broker column — vat_id_verified_at tracked per Christian's "so you
    // know whether a broker is EU-based and VAT-registered" requirement.
    const metaToSave = {
      kontor_organisation_id: organisation_id,
      kontor_package: kontorPackage,
      kontor_approved_at: approved_at,
      u_vat_id_verified_at: vat_id_verified_at,
      u_tax_number: tax_number,
    };
    for (const [key, value] of Object.entries(metaToSave)) {
      if (value !== undefined && value !== null) {
        await db.UsersMeta.create({ user_id, meta_key: key, meta_value: String(value) });
      }
    }

    // Bank details are optional at registration and must be stored encrypted.
    if (bank) {
      await db.UsersMeta.create({
        user_id,
        meta_key: "kontor_bank_details_encrypted",
        meta_value: encryptJson(bank),
      });
    }

    try {
      const userRow = await db.Users.findByPk(user_id);
      await sendInvitationEmail(userRow, languageForApi);
    } catch (emailErr) {
      console.error("[Kontor] Error sending broker invitation email:", emailErr.message);
    }

    return res.status(200).json({
      success: true,
      broker_id: broker.id,
      user_id,
      created: true,
    });
  } catch (error) {
    console.error("[Kontor] Error in RegisterKontorBroker:", error);
    return kontorError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
};

module.exports = RegisterKontorBroker;
