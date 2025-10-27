const db = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_ACCESS_TOKEN = process.env.JWT_ACCESS_TOKEN;

const Login = async (req, res) => {
  try {
    const { email, password, referral_code } = req.body;
    let isNewUser = true;

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!password) {
      return res.status(404).json({
        success: false,
        message: "Password is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const user = await db.Users.findOne({
      where: {
        user_email: email,
      },
    });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not exists",
      });
    }

    let userPassword = user.user_pass;
    if (userPassword.startsWith("$2y")) {
      userPassword = userPassword.replace("$2y", "$2b");
    }

    const isValidPassword = await bcrypt.compare(password, userPassword);

    if (!isValidPassword) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password" });
    }

    if (!referral_code || referral_code === null) {
      isNewUser = false;
    }

    const broker = await db.Brokers.findOne({
      where: {
        user_id: user.ID,
      },
    });

    if (!broker) {
      return res
        .status(400)
        .json({ success: false, message: "Broker not found" });
    }

    if (isNewUser) {
      const parentBroker = await db.Brokers.findOne({
        where: {
          referral_code: referral_code,
        },
      });

      if (!parentBroker) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid referral code" });
      }

      broker.referred_by_code = parentBroker.referral_code;
      broker.parent_id = parentBroker.id || null;
      await broker.save();

      // increament count of parentBroker's children_count
      parentBroker.children_count = (parentBroker.children_count || 0) + 1;
      await parentBroker.save();
    } else {
      if (!broker.referred_by_code) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid broker" });
      }
    }

    const { user_pass: _, ...userData } = user.toJSON();

    userData.role = userData.user_type === 0 ? "BROKER" : "SUPER_ADMIN";

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
      message: "Logged in successfully",
      data: {
        user: userData,
        token,
      },
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = Login;
