require("dotenv").config();
const crypto = require("crypto");

// Dev helper: generates valid X-Kontor-Timestamp/Nonce/Signature headers for
// manually testing /api/v1/kontor/* endpoints (Swagger UI can't compute an
// HMAC on its own, so this fills that gap).
//
// Usage:
//   node scripts/kontor-sign-request.js '{"referral_code":"ABC12345"}'
//   node scripts/kontor-sign-request.js            (no body, for a GET request)

const rawBody = process.argv[2] || "";

const secret = process.env.KONTOR_HMAC_SECRET;
if (!secret) {
  console.error("KONTOR_HMAC_SECRET is not set in .env");
  process.exit(1);
}

const timestamp = Date.now().toString();
const nonce = crypto.randomUUID();
const payload = `${timestamp}.${nonce}.${rawBody}`;
const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

console.log("X-Kontor-Timestamp:", timestamp);
console.log("X-Kontor-Nonce:", nonce);
console.log("X-Kontor-Signature:", signature);
console.log();
console.log("curl example:");
console.log(
  `curl -X GET 'http://localhost:4000/api/v1/kontor/health' \\\n` +
  `  -H 'X-Kontor-Timestamp: ${timestamp}' \\\n` +
  `  -H 'X-Kontor-Nonce: ${nonce}' \\\n` +
  `  -H 'X-Kontor-Signature: ${signature}'`
);
