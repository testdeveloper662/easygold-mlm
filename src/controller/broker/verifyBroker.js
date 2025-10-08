const db = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_ACCESS_TOKEN = process.env.JWT_ACCESS_TOKEN;
const ADMIN_REFERRAL_CODE = process.env.ADMIN_REFERRAL_CODE;

// Generate random referral code
const generateReferralCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

const VerifyBroker = async (req, res) => {
  try {
    const { email, password, referral_code } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (!referral_code) {
      return res.status(400).json({
        success: false,
        message: "Referral Code is required",
      });
    }

    const user = await db.Users.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not exist",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password" });
    }

    const broker = await db.Brokers.findOne({
      where: {
        user_id: user.id,
      },
    });

    if (referral_code === ADMIN_REFERRAL_CODE) {
      await broker.update({
        referral_code: generateReferralCode(),
        referred_by_code: ADMIN_REFERRAL_CODE,
      });
    } else {
      const parentBroker = await db.Brokers.findOne({
        where: {
          id: broker.parent_id,
        },
      });

      if (!parentBroker) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code",
        });
      }

      if (referral_code !== parentBroker.referral_code) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code",
        });
      }

      await broker.update({
        referral_code: generateReferralCode(),
        referred_by_code: parentBroker.referral_code,
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
      message: "Registered successfully",
      data: {
        user: userData,
        token,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = VerifyBroker;
