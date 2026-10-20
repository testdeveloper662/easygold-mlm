const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

const getKey = () => {
  const hex = process.env.BANK_DETAILS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("BANK_DETAILS_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars)");
  }
  return Buffer.from(hex, "hex");
};

// Encrypts a JS value (JSON-stringified) to a single base64 payload:
// iv (12 bytes) + authTag (16 bytes) + ciphertext, so it stores as one string.
const encryptJson = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
};

const decryptJson = (payload) => {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8"));
};

module.exports = { encryptJson, decryptJson };
