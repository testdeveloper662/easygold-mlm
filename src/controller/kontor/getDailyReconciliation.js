const { getOurDailyTotals } = require("../../utils/kontorReconciliationHelper");
const { kontorError } = require("../../utils/kontorErrorCodes");

const GetKontorDailyReconciliation = async (req, res) => {
  try {
    const dateParam = req.query.date;
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    if (isNaN(targetDate.getTime())) {
      return kontorError(res, 400, "VALIDATION_ERROR", "Invalid date. Use format YYYY-MM-DD.");
    }

    const result = await getOurDailyTotals(targetDate);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[Kontor] Error fetching daily reconciliation:", error);
    return kontorError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
};

module.exports = GetKontorDailyReconciliation;
