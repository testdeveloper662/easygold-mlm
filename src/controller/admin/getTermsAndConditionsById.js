const { TermsAndCondition } = require("../../models");

const getTermsAndConditionsById = async (req, res) => {
  try {
    const { id } = req.params;

    const term = await TermsAndCondition.findByPk(id);

    if (!term) {
      return res.status(404).json({
        success: false,
        message: "Terms and conditions not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: term,
    });
  } catch (error) {
    console.error("Error fetching terms and conditions by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = getTermsAndConditionsById;
