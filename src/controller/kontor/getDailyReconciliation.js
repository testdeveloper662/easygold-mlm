const { getOurDailyTotals } = require("../../utils/kontorReconciliationHelper");

const GetKontorDailyReconciliation = async (req, res) => {
  try {
    const dateParam = req.query.date;
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date. Use format YYYY-MM-DD.",
      });
    }

    const result = await getOurDailyTotals(targetDate);

    return res.status(200).json({
      success: true,
      message: "Daily reconciliation totals retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("[Kontor] Error fetching daily reconciliation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetKontorDailyReconciliation;
