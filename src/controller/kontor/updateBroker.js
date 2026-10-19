const { applyKontorBrokerUpdate, findKontorBroker } = require("../../utils/kontorBrokerUpdateHelper");

// Kontor described every later change (activation after first payment,
// blocking, termination, new address) as "updates of the same record" — so
// this accepts the same nested shape as registration and applies whatever
// subset of fields is present.
const UpdateKontorBroker = async (req, res) => {
  try {
    const { customer_no, mlm_customer_number } = req.body;

    if (!customer_no && !mlm_customer_number) {
      return res.status(400).json({
        success: false,
        message: "customer_no or mlm_customer_number is required",
      });
    }

    const broker = await findKontorBroker(req.body);
    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "No Kontor-sourced broker found for this customer_no/mlm_customer_number",
      });
    }

    await applyKontorBrokerUpdate(broker, req.body);

    return res.status(200).json({
      success: true,
      message: "Broker updated successfully",
      data: {
        mlm_customer_number: broker.mlm_customer_number,
        broker_id: broker.id,
        user_id: broker.user_id,
      },
    });
  } catch (error) {
    console.error("[Kontor] Error in UpdateKontorBroker:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = UpdateKontorBroker;
