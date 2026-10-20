const { applyKontorBrokerUpdate, findKontorBroker } = require("../../utils/kontorBrokerUpdateHelper");
const { kontorError } = require("../../utils/kontorErrorCodes");

const UpdateKontorBrokerStatus = async (req, res) => {
  try {
    const { broker_id, external_ref, status, effective_at, reason_key, lang } = req.body;

    if ((!broker_id && !external_ref) || !status) {
      return kontorError(res, 400, "VALIDATION_ERROR", "broker_id (or external_ref) and status are required");
    }

    const broker = await findKontorBroker(req.body);
    if (!broker) {
      return kontorError(res, 404, "NOT_FOUND", "No Kontor-sourced broker found for this broker_id/external_ref");
    }

    await applyKontorBrokerUpdate(broker, { status, effective_at, reason_key, lang });

    return res.status(200).json({
      success: true,
      broker_id: broker.id,
      user_id: broker.user_id,
      status: String(status).toLowerCase().trim(),
    });
  } catch (error) {
    console.error("[Kontor] Error in UpdateKontorBrokerStatus:", error);
    return kontorError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
};

module.exports = UpdateKontorBrokerStatus;
