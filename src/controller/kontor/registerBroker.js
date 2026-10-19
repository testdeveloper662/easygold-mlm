const db = require("../../models");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const SendEmailHelper = require("../../utils/sendEmailHelper");
const { createStoreUser } = require("../../utils/registerStoreUserHelper");
const { mapStatusToUserStatus } = require("../../utils/kontorBrokerUpdateHelper");

const ADMIN_REFERRAL_CODE = process.env.ADMIN_REFERRAL_CODE;
const JWT_ACCESS_TOKEN = process.env.JWT_ACCESS_TOKEN;

const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// Our own identifier, generated once a broker row exists and handed back to
// Kontor — they store it and echo it on every later call for this broker.
// Derived from the auto-increment broker id (offset so it doesn't start at
// M-00001), so it's guaranteed unique with no extra counter table needed.
const generateMlmCustomerNumber = (brokerId) => `M-${10000 + Number(brokerId)}`;

const sendInvitationEmail = async (user, languageForApi) => {
  const token = jwt.sign(
    { email: user.user_email },
    JWT_ACCESS_TOKEN || "defaultsecret",
    { expiresIn: "7d" }
  );
  const setPasswordLink = `${process.env.FRONTEND_URL || "http://localhost:8080"}/reset-password?token=${token}`;

  const subject = "Welcome to EasyGold MLM — set your password";
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Welcome, ${user.display_name || ""}</h2>
      <p>Your broker account has been created via Kontor. Click the link below to set your password and access your dashboard:</p>
      <p><a href="${setPasswordLink}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Set Password</a></p>
      <p>This link is valid for 7 days.</p>
    </div>
  `;

  await SendEmailHelper(subject, htmlContent, user.user_email);
};

const RegisterKontorBroker = async (req, res) => {
  try {
    const {
      customer_no,
      organisation_id,
      status,
      approved_at,
      activated_at,
      package: kontorPackage,
      company = {},
      contact = {},
      referral = {},
    } = req.body;

    const { legal_name, legal_form, street, postcode, city, country, vat_id } = company;
    const { name: contactName, email, phone, locale } = contact;
    const { code: kontorReferralCode, sponsor_mlm_ref } = referral;

    if (!customer_no || !status || !legal_name || !postcode || !city || !country || !contactName || !email) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: customer_no, status, company.legal_name, company.postcode, company.city, company.country, contact.name, contact.email",
      });
    }

    // Idempotency: a retried call with the same customer_no returns the
    // existing broker instead of creating a duplicate.
    const existingBroker = await db.Brokers.findOne({
      where: { source: "kontor", external_ref: String(customer_no) },
    });
    if (existingBroker) {
      return res.status(200).json({
        success: true,
        message: "Broker already exists for this customer_no",
        data: {
          mlm_customer_number: existingBroker.mlm_customer_number,
          broker_id: existingBroker.id,
          user_id: existingBroker.user_id,
        },
      });
    }

    const existingUserByEmail = await db.Users.findOne({ where: { user_email: email } });
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists. Please use a different email address.",
      });
    }

    const mystorekey = String(legal_name).replace(/ /g, "_");
    const existingUserByMyStore = await db.Users.findOne({ where: { mystorekey } });
    if (existingUserByMyStore) {
      return res.status(400).json({
        success: false,
        message: "This company name is already taken. Please choose a different company name.",
      });
    }

    // The sponsor, if any, is identified by OUR mlm_customer_number — not a
    // referral-code string — per how Kontor's payload references it.
    let parentBroker = null;
    if (sponsor_mlm_ref) {
      parentBroker = await db.Brokers.findOne({ where: { mlm_customer_number: String(sponsor_mlm_ref) } });
      if (!parentBroker) {
        return res.status(400).json({
          success: false,
          message: `No broker found for sponsor_mlm_ref: ${sponsor_mlm_ref}`,
        });
      }
    }
    const isAdminParent = !parentBroker;

    let languageForApi = "en-US";
    if (locale) {
      const localeStr = String(locale).toLowerCase().trim();
      if (localeStr === "de" || localeStr === "de-de") languageForApi = "de-DE";
    }

    // Kontor never sends a password, ID/KYC data, or documents — every
    // Kontor broker gets a random unguessable password plus an invitation
    // email to set their real one via the existing reset-password flow.
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
      return res.status(400).json({
        success: false,
        message: registrationResult.message || "Registration failed",
      });
    }

    const user_id = registrationResult.data.user_id;

    // "approved" (Kontor's initial status) grants immediate, active access —
    // Kontor-approved brokers skip our normal pending-approval status call.
    await db.Users.update({ user_status: mapStatusToUserStatus(status) }, { where: { ID: user_id } });

    const newReferralCode = generateReferralCode();
    const broker = await db.Brokers.create({
      user_id,
      parent_id: isAdminParent ? null : parentBroker.id,
      referral_code: newReferralCode,
      referred_by_code: isAdminParent ? ADMIN_REFERRAL_CODE : parentBroker.referral_code,
      children_count: 0,
      total_commission_amount: 0,
      source: "kontor",
      external_ref: String(customer_no),
      kontor_status: String(status).toLowerCase().trim(),
    });

    const mlmCustomerNumber = generateMlmCustomerNumber(broker.id);
    await broker.update({ mlm_customer_number: mlmCustomerNumber });

    if (db.UserReferrals) {
      await db.UserReferrals.create({
        user_id,
        referral_code: newReferralCode,
        referred_by_code: isAdminParent ? ADMIN_REFERRAL_CODE : parentBroker.referral_code,
        parent_user_id: isAdminParent ? null : parentBroker.user_id,
        children_count: 0,
      });

      if (!isAdminParent) {
        await db.UserReferrals.increment("children_count", {
          by: 1,
          where: { user_id: parentBroker.user_id },
        });
      }
    }

    if (!isAdminParent && parentBroker?.update) {
      await parentBroker.update({ children_count: (parentBroker.children_count || 0) + 1 });
    }

    // Kontor-specific metadata that doesn't warrant its own broker column.
    const metaToSave = {
      kontor_organisation_id: organisation_id,
      kontor_package: kontorPackage,
      kontor_referral_code: kontorReferralCode,
      kontor_approved_at: approved_at,
      kontor_activated_at: activated_at,
    };
    for (const [key, value] of Object.entries(metaToSave)) {
      if (value !== undefined && value !== null) {
        await db.UsersMeta.create({ user_id, meta_key: key, meta_value: String(value) });
      }
    }

    try {
      const userRow = await db.Users.findByPk(user_id);
      await sendInvitationEmail(userRow, languageForApi);
    } catch (emailErr) {
      console.error("[Kontor] Error sending broker invitation email:", emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Broker registered successfully",
      data: {
        mlm_customer_number: mlmCustomerNumber,
        broker_id: broker.id,
        user_id,
      },
    });
  } catch (error) {
    console.error("[Kontor] Error in RegisterKontorBroker:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = RegisterKontorBroker;
