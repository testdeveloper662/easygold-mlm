const { TermsAndCondition } = require("../../models");

const getAllTermsAndConditions = async (req, res) => {
  try {
    const terms = await TermsAndCondition.findAll();
    return res.status(200).json({
      success: true,
      data: terms,
    });
  } catch (error) {
    console.error("Error fetching terms and conditions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = getAllTermsAndConditions;
