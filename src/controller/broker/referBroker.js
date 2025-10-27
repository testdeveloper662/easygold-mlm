const db = require("../../models");
const nodemailer = require("nodemailer");

const MAIL_SENDER = process.env.MAIL_SENDER;
const MAIL_PASSWORD = process.env.MAIL_PASSWORD;

const ReferBroker = async (req, res) => {
  try {
    const { email } = req.body;
    const { user } = req.user;

    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access. Only brokers can register new brokers.",
      });
    }

    // Check if parent broker already has 4 children
    const childrenCount = await db.Brokers.count({
      where: { parent_id: user.ID },
    });

    if (childrenCount >= 4) {
      return res.status(400).json({
        success: false,
        message: "You have already referred maximum 4 brokers.",
      });
    }

    // User must exist in users table
    const userExist = await db.Users.findOne({
      where: {
        user_email: email,
      },
    });

    if (!userExist) {
      return res.status(400).json({
        success: false,
        message: "User not exist. Please invite EasyGold registered user only.",
      });
    }

    // Check if broker exist or not in brokers table
    const brokerExist = await db.Brokers.findOne({
      where: {
        user_id: userExist.ID,
      },
    });

    if (brokerExist) {
      return res.status(400).json({
        success: false,
        message: "Broker already invited.",
      });
    }

    const parentBroker = await db.Brokers.findOne({
      where: {
        user_id: user.ID,
      },
    });

    // Generate unique referral code
    const referralCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();

    // Make broker entry in broker table
    await db.Brokers.create({
      user_id: userExist.ID,
      parent_id: null,
      referral_code: referralCode,
      referred_by_code: null,
      children_count: 0,
      total_commission_amount: 0,
    });

    // Send email with credentials
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: MAIL_SENDER,
        pass: MAIL_PASSWORD,
      },
    });

    const loginUrl =
      process.env.FRONTEND_URL +
      "/login" +
      `?referral_code=${parentBroker.referral_code}`;

    // Email content
    const mailOptions = {
      from: MAIL_SENDER,
      to: email,
      subject:
        "Welcome to the Hartmann & Benz Group — Complete your first login",
      html: `
        <p>Dear Partner,</p>

        <p>Welcome to the Hartmann & Benz Group!</p>

        <p>We are delighted to have you on board and are confident that we can offer you real added value.</p>

        <p>Your partner has sent you a referral code.<br/>
        Please click on the following link to start your login<br/>
        👉 <a href="${loginUrl}">Login now with referral code ${parentBroker.referral_code}</a></p>

        <p><strong>Email:</strong> ${email}<br/>
        <strong>Referral code:</strong> ${parentBroker.referral_code}</p>

        <p>If you have any questions, our team is always happy to help.</p>

        <p>Best regards,<br/>
        Your Hartmann & Benz Group Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Email has been sent with login details.",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = ReferBroker;
