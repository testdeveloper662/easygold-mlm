const { applyKontorBrokerUpdate, findKontorBroker } = require("../../utils/kontorBrokerUpdateHelper");
const { kontorError } = require("../../utils/kontorErrorCodes");

// Kontor described every later change (activation after first payment,
// blocking, termination, new address) as "updates of the same record" — so
// this accepts the same nested shape as registration and applies whatever
// subset of fields is present.
const UpdateKontorBroker = async (req, res) => {
  try {
    const { broker_id, external_ref } = req.body;

    if (!broker_id && !external_ref) {
      return kontorError(res, 400, "VALIDATION_ERROR", "broker_id or external_ref is required");
    }

    const broker = await findKontorBroker(req.body);
    if (!broker) {
      return kontorError(res, 404, "NOT_FOUND", "No Kontor-sourced broker found for this broker_id/external_ref");
    }

    await applyKontorBrokerUpdate(broker, req.body);

    return res.status(200).json({
      success: true,
      broker_id: broker.id,
      user_id: broker.user_id,
    });
  } catch (error) {
    console.error("[Kontor] Error in UpdateKontorBroker:", error);
    return kontorError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
};

module.exports = UpdateKontorBroker;
