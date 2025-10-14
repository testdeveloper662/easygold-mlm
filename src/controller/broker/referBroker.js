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

    // Send email with credentials
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: MAIL_SENDER,
        pass: MAIL_PASSWORD,
      },
    });

    const registerUrl = process.env.FRONTEND_URL + "/broker-register/step1";

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
        Please click on the following link to start your registration<br/>
        👉 <a href="${registerUrl}">Register now with referral code ${user.referral_code}</a></p>

        <p><strong>Email:</strong> ${email}<br/>
        <strong>Referral code:</strong> ${user.referral_code}</p>

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

module.exports = ReferBroker;
