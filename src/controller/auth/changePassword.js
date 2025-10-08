const db = require("../../models");
const nodemailer = require("nodemailer");

const MAIL_SENDER = process.env.MAIL_SENDER;
const MAIL_PASSWORD = process.env.MAIL_PASSWORD;

const ChangePassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await db.Users.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not exists",
      });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.update({
      otp,
      otp_expires: otpExpires,
    });

    // Send email with generated OTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: MAIL_SENDER,
        pass: MAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: MAIL_SENDER,
      to: email,
      subject: "Password Reset OTP",
      html: `
        <h3>Password reset request</h3>
        <p>Your OTP for password change is: <strong>${otp}</strong></p>
        <p>This OTP will expire at ${otpExpires.toLocaleString()}.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "OTP has been sent to this email",
      data: {},
    });
  } catch (error) {
    console.log("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = ChangePassword;
