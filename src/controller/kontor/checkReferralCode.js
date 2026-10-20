const db = require("../../models");
const { kontorError } = require("../../utils/kontorErrorCodes");

const CheckKontorReferralCode = async (req, res) => {
  try {
    const referralCode = (req.query.referral_code || "").trim();

    if (!referralCode) {
      return kontorError(res, 400, "VALIDATION_ERROR", "referral_code query parameter is required");
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
    return kontorError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
};

module.exports = CheckKontorReferralCode;
