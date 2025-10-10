const db = require("../../models");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const MAIL_SENDER = process.env.MAIL_SENDER;
const MAIL_PASSWORD = process.env.MAIL_PASSWORD;

// Generate random referral code
const generateReferralCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// Generate random temp password
const generateTempPassword = () => Math.random().toString(36).slice(-8);

const RegisterBroker = async (req, res) => {
  try {
    const { brokerName, email } = req.body;
    const { user } = req.user;

    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access. Only brokers can register new brokers.",
      });
    }

    // Check if parent broker already has 4 children
    const childrenCount = await db.Brokers.count({
      where: { parent_id: user.id },
    });
    if (childrenCount >= 4) {
      return res.status(400).json({
        success: false,
        message: "You have already referred maximum 4 brokers.",
      });
    }

    // Check if email already exists
    const existingUser = await db.Users.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered.",
      });
    }

    // Generate temporary password and hash it
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create new user
    const newUser = await db.Users.create({
      first_name: brokerName,
      email,
      password: hashedPassword,
      role: "BROKER",
    });

    // Generate new referral code for broker
    // const referralCode = generateReferralCode();

    const parentBroker = await db.Brokers.findOne({
      where: {
        user_id: user.id,
      },
    });

    // Create broker entry
    const newBroker = await db.Brokers.create({
      user_id: newUser.id,
      parent_id: parentBroker.id,
      referral_code: null,
      referred_by_code: null,
    });

    // Increment parent's children count
    await db.Brokers.increment("children_count", {
      by: 1,
      where: { id: parentBroker.id },
    });

    // Send email with credentials
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: MAIL_SENDER,
        pass: MAIL_PASSWORD,
      },
    });

    const registerUrl =
      process.env.FRONTEND_URL +
      "/broker-register" +
      `?referral=${ADMIN_REFERRAL_CODE}`;

    // Email content
    const mailOptions = {
      from: MAIL_SENDER,
      to: email,
      subject:
        "Welcome to the Hartmann & Benz Group — Complete your registration",
      html: `
        <p>Dear Partner,</p>

        <p>Welcome to the Hartmann & Benz Group!</p>

        <p>We are delighted to have you on board and are confident that we can offer you real added value.</p>

        <p>Your partner has sent you a referral code.<br/>
        Please click on the following link to start your registration – the referral code will be automatically applied:<br/>
        👉 <a href="${registerUrl}">Register now with referral code ${parentBroker.referral_code}</a></p>

        <p><strong>Email:</strong> ${email}<br/>
        <strong>Temporary password:</strong> ${tempPassword}<br/>
        <strong>Referral code:</strong> ${parentBroker.referral_code}</p>

        <p>For your security, please change your password after logging in for the first time.</p>

        <p>If you have any questions, our team is always happy to help.</p>

        <p>Best regards,<br/>
        Your Hartmann & Benz Group Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Email has been sent with Registration details.",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = RegisterBroker;
