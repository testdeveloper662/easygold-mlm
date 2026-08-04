require("dotenv").config();
const db = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateImageUrl } = require("../../utils/Helper");

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
        deleted_at: null,
      },
    });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Broker not exists",
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

    // Determine role
    let userRole = "BROKER";
    if (user.user_type === 1) {
      userRole = "SUPER_ADMIN";
    } else if (user.role_id === 3) {
      userRole = "AFFILIATE";
    } else if (user.role_id === 2) {
      userRole = "BROKER";
    }

    // ---------------------
    // ADMIN LOGIN LOGIC
    // ---------------------

    if (userRole === "SUPER_ADMIN") {
      const { user_pass: _, ...userData } = user.toJSON();
      userData.role = "SUPER_ADMIN";

      const token = jwt.sign({ user: userData }, JWT_ACCESS_TOKEN, {
        expiresIn: process.env.JWT_EXPIRE || "90d",
      });

      return res.status(200).json({
        success: true,
        message: "Admin logged in successfully",
        data: { user: userData, token },
      });
    }

    // ---------------------
    // BROKER & AFFILIATE LOGIN LOGIC
    // ---------------------

    if (!referral_code || referral_code === null) {
      isNewUser = false;
    }

    let actor = null;
    if (userRole === "BROKER") {
      actor = await db.Brokers.findOne({
        where: {
          user_id: user.ID,
        },
      });

      if (!actor) {
        return res
          .status(400)
          .json({ success: false, message: "Broker not found" });
      }
    } else if (userRole === "AFFILIATE") {
      actor = await db.Affiliates.findOne({
        where: {
          user_id: user.ID,
        },
      });

      if (!actor) {
        return res
          .status(400)
          .json({ success: false, message: "Affiliate not found" });
      }
    }

    const userVerified = await db.Users.findOne({
      where: {
        id: user.ID
      },
      raw: true
    });
    console.log("userVerified= ", userVerified);

    if (userVerified && userVerified?.user_status != 0) {
      if (userVerified.user_status === 1) {
        return res.status(403).json({
          success: false,
          message: "Your account is deactivated/inactive. Please contact support for assistance.",
          user_status: 1,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Your Profile is Under Review. We will notify you soon through email.",
          user_status: userVerified.user_status,
        });
      }
    }

    if (isNewUser) {
      // Find parent (can be Broker or Affiliate)
      let parent = await db.Brokers.findOne({
        where: {
          referral_code: referral_code,
        },
      });

      if (!parent && db.Affiliates) {
        parent = await db.Affiliates.findOne({
          where: {
            referral_code: referral_code,
          },
        });
      }

      if (!parent) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid referral code" });
      }

      actor.referred_by_code = parent.referral_code;
      actor.parent_id = parent.id || null;
      await actor.save();

      // increment count of parent's children_count
      parent.children_count = (parent.children_count || 0) + 1;
      await parent.save();
    } else {
      if (!actor.referred_by_code) {
        return res
          .status(400)
          .json({ success: false, message: `Invalid ${userRole.toLowerCase()}` });
      }
    }

    const { user_pass: _, ...userData } = user.toJSON();

    userData.role = userRole;
    userData.logo = await generateImageUrl(actor.logo, "logo");
    userData.referral_code = actor?.referral_code;
    if (userRole === "BROKER") {
      userData.broker_id = actor?.id;
    } else {
      userData.affiliate_id = actor?.id;
    }
    userData.profile_image = await generateImageUrl(actor.profile_image, "profile");

    let landing_pageurl = null;
    let landing_page = false;
    if (user.landing_page) {
      landing_pageurl = `${process.env.EASY_GOLD_URL}/landingpage/${user?.mystorekey}`;
      landing_page = true;
    }

    let easyGoldReferralCode = Buffer.from(String(actor?.referral_code), "utf-8").toString("base64");

    userData.landing_pageurl = landing_pageurl;
    userData.goldbuying_page = `${process.env.EASY_GOLD_URL}/Goldankauf/${user?.mystorekey}`;
    userData.silverpurchase_page = `${process.env.EASY_GOLD_URL}/Silberankauf/${user?.mystorekey}`;
    userData.platinumpurchase_page = `${process.env.EASY_GOLD_URL}/Platinankauf/${user?.mystorekey}`;
    userData.palladiumpurchase_page = `${process.env.EASY_GOLD_URL}/Palladiumankauf/${user?.mystorekey}`;
    userData.preciousmetalsale_page = `${process.env.EASY_GOLD_URL}/Edelmetallverkauf/${user?.mystorekey}`;
    userData.cointrade_page = `${process.env.EASY_GOLD_URL}/Muenzhandel/${user?.mystorekey}`;
    userData.jewelryappraisal_page = `${process.env.EASY_GOLD_URL}/schmuckbewertung/${user?.mystorekey}`;
    userData.consultingexpertise_page = `${process.env.EASY_GOLD_URL}/BeratungUndExpertise/${user?.mystorekey}`;
    userData.previousmetaldealers_page = `${process.env.EASY_GOLD_URL}/zoomLanding/${user?.mystorekey}`;
    userData.selfservice_page = `${process.env.EASY_GOLD_URL}/mystore/${user?.mystorekey}`;
    userData.landing_page = landing_page;
    userData.goldflexurl = `${process.env.FRONTEND_URL}/customer-referral/${easyGoldReferralCode}/goldflex`;
    userData.easygoldurl = `${process.env.FRONTEND_URL}/customer-referral/${easyGoldReferralCode}/easygold`;
    userData.primeinvesturl = `${process.env.FRONTEND_URL}/customer-referral/${easyGoldReferralCode}/primeinvest`;

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
