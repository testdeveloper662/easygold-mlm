const db = require("../../models");

const GetReferralDetails = async (req, res) => {
  try {
    const referralCode = req.query.referral_code; // or your source
    let referralName = null;

    if (referralCode) {
      // Step 1: Find in Brokers table using referral_code
      const broker = await db.Brokers.findOne({
        where: { referral_code: referralCode },
        attributes: ["user_id"],
        raw: true
      });

      // Step 2: If broker found, get user display name
      if (broker && broker.user_id) {
        const user = await db.Users.findOne({
          where: { ID: broker.user_id },
          attributes: ["display_name"],
          raw: true
        });

        if (user) {
          referralName = user.display_name;
        }
      }
    }


    return res.json({
      success: true,
      referral_code: referralCode,
      referral_name: referralName
    });
  } catch (error) {
    console.error("Error fetching broker network:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = GetReferralDetails;
