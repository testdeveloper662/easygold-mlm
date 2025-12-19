const db = require("../../models");

const GetReferralDetails = async (req, res) => {
  try {
    const referralCode = req.query.referral_code;
    let referralName = null;
    let limitReached = false;
    let totalChildren = 0;

    if (!referralCode) {
      return res.json({
        success: true,
        referral_code: null,
        referral_name: null,
        limitReached: false,
      });
    }

    // 1️⃣ Find parent broker by referral_code
    const parentBroker = await db.Brokers.findOne({
      where: { referral_code: referralCode },
      attributes: ["id", "user_id"],
      raw: true,
    });

    if (!parentBroker) {
      return res.json({
        success: false,
        message: "Invalid referral code",
      });
    }

    // 2️⃣ Count how many brokers already referred by this code
    totalChildren = await db.Brokers.count({
      where: {
        referred_by_code: referralCode,
      },
    });

    // 3️⃣ Check limit (max 4)
    if (totalChildren >= 4) {
      limitReached = true;
    }

    // 4️⃣ Get referral user's display name
    const user = await db.Users.findOne({
      where: { ID: parentBroker.user_id },
      attributes: ["display_name"],
      raw: true,
    });

    if (user) {
      referralName = user.display_name;
    }

    // 5️⃣ Final response
    return res.json({
      success: true,
      referral_code: referralCode,
      referral_name: referralName,
      total_children: totalChildren,
      limitReached,
    });
  } catch (error) {
    console.error("Error fetching referral details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

module.exports = GetReferralDetails;
