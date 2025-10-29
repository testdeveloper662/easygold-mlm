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
        message: "You have already referred the maximum of 4 brokers.",
      });
    }

    const userExist = await db.Users.findOne({
      where: { user_email: email },
    });

    const parentBroker = await db.Brokers.findOne({
      where: { user_id: user.ID },
    });

    if (!parentBroker) {
      return res.status(400).json({
        success: false,
        message: "Parent broker record not found.",
      });
    }

    // Setup transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: MAIL_SENDER,
        pass: MAIL_PASSWORD,
      },
    });

    let mailOptions;

    // ✅ CASE 1: User already exists → generate referral code + create broker + send login email
    if (userExist) {
      // Generate a unique referral code (8 chars)
      const referralCode = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();

      // Check if broker already exists
      const existingBroker = await db.Brokers.findOne({
        where: { user_id: userExist.ID },
      });

      // Create broker if not exists
      if (!existingBroker) {
        await db.Brokers.create({
          user_id: userExist.ID,
          parent_id: user.ID,
          referral_code: referralCode,
          referred_by_code: parentBroker.referral_code,
          children_count: 0,
          total_commission_amount: 0,
        });
      }

      const loginUrl =
        process.env.FRONTEND_URL + "/login" + `?referral_code=${referralCode}`;

      mailOptions = {
        from: MAIL_SENDER,
        to: email,
        subject:
          "Welcome Back to the Hartmann & Benz Group — Access Your Broker Account",
        html: `
          <p>Dear Partner,</p>

          <p>Welcome back to the Hartmann & Benz Group!</p>

          <p>Your partner has invited you to join as a broker.</p>

          <p>You can now login to your broker account using the link below:<br/>
          👉 <a href="${loginUrl}">Login to your account</a></p>

          <p><strong>Email:</strong> ${email}<br/>
          <strong>Your Referral Code:</strong> ${referralCode}</p>

          <p>If you have any questions, our team is always happy to help.</p>

          <p>Best regards,<br/>
          Your Hartmann & Benz Group Team</p>
        `,
      };
    }

    // ✅ CASE 2: User does NOT exist → send registration email
    else {
      const registrationUrl =
        process.env.FRONTEND_URL + "/broker-register/step1";

      mailOptions = {
        from: MAIL_SENDER,
        to: email,
        subject:
          "Welcome to the Hartmann & Benz Group — Complete Your Registration",
        html: `
          <p>Dear Partner,</p>

          <p>Welcome to the Hartmann & Benz Group!</p>

          <p>Your partner has invited you to join our broker network.</p>

          <p>Please click the link below to start your registration:<br/>
          👉 <a href="${registrationUrl}">Register Now</a></p>

          <p><strong>Email:</strong> ${email}<br/>
          <strong>Referral Code:</strong> ${parentBroker.referral_code}</p>

          <p>If you have any questions, our team is always happy to help.</p>

          <p>Best regards,<br/>
          Your Hartmann & Benz Group Team</p>
        `,
      };
    }

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: `Email sent successfully to ${email}`,
    });
  } catch (error) {
    console.error("Error in ReferBroker:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = ReferBroker;
