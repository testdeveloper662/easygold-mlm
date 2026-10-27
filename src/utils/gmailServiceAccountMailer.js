const fs = require("fs");
const { JWT } = require("google-auth-library");
const MailComposer = require("nodemailer/lib/mail-composer");

// goldsilberstore.com's Gmail sending (Chris, Oct 2026): a service account
// with domain-wide delegation, not an OAuth client — no consent step, no
// refresh token to expire or be revoked. We authenticate AS the impersonated
// mailbox (support@) but every message's From header must be the verified
// "send mail as" alias (no-reply@) — Gmail rewrites any other From to
// support@, per Chris's explicit instruction.
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const IMPERSONATED_USER = '"GoldSilberStore" <support@goldsilberstore.com>';
const SYSTEM_FROM = '"GoldSilberStore" <no-reply@goldsilberstore.com>';

let cachedClient = null;
let cachedToken = null;
let cachedTokenExpiresAt = 0;

const getJwtClient = () => {
    if (cachedClient) return cachedClient;

    const keyPath = process.env.GMAIL_SERVICE_ACCOUNT_KEY_PATH;
    if (!keyPath) {
        throw new Error("GMAIL_SERVICE_ACCOUNT_KEY_PATH is not set");
    }
    const key = JSON.parse(fs.readFileSync(keyPath, "utf8"));

    cachedClient = new JWT({
        email: key.client_email,
        key: key.private_key,
        subject: IMPERSONATED_USER,
        scopes: [GMAIL_SEND_SCOPE],
    });
    return cachedClient;
};

// Access tokens last 60 minutes (per Chris's README) — cached with a 2
// minute safety margin instead of re-minting one on every single email.
const getAccessToken = async () => {
    if (cachedToken && Date.now() < cachedTokenExpiresAt - 120000) {
        return cachedToken;
    }
    const client = getJwtClient();
    const tokens = await client.authorize();
    cachedToken = tokens.access_token;
    cachedTokenExpiresAt = tokens.expiry_date || Date.now() + 55 * 60000;
    return cachedToken;
};

const buildRawMessage = (mailOptions) =>
    new Promise((resolve, reject) => {
        new MailComposer(mailOptions).compile().build((err, message) => {
            if (err) return reject(err);
            resolve(message);
        });
    });

// mailOptions matches SendEmailHelper's own shape (to, subject, html,
// attachments, cc) — `from` is intentionally ignored and always forced to
// SYSTEM_FROM, since Chris confirmed any other From address gets silently
// rewritten to support@ by Gmail anyway.
const sendViaGmailServiceAccount = async (mailOptions) => {
    const accessToken = await getAccessToken();

    const raw = await buildRawMessage({ ...mailOptions, from: SYSTEM_FROM });
    const rawBase64Url = raw.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: rawBase64Url }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(`Gmail API send failed (${response.status}): ${JSON.stringify(body)}`);
    }
    return body;
};

module.exports = { sendViaGmailServiceAccount, SYSTEM_FROM };
