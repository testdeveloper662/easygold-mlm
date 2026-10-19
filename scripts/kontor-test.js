require("dotenv").config();
const crypto = require("crypto");
const http = require("http");

// Dev helper: signs AND sends a request to a local /api/v1/kontor/* endpoint
// in one shot, so the timestamp is always fresh (manually-copied headers go
// stale after 5 minutes).
//
// Usage:
//   node scripts/kontor-test.js GET /health
//   node scripts/kontor-test.js GET "/referral-code/check?referral_code=ABC12345"
//   node scripts/kontor-test.js POST /broker/register '{"customer_no":60123,...}'
//   node scripts/kontor-test.js POST /broker/register path/to/body.json
//
// HOST/PORT default to localhost:4000 — override with KONTOR_TEST_HOST / KONTOR_TEST_PORT.

const [, , method, path, bodyArg] = process.argv;

if (!method || !path) {
  console.error('Usage: node scripts/kontor-test.js <METHOD> <PATH> [JSON-body-or-@file]');
  process.exit(1);
}

const secret = process.env.KONTOR_HMAC_SECRET;
if (!secret) {
  console.error("KONTOR_HMAC_SECRET is not set in .env");
  process.exit(1);
}

let rawBody = "";
if (bodyArg) {
  const fs = require("fs");
  rawBody = bodyArg.startsWith("@") ? fs.readFileSync(bodyArg.slice(1), "utf8") : bodyArg;
  // Re-serialize through JSON.parse/stringify so whitespace in a hand-typed
  // arg can't accidentally produce different bytes than what's sent.
  rawBody = JSON.stringify(JSON.parse(rawBody));
}

const timestamp = Date.now().toString();
const nonce = crypto.randomUUID();
const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${nonce}.${rawBody}`).digest("hex");

const headers = {
  "X-Kontor-Timestamp": timestamp,
  "X-Kontor-Nonce": nonce,
  "X-Kontor-Signature": signature,
};
if (rawBody) {
  headers["Content-Type"] = "application/json";
  headers["Content-Length"] = Buffer.byteLength(rawBody);
}

const host = process.env.KONTOR_TEST_HOST || "localhost";
const port = process.env.KONTOR_TEST_PORT || 4000;
const fullPath = `/api/v1/kontor${path.startsWith("/") ? path : `/${path}`}`;

console.log(`--> ${method} ${fullPath}`);
if (rawBody) console.log(`    body: ${rawBody}`);

const req = http.request({ hostname: host, port, path: fullPath, method, headers }, (res) => {
  let data = "";
  res.on("data", (c) => (data += c));
  res.on("end", () => {
    console.log(`<-- ${res.statusCode}`);
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch {
      console.log(data);
    }
  });
});
req.on("error", (err) => {
  // Node's dual-stack (happy-eyeballs) connection attempts can surface as an
  // AggregateError whose own .message is empty — the real reasons are in
  // .errors. Print both, plus a nudge for the most common cause.
  console.error("Request failed:", err.message || err.code || err.name || "(no message)");
  if (Array.isArray(err.errors)) {
    err.errors.forEach((e, i) => console.error(`  [${i}] ${e.code || e.name}: ${e.message}`));
  }
  console.error(`Is the server running on ${host}:${port}? (npm start)`);
});
req.end(rawBody || undefined);
