const db = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_ACCESS_TOKEN = process.env.JWT_ACCESS_TOKEN;

// Generate random referral code
const generateReferralCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

const BrokerRegistration = async (req, res) => {
  try {
    const {
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
      u_street,
      u_location,
      u_describe_business,
      u_business_purpose,
      u_export_import,
      u_country_origin,
      u_recipient_country,
      iban,
      bic,
      bankName,
      bankAddress,
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
      !iban ||
      !bic ||
      !bankName ||
      !bankAddress
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: referralCode, fullName, company, contactPerson, postalCode, city, country, email, phone, mobile, username, password, iban, bic, bankName, bankAddress",
      });
    }

    // Determine parent (admin or broker)
    const isAdminParent = referralCode === process.env.ADMIN_REFERRAL_CODE;
    let parentBroker = null;

    if (!isAdminParent) {
      parentBroker = await db.Brokers.findOne({
        where: { referral_code: referralCode },
      });
      if (!parentBroker) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code",
        });
      }
    }

    // File uploads (if any)
    const u_trade_register = req.files?.u_trade_register?.[0]?.filename || null;
    const u_travel_id = req.files?.u_travel_id?.[0]?.filename || null;
    const signatureData = req.files?.signatureData?.[0]?.filename || null;

    if (!u_trade_register || !u_travel_id || !signatureData) {
      return res.status(400).json({
        success: false,
        message: "Trade register, Travel ID and Signature Data required",
      });
    }

    // Check if user already exists
    const existingUser = await db.Users.findOne({
      where: { user_email: email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Hash password and replace $2b with $2y
    let hashedPassword = await bcrypt.hash(password, 10);
    hashedPassword = hashedPassword.replace(/^\$2b/, "$2y");

    const newReferralCode = generateReferralCode();

    // Create new user (6LWUP_users)
    const createdAt = new Date();
    const newUser = await db.Users.create({
      user_login: username,
      user_nicename: username,
      user_email: email,
      user_pass: hashedPassword,
      user_registered: createdAt,
      display_name: fullName,
      user_type: 0,
      mystorekey: email,
    });

    // Prepare usermeta key-value pairs
    const userMetaData = {
      u_trade_register,
      u_travel_id,
      signatureData,
      u_company: company,
      u_contact_person: contactPerson,
      u_street_no: u_street_no || "21",
      u_street: u_street || "street",
      u_location: u_location || city,
      u_postcode: postalCode,
      u_country: country,
      u_vat_no: vatId || "",
      u_tax_no: taxNumber || "",
      u_phone: phone,
      u_landline_number: mobile,
      u_web_site: website || "",
      u_i_or_we: "I",
      u_other_i_or_we: "I",
      u_date: new Date(),
      language: "English",
      date: new Date(),
      vat_exempt: "0",
      IdCardIsExpiredUrl: "test",
      u_describe_business: u_describe_business || "",
      u_other_describe_business: "test",
      u_business_purpose: u_business_purpose || "",
      u_other_business_purpose: "t",
      u_export_import: u_export_import || "",
      u_country_origin: u_country_origin || "",
      u_recipient_country: u_recipient_country || "",
      u_account_owner: fullName,
      u_bank: bankName,
      u_iban: iban,
      u_bic: bic,
      u_bank_address: bankAddress,
    };

    const metaEntries = Object.entries(userMetaData).map(([key, value]) => ({
      user_id: newUser.ID,
      meta_key: key,
      meta_value: value,
    }));

    await db.UsersMeta.bulkCreate(metaEntries);

    // Create broker entry
    await db.Brokers.create({
      user_id: newUser.ID,
      parent_id: isAdminParent ? null : parentBroker?.id || null,
      referral_code: newReferralCode,
      referred_by_code: isAdminParent
        ? process.env.ADMIN_REFERRAL_CODE
        : parentBroker.referral_code,
      children_count: 0,
      total_commission_amount: 0,
    });

    // Update parent’s children count
    if (!isAdminParent && parentBroker) {
      await parentBroker.update({
        children_count: parentBroker.children_count + 1,
      });
    }

    // 🔹 Create entry in MyStoreSettings
    await db.MyStoreSetting.create({
      user_id: newUser.ID,
      category: "all",
      paymentOption: "Cash_question, Card_question, Bank_Transfer_question",
    });

    // Create user object for frontend
    const userResponse = {
      ID: newUser.ID,
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

    return res.status(200).json({
      success: true,
      message: "Broker registered successfully",
      data: {
        user: userResponse,
        token,
      },
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
