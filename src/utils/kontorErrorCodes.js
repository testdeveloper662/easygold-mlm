// Stable error codes, per Christian: {"success": false, "code": "...", "message": "..."}
const KONTOR_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

const kontorError = (res, status, code, message) =>
  res.status(status).json({ success: false, code, message });

module.exports = { KONTOR_ERROR_CODES, kontorError };
