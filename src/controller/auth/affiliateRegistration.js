require("dotenv").config();
const db = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getBrokerLevel } = require("../../utils/brokerLevelHelper");
const SendEmailHelper = require("../../utils/sendEmailHelper");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const { parseVatId, pullVeriffMedia } = require("../../utils/registerStoreUserHelper");
const axios = require("axios");

const JWT_ACCESS_TOKEN = process.env.JWT_ACCESS_TOKEN;
const ADMIN_REFERRAL_CODE = process.env.ADMIN_REFERRAL_CODE;

// Generate random referral code
const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const AffiliateRegistration = async (req, res) => {
  try {
    const {
      u_fname,
      u_lname,
      email,
      password,
      u_person_type,
      u_country,
      u_vat_no,
      u_role,
      empfehlercode,
      language,
      veriff_session_id,
      veriffId,
    } = req.body;

    const veriffSessionId = veriff_session_id || veriffId || null;

    const firstName = u_fname;
    const lastName = u_lname;
    const personType = u_person_type || "";
    const country = u_country || "";
    const vatNo = u_vat_no || "";
    const userRole = u_role || "AFFILIATE";

    let langValue = "en-US";
    if (language) {
      const langStr = String(language).toLowerCase().trim();
      if (langStr === "de" || langStr === "de-de" || langStr === "german" || langStr === "deutsch") {
        langValue = "de-DE";
      } else if (langStr === "en" || langStr === "en-us" || langStr === "english") {
        langValue = "en-US";
      }
    }

    if (!email || !password || !firstName || !lastName || !empfehlercode) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: u_fname, u_lname, email, password, empfehlercode",
      });
    }

    // Check if user already exists
    const existingUser = await db.Users.findOne({
      where: { user_email: email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    // Validate referral code (must exist or be admin code)
    const cleanCode = (empfehlercode || "").trim().toUpperCase();
    const adminCode = (ADMIN_REFERRAL_CODE || "ADMIN").trim().toUpperCase();

    const isAdminParent =
      !empfehlercode ||
      cleanCode === adminCode ||
      cleanCode === "ADMIN" ||
      cleanCode === "ADMINISTRATOR";

    let parentBroker = null;

    if (!isAdminParent) {
      // 1. Search in Brokers table
      parentBroker = await db.Brokers.findOne({
        where: { referral_code: empfehlercode },
      });

      // 2. Search in Affiliates table if not found in Brokers
      if (!parentBroker && db.Affiliates) {
        const parentAffiliate = await db.Affiliates.findOne({
          where: { referral_code: empfehlercode },
        });
        if (parentAffiliate) {
          parentBroker = parentAffiliate;
        }
      }

      if (!parentBroker) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code.",
        });
      }

      // Level check removed to allow referrals beyond level 5
    }

    // Hash password
    let hashedPassword = await bcrypt.hash(password, 10);
    if (hashedPassword.startsWith("$2b")) {
      hashedPassword = hashedPassword.replace("$2b", "$2y");
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const newReferralCode = generateReferralCode();
    const createdAt = new Date();

    // When Veriff KYC verification is completed, user is directly active (user_status: 0)
    const initialUserStatus = veriffSessionId ? 0 : 2;

    // Create User record
    const newUser = await db.Users.create({
      user_login: email,
      user_nicename: email,
      user_email: email,
      user_pass: hashedPassword,
      user_registered: createdAt,
      display_name: fullName,
      user_type: 0,
      user_status: initialUserStatus,
      role_id: 3,
    });

    // Create Affiliate entry (every Broker is an Affiliate, but not every Affiliate is a Broker)

    if (db.Affiliates) {
      try {
        await db.Affiliates.create({
          user_id: newUser.ID,
          parent_id: isAdminParent ? null : parentBroker?.id || null,
          referral_code: newReferralCode,
          referred_by_code: empfehlercode,
          children_count: 0,
          total_commission_amount: 0,
          veriff_session_id: veriffSessionId || null,
        });
      } catch (affErr) {
        console.error("Error inserting into Affiliates table:", affErr);
        throw affErr;
      }
    }

    // Pull Veriff KYC Media if available
    if (veriffSessionId) {
      try {
        await pullVeriffMedia(newUser.ID, veriffSessionId);
      } catch (veriffErr) {
        console.error("[AffiliateRegistration] Error pulling Veriff media:", veriffErr.message);
      }
    }

    // Update parent children count
    if (!isAdminParent && parentBroker) {
      await parentBroker.update({
        children_count: (parentBroker.children_count || 0) + 1,
      });
    }

    // Save metadata
    let isVatVerified = false;
    if (vatNo) {
      try {
        const parsedVat = parseVatId(vatNo, country);
        if (parsedVat) {
          const { countryCode, vatNumber } = parsedVat;
          const viesUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${countryCode}/vat/${vatNumber}`;
          console.log(`[VIES API - Affiliate] Calling ${viesUrl}`);
          const response = await axios.get(viesUrl, { timeout: 10000 });
          if (response.data && response.data.isValid === true) {
            isVatVerified = true;
            console.log(`[VIES API - Affiliate] VAT ID ${vatNo} is VALID`);
          } else {
            console.log(`[VIES API - Affiliate] VAT ID ${vatNo} is INVALID`);
          }
        } else {
          console.log(`[VIES API - Affiliate] Could not parse VAT ID ${vatNo} for country ${country}`);
        }
      } catch (error) {
        console.error("[VIES API - Affiliate] Error validating VAT:", error.message);
        isVatVerified = false;
      }
    }

    const metaEntries = [
      { user_id: newUser.ID, meta_key: "vorname", meta_value: firstName },
      { user_id: newUser.ID, meta_key: "nachname", meta_value: lastName },
      { user_id: newUser.ID, meta_key: "person_typ", meta_value: personType },
      { user_id: newUser.ID, meta_key: "country", meta_value: country },
      { user_id: newUser.ID, meta_key: "steuer_id", meta_value: vatNo },
      { user_id: newUser.ID, meta_key: "u_fname", meta_value: firstName },
      { user_id: newUser.ID, meta_key: "u_lname", meta_value: lastName },
      { user_id: newUser.ID, meta_key: "u_person_type", meta_value: personType },
      { user_id: newUser.ID, meta_key: "u_country", meta_value: country },
      { user_id: newUser.ID, meta_key: "u_vat_no", meta_value: vatNo },
      { user_id: newUser.ID, meta_key: "u_role", meta_value: userRole },
      { user_id: newUser.ID, meta_key: "user_role", meta_value: userRole },
      { user_id: newUser.ID, meta_key: "language", meta_value: langValue },
      { user_id: newUser.ID, meta_key: "is_vat_verified", meta_value: isVatVerified ? "true" : "false" },
      { user_id: newUser.ID, meta_key: "veriff_session_id", meta_value: veriffSessionId || "" },
    ];

    await db.UsersMeta.bulkCreate(metaEntries);

    const userResponse = {
      ID: newUser.ID,
      fullName,
      email,
      referral_code: newReferralCode,
      role: "AFFILIATE",
      user_status: initialUserStatus,
    };

    // Update invitation status in db.AffiliateInvitations & db.BrokerInvitations
    try {
      const invData = {
        invitation_status: "REGISTERED",
        ...(parentBroker?.id ? { invited_by: parentBroker.id } : {}),
      };

      if (db.AffiliateInvitations) {
        const existingInv = await db.AffiliateInvitations.findOne({ where: { email } });
        if (existingInv) {
          await existingInv.update(invData);
        } else {
          await db.AffiliateInvitations.create({
            email,
            invitation_status: "REGISTERED",
            invited_by: parentBroker?.id || null,
            last_invitation_sent: new Date(),
          });
        }
      }

      if (db.BrokerInvitations) {
        const existingBrokerInv = await db.BrokerInvitations.findOne({ where: { email } });
        if (existingBrokerInv) {
          await existingBrokerInv.update({ invitation_status: "REGISTERED" });
        }
      }
    } catch (invErr) {
      console.error("[AffiliateRegistration] Error updating invitation status to REGISTERED:", invErr.message);
    }

    // Send registration confirmation email to newly registered affiliate using DB template (ID: 134)
    try {
      const emailData = await getRenderedEmail(140, langValue, { name: fullName });
      if (emailData && emailData.subject && emailData.htmlContent) {
        await SendEmailHelper(emailData.subject, emailData.htmlContent, email);
        console.log(`[AffiliateRegistration] Sent registration confirmation email to affiliate: ${email}`);
      }
    } catch (mailErr) {
      console.error("[AffiliateRegistration] Error sending registration confirmation email to affiliate:", mailErr);
    }

    const token = jwt.sign({ user: userResponse }, JWT_ACCESS_TOKEN, {
      expiresIn: process.env.JWT_EXPIRE || "90d",
    });

    return res.status(200).json({
      success: true,
      message: "Affiliate registered successfully",
      data: {
        user: userResponse,
        token,
      },
    });
  } catch (error) {
    console.error("Error in AffiliateRegistration:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = AffiliateRegistration;
