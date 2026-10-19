const db = require("../../models");

const CheckKontorReferralCode = async (req, res) => {
  try {
    const referralCode = (req.query.referral_code || "").trim();

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: "referral_code query parameter is required",
      });
    }

    const adminCode = (process.env.ADMIN_REFERRAL_CODE || "").trim().toUpperCase();
    let valid = referralCode.toUpperCase() === adminCode;

    if (!valid) {
      const [userReferral, broker, affiliate] = await Promise.all([
        db.UserReferrals.findOne({ where: { referral_code: referralCode } }),
        db.Brokers.findOne({ where: { referral_code: referralCode } }),
        db.Affiliates
          ? db.Affiliates.findOne({ where: { referral_code: referralCode } })
          : Promise.resolve(null),
      ]);

      valid = Boolean(userReferral || broker || affiliate);
    }

    return res.status(200).json({
      success: true,
      data: {
        referral_code: referralCode,
        valid,
      },
    });
  } catch (error) {
    console.error("Error checking Kontor referral code:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = CheckKontorReferralCode;
