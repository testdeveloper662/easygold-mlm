const crypto = require("crypto");
const { kontorError } = require("../utils/kontorErrorCodes");

// Replay protection: remember nonces we've already seen for the lifetime of
// the timestamp window, then forget them. In-memory only (single-instance
// assumption) — acceptable here since the window is short (5 minutes).
const seenNonces = new Map();
const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

setInterval(() => {
  const cutoff = Date.now() - TIMESTAMP_WINDOW_MS;
  for (const [nonce, seenAt] of seenNonces) {
    if (seenAt < cutoff) seenNonces.delete(nonce);
  }
}, 60 * 1000).unref();

const kontorHmacAuth = (req, res, next) => {
  const secret = process.env.KONTOR_HMAC_SECRET;

  if (!secret) {
    console.error("[Kontor] KONTOR_HMAC_SECRET is not configured — rejecting all signed requests.");
    return kontorError(res, 500, "INTERNAL_ERROR", "Server is not configured for Kontor request signing.");
  }

  const timestamp = req.headers["x-kontor-timestamp"];
  const nonce = req.headers["x-kontor-nonce"];
  const signature = req.headers["x-kontor-signature"];

  if (!timestamp || !nonce || !signature) {
    return kontorError(res, 401, "UNAUTHORIZED", "Missing request signature headers (X-Kontor-Timestamp, X-Kontor-Nonce, X-Kontor-Signature).");
  }

  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > TIMESTAMP_WINDOW_MS) {
    return kontorError(res, 401, "UNAUTHORIZED", "Request timestamp is missing, invalid, or outside the allowed window.");
  }

  if (seenNonces.has(nonce)) {
    return kontorError(res, 401, "UNAUTHORIZED", "Nonce already used (possible replay).");
  }

  // express.json()'s verify callback captures the exact raw bytes for every
  // JSON request on this router (POST/PUT). A bodyless GET never reaches
  // that callback, so req.rawBody stays unset — the signed string for those
  // is the empty string, not "{}" or any other stand-in for "no body".
  const rawBody = req.rawBody ? req.rawBody.toString("utf8") : "";
  const payload = `${timestamp}.${nonce}.${rawBody}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  const isValid =
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!isValid) {
    return kontorError(res, 401, "UNAUTHORIZED", "Invalid request signature.");
  }

  seenNonces.set(nonce, Date.now());
  next();
};

module.exports = kontorHmacAuth;
