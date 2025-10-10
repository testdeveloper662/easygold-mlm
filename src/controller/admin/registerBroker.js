const db = require("../../models");
const nodemailer = require("nodemailer");
const axios = require("axios");
const bcrypt = require("bcrypt");

const MAIL_SENDER = process.env.MAIL_SENDER;
const MAIL_PASSWORD = process.env.MAIL_PASSWORD;
const ADMIN_REFERRAL_CODE = process.env.ADMIN_REFERRAL_CODE;

const RegisterBroker = async (req, res) => {
  try {
    const { brokerName, email } = req.body;

    // Check if broker already exists
    const existingUser = await db.Users.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    // const apiUrl = `https://goldsilberstore.com/api/b2b-users?email=${email}`;
    // const apiResponse = await axios.get(apiUrl);

    // if (!apiResponse.data.success) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Broker email does not exist.",
    //   });
    // }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create User (role = BROKER)
    const newUser = await db.Users.create({
      first_name: brokerName,
      last_name: "",
      email,
      password: hashedPassword,
      role: "BROKER",
    });

    // Generate unique referral code
    // const referralCode = Math.random()
    //   .toString(36)
    //   .substring(2, 10)
    //   .toUpperCase();

    // Create Broker entry
    const newBroker = await db.Brokers.create({
      user_id: newUser.id,
      parent_id: null,
      referral_code: null,
      referred_by_code: null,
    });

    // Create transporter
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
        👉 <a href="${registerUrl}">Register now with referral code ${ADMIN_REFERRAL_CODE}</a></p>

        <p><strong>Email:</strong> ${email}<br/>
        <strong>Temporary password:</strong> ${tempPassword}<br/>
        <strong>Referral code:</strong> ${ADMIN_REFERRAL_CODE}</p>

        <p>For your security, please change your password after logging in for the first time.</p>

        <p>If you have any questions, our team is always happy to help.</p>

        <p>Best regards,<br/>
        Your Hartmann & Benz Group Team</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Email has been sent with Registration details.",
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = RegisterBroker;
