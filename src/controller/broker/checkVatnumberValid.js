
const axios = require("axios");

const validateVatNumber = async (vatNumber) => {
  if (!vatNumber || typeof vatNumber !== "string") return { success: false, message: "VAT number missing" };

  try {
    const response = await axios.post(
      "https://api.vatstack.com/v1/validations",
      { query: vatNumber },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.VATSTACK_KEY,
        },
        validateStatus: () => true, // Handle 400 manually
      }
    );

    // Check if VAT format is invalid
    if (!response.data.valid_format) {
      return { success: false, message: "VAT number format is invalid" };
    }

    if (!response.data.valid) {
      return { success: false, message: "VAT number is not registered or inactive" };
    }

    return { success: true };
  } catch (err) {
    console.error("[VAT Validation Error]", err.message);
    return { success: false, message: "Error validating VAT number", error: err.message };
  }
};

const CheckVatnumberValid = async (req, res) => {
  try {
    const { vatId } = req.query;

    if (!vatId) {
      return res.status(400).json({ success: false, message: "Please enter VAT Number" });
    }

    const vatCheck = await validateVatNumber(vatId);
    if (!vatCheck.success) {
      return res.status(400).json({ success: false, message: vatCheck.message });
    }

    // 5️⃣ Final response
    return res.json(vatCheck);
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

module.exports = CheckVatnumberValid;
