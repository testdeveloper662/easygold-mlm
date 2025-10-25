const db = require("../../models");

const GetBrokerCommissionHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "user id is required",
      });
    }

    // Fetch commission history ordered from latest to oldest
    const history = await db.BrokerCommissionHistory.findAll({
      where: { user_id: id },
      order: [["createdAt", "DESC"]],
    });

    if (!history.length) {
      return res.status(404).json({
        success: false,
        message: "No commission history found for this broker.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Broker commission history fetched successfully.",
      data: history,
    });
  } catch (error) {
    console.error("Error fetching broker commission history:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = GetBrokerCommissionHistory;
