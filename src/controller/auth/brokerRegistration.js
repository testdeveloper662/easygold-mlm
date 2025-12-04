require("dotenv").config();
const db = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const { generateAgreementPDF } = require("../../utils/agreementPdfHelper");
const { generateImageUrl } = require("../../utils/Helper");

const JWT_ACCESS_TOKEN = process.env.JWT_ACCESS_TOKEN;

// Generate random referral code
const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const BrokerRegistration = async (req, res) => {
  console.log("===========BrokerRegistration body = ", req.body);
  console.log("===========BrokerRegistration files = ", req.files);

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
      iban,
      bic,
      bankName,
      bankAddress,
      idExpiryDate,
      veriff_session_id,
      lang,
      language: languageParam, // Accept both 'lang' and 'language' from frontend (rename to avoid conflict)
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
      !bankAddress ||
      !idExpiryDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: referralCode, fullName, company, contactPerson, postalCode, city, country, email, phone, mobile, username, password, iban, bic, bankName, bankAddress, idExpiryDate",
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

    // Check if username already exists
    const existingUserByUsername = await db.Users.findOne({
      where: { user_login: username },
    });

    if (existingUserByUsername) {
      return res.status(400).json({
        success: false,
        message: "This username is already taken. Please choose a different username.",
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
                    "language"]
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
    }
    console.log("3333333333333333333333333");
    // File uploads (if any)
    // const u_trade_register = req.files?.u_trade_register?.[0]?.filename || null;
    // const u_travel_id = req.files?.u_travel_id?.[0]?.filename || null;
    // const signatureData = req.files?.signatureData?.[0]?.filename || null;

    // if (!u_trade_register || !u_travel_id || !signatureData) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Trade register, Travel ID and Signature Data required",
    //   });
    // }

    // Hash password and replace $2b with $2y
    // let hashedPassword = await bcrypt.hash(password, 10);
    // hashedPassword = hashedPassword.replace(/^\$2b/, "$2y");

    const newReferralCode = generateReferralCode();
    console.log("444444444444444444444444444");
    // ✅ Prepare form-data for external API
    const form = new FormData();
    form.append("veriff_session_id", veriffId);
    form.append("u_display_name", username);
    form.append("u_company", company);
    form.append("u_contact_person", contactPerson);
    form.append("u_street_no", u_street_no);
    form.append("u_street", street);
    form.append("u_location", city);
    form.append("u_postcode", postalCode);
    form.append("u_country", country);
    form.append("u_vat_no", vatId || "");
    form.append("u_tax_no", taxNumber || "");
    form.append("u_email", email);
    form.append("u_phone", phone);
    form.append("u_landline_number", mobile);
    form.append("u_username", username);
    form.append("u_password", password);
    form.append("u_web_site", website);
    form.append("u_account_owner", fullName);
    form.append("u_bank", bankName);
    form.append("u_iban", iban);
    form.append("u_bic", bic);
    form.append("u_bank_address", "I");
    form.append("u_i_or_we", "I");
    form.append("u_describe_business", u_describe_business || "");
    form.append("u_business_purpose", u_business_purpose || "");
    form.append("u_export_import", u_export_import);
    form.append("u_country_origin", u_country_origin);
    form.append("u_recipient_country", u_recipient_country);
    form.append("selectedDate", new Date().toISOString().split("T")[0]);

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
    console.log("[BrokerRegistration] Language for external API - lang:", lang, "language:", languageParam, "using:", langForApi, "-> Mapped to:", languageForApi);
    form.append("language", languageForApi);
    form.append("u_date", idExpiryDate || new Date().toISOString().split("T")[0]);

    // if (req.files?.u_trade_register) {
    //   form.append(
    //     "u_trade_register",
    //     fs.createReadStream(req.files.u_trade_register.tempFilePath),
    //     req.files.u_trade_register.name
    //   );
    // }

    // if (req.files?.u_travel_id) {
    //   form.append(
    //     "u_travel_id",
    //     fs.createReadStream(req.files.u_travel_id.tempFilePath),
    //     req.files.u_travel_id.name
    //   );
    // }

    // if (req.files?.signatureData) {
    //   const sigBuffer = fs.readFileSync(req.files.signatureData.tempFilePath);
    //   const sigBase64 = sigBuffer.toString("base64");

    //   form.append("signatureData", sigBase64);
    // }
    if (req.files?.u_travel_id?.[0]) {
      const file = req.files.u_travel_id[0];
      form.append("u_travel_id", file.buffer, { filename: file.originalname });
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
    console.log("==================START CALLING API==============");


    // ✅ Send to external API
    const apiResponse = await axios.post(`${process.env.EASY_GOLD_URL}/api/Register`, form, {
      headers: form.getHeaders(),
    });

    console.log("External API response:", apiResponse.data);
    console.log("External API response 2:", apiResponse.data?.data);

    // Check if external API returned an error
    if (!apiResponse.data?.success) {
      return res.status(400).json({
        success: false,
        message: apiResponse.data?.message || "Registration failed at external API",
      });
    }

    const userSign = await db.UsersMeta.findOne({
      where: {
        user_id: apiResponse.data?.data?.user_id,
        meta_key: "signatureData"
      },
      attributes: ["meta_value"],
      raw: true
    });

    let brockerPdfData = {
      name: fullName,
      username: username,
      address: `${address}, ${city}, ${postalCode}`,
      u_street_no: u_street_no,
      u_street: address,
      u_location: city,
      u_postcode: postalCode,
      date: new Date().toISOString().split("T")[0],
      signature: `${process.env.PUBLIC_URL}${userSign?.meta_value}`,
      language: languageForApi,
      stamp_logo: await generateImageUrl("agreements/stamp.png", 'agreements'),
      mlm_structure_image: await generateImageUrl("agreements/mlm_structure.png", 'agreements')
    };

    // if (languageForApi == "en-US") {
    let docsData = await generateAgreementPDF(brockerPdfData, parentBroker);
    // } else if (languageForApi == "de-DE") {
    // }

    const user_id = apiResponse.data?.data?.user_id;
    console.log("user_id:", user_id);
    // Create new user (6LWUP_users)
    // const createdAt = new Date();
    // const newUser = await db.Users.create({
    //   user_login: username,
    //   user_nicename: username,
    //   user_email: email,
    //   user_pass: hashedPassword,
    //   user_registered: createdAt,
    //   display_name: fullName,
    //   user_type: 0,
    //   mystorekey: email,
    // });

    // Prepare usermeta key-value pairs
    // const userMetaData = {
    //   u_trade_register,
    //   u_travel_id,
    //   signatureData,
    //   u_company: company,
    //   u_contact_person: contactPerson,
    //   u_street_no: u_street_no || "21",
    //   u_street: u_street || "street",
    //   u_location: u_location || city,
    //   u_postcode: postalCode,
    //   u_country: country,
    //   u_vat_no: vatId || "",
    //   u_tax_no: taxNumber || "",
    //   u_phone: phone,
    //   u_landline_number: mobile,
    //   u_web_site: website || "",
    //   u_i_or_we: "I",
    //   u_other_i_or_we: "I",
    //   u_date: new Date(),
    //   language: "English",
    //   date: new Date(),
    //   vat_exempt: "0",
    //   IdCardIsExpiredUrl: "test",
    //   u_describe_business: u_describe_business || "",
    //   u_other_describe_business: "test",
    //   u_business_purpose: u_business_purpose || "",
    //   u_other_business_purpose: "t",
    //   u_export_import: u_export_import || "",
    //   u_country_origin: u_country_origin || "",
    //   u_recipient_country: u_recipient_country || "",
    //   u_account_owner: fullName,
    //   u_bank: bankName,
    //   u_iban: iban,
    //   u_bic: bic,
    //   u_bank_address: bankAddress,
    // };

    // const metaEntries = Object.entries(userMetaData).map(([key, value]) => ({
    //   user_id: user_id,
    //   meta_key: key,
    //   meta_value: value,
    // }));

    // await db.UsersMeta.bulkCreate(metaEntries);
    // const newUser = {
    //   ID: "2345"
    // }
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "External API did not return a valid user_id",
      });
    }

    // Verify user exists in database before creating broker
    const userExists = await db.Users.findOne({
      where: { ID: user_id },
    });

    if (!userExists) {
      return res.status(500).json({
        success: false,
        message: "User was created in external system but not found in database. Please try again in a few moments.",
      });
    }

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
      untermaklervertrag_doc: `uploads/agreements/${docsData.untermaklervertrag_doc}`,
      maklervertrag_doc: `uploads/agreements/${docsData.maklervertrag_doc}`
    });

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
    }


    // Update parent's children count
    if (!isAdminParent && parentBroker) {
      await parentBroker.update({
        children_count: parentBroker.children_count + 1,
      });
    }

    // 🔹 Create entry in MyStoreSettings
    // await db.MyStoreSetting.create({
    //   user_id: user_id,
    //   category: "all",
    //   paymentOption: "Cash_question, Card_question, Bank_Transfer_question",
    // });

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
