const db = require("../../models");
const nodemailer = require("nodemailer");
const axios = require("axios");
const bcrypt = require("bcrypt");

const MAIL_SENDER = process.env.MAIL_SENDER;
const MAIL_PASSWORD = process.env.MAIL_PASSWORD;

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

    const apiUrl = `https://goldsilberstore.com/api/b2b-users?email=${email}`;
    const apiResponse = await axios.get(apiUrl);

    if (!apiResponse.data.success) {
      return res.status(400).json({
        success: false,
        message: "Broker email does not exist.",
      });
    }

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
    const referralCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();

    // Create Broker entry
    const newBroker = await db.Brokers.create({
      user_id: newUser.id,
      parent_id: null,
      referral_code: referralCode,
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

    // Email content
    const mailOptions = {
      from: MAIL_SENDER,
      to: email,
      subject: "Broker Registration Details",
      html: `
        <h3>Welcome, ${brokerName}!</h3>
        <p>Your registration is successful.</p>
        <p><strong>Broker Name:</strong> ${brokerName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p>Please change your password after first login.</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Broker registered and email sent successfully.",
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
