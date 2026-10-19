const { applyKontorBrokerUpdate, findKontorBroker } = require("../../utils/kontorBrokerUpdateHelper");

const UpdateKontorBrokerStatus = async (req, res) => {
  try {
    const { customer_no, mlm_customer_number, status } = req.body;

    if ((!customer_no && !mlm_customer_number) || !status) {
      return res.status(400).json({
        success: false,
        message: "customer_no (or mlm_customer_number) and status are required",
      });
    }

    const broker = await findKontorBroker(req.body);
    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "No Kontor-sourced broker found for this customer_no/mlm_customer_number",
      });
    }

    await applyKontorBrokerUpdate(broker, { status, activated_at: req.body.activated_at });

    return res.status(200).json({
      success: true,
      message: "Broker status updated successfully",
      data: {
        mlm_customer_number: broker.mlm_customer_number,
        broker_id: broker.id,
        user_id: broker.user_id,
        status: String(status).toLowerCase().trim(),
      },
    });
  } catch (error) {
    console.error("[Kontor] Error in UpdateKontorBrokerStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = UpdateKontorBrokerStatus;
