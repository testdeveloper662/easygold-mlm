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
      idExpiryDate,
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
      !address ||
      !postalCode ||
      !city ||
      !country ||
      !email ||
      !phone ||
      !mobile ||
      !username ||
      !password ||
      !idExpiryDate ||
      !iban ||
      !bic ||
      !bankName ||
      !bankAddress
    ) {
      return res.status(400).json({
        success: false,
        message:
          "referralCode, fullName, company, contactPerson, address, postalCode, city, country, email, phone, mobile, username, password, idExpiryDate, iban, bic, bankName, bankAddress required",
      });
    }

    let isAdminParent;
    let parentBroker;

    if (referralCode === process.env.ADMIN_REFERRAL_CODE) {
      isAdminParent = true;
    } else {
      isAdminParent = false;
    }

    if (!isAdminParent) {
      parentBroker = await db.Brokers.findOne({
        where: {
          referral_code: referralCode,
        },
      });

      if (!parentBroker) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code",
        });
      }
    }

    const businessLicenseFile =
      req.files?.business_license?.[0]?.filename || null;
    const passportFrontFile = req.files?.passport_front?.[0]?.filename || null;
    const passportBackFile = req.files?.passport_back?.[0]?.filename || null;

    if (!businessLicenseFile || !passportBackFile || !passportFrontFile) {
      return res.status(400).json({
        success: false,
        message:
          "Business Licence, Passport/ID front and back document required",
      });
    }

    const existingUser = await db.Users.findOne({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newReferralCode = generateReferralCode();

    const user = await db.Users.create({
      referral_code: newReferralCode,
      fullName,
      company,
      contactPerson,
      address,
      postalCode,
      city,
      country,
      email,
      phone,
      mobile,
      username,
      password: hashedPassword,
      idExpiryDate,
      iban,
      bic,
      bankName,
      bankAddress,
      vatId,
      taxNumber,
      website,
      profile_verified: false,
      role: "BROKER",
      business_license: businessLicenseFile,
      passport_front: passportFrontFile,
      passport_back: passportBackFile,
    });

    await db.Brokers.create({
      user_id: user.id,
      parent_id: isAdminParent ? null : parentBroker.id,
      referral_code: newReferralCode,
      referred_by_code: isAdminParent
        ? process.env.ADMIN_REFERRAL_CODE
        : parentBroker.referral_code,
    });

    if (!isAdminParent) {
      await parentBroker.update({
        children_count: parentBroker.children_count + 1,
      });
    }

    const { password: _, ...userData } = user.toJSON();

    const token = jwt.sign(
      {
        user: userData,
      },
      JWT_ACCESS_TOKEN,
      {
        expiresIn: process.env.JWT_EXPIRE || "90d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Broker registered successfully",
      data: {
        user: userData,
        token,
      },
    });
  } catch (error) {
    console.log("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = BrokerRegistration;
