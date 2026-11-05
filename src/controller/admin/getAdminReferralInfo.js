require("dotenv").config();

const GetAdminReferralInfo = async (req, res) => {
  try {
    const senderUser = req.user?.user || req.user;

    // This referral code functionality from env is strictly for SUPER_ADMIN only
    if (senderUser?.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access not allowed. Admin referral code is only for admin.",
      });
    }

    // Reload dotenv to pick up any changes in .env file dynamically
    require("dotenv").config();

    const adminReferralCode = (process.env.ADMIN_REFERRAL_CODE || "ROOTPARTNER").trim();
    const encodedReferralCode = Buffer.from(adminReferralCode, "utf-8").toString("base64");
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:8080").replace(/\/+$/, "");

    const brokerRegisterUrl = `${frontendUrl}/broker-register/step1/${encodedReferralCode}`;
    const affiliateRegisterUrl = `${frontendUrl}/affiliate-register?referral=${encodedReferralCode}`;

    return res.status(200).json({
      success: true,
      data: {
        referralCode: adminReferralCode,
        encodedReferralCode,
        brokerRegisterUrl,
        affiliateRegisterUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching admin referral info:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = GetAdminReferralInfo;

