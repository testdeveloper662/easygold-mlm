const db = require("../models");

// Two emails that were hardcoded directly in JS (forgotPassword.js's reset
// link, and the Kontor broker-invitation "set your password" link) — moved
// into 6lwup_email_view like every other email in the app, so wording can be
// edited from the table instead of requiring a code change + deploy.
//
// IDs are computed as MAX(id)+1, MAX(id)+2 at migration-run time rather than
// hardcoded, since this runs against whichever DB db:deploy targets (and
// that is NOT guaranteed to be the same DB this was drafted against).

const RESET_PASSWORD_SUBJECT_EN = "Password Reset Request";
const RESET_PASSWORD_SUBJECT_DE = "Anfrage zum Zurücksetzen des Passworts";
const RESET_PASSWORD_CONTENT_EN = `<p>Dear Partner,</p>

<p>You requested a password reset for your account.</p>

<p>Please click on the following link to set a new password:</p>

<p>[reset_link]</p>

<p>This link is valid for 15 minutes.</p>

<p>If you did not request this, please ignore this email.</p>

<p>Best regards,<br />
Your Hartmann &amp; Benz Group Team</p>`;
const RESET_PASSWORD_CONTENT_DE = `<p>Sehr geehrter Partner,</p>

<p>Sie haben eine Anfrage zum Zurücksetzen des Passworts für Ihr Konto gestellt.</p>

<p>Bitte klicken Sie auf den folgenden Link, um ein neues Passwort festzulegen:</p>

<p>[reset_link]</p>

<p>Dieser Link ist 15 Minuten gültig.</p>

<p>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie bitte diese E-Mail.</p>

<p>Mit freundlichen Grüßen,<br />
Ihr Team der Hartmann &amp; Benz Gruppe</p>`;

const KONTOR_INVITE_SUBJECT_EN = "Welcome to EasyGold MLM — Set Your Password";
const KONTOR_INVITE_SUBJECT_DE = "Willkommen bei EasyGold MLM — Legen Sie Ihr Passwort fest";
const KONTOR_INVITE_CONTENT_EN = `<p>Dear [name],</p>

<p>Your broker account has been created via Kontor.</p>

<p>Please click on the following link to set your password and access your dashboard:</p>

<p>[set_password_link]</p>

<p>This link is valid for 7 days.</p>

<p>Best regards,<br />
Your Hartmann &amp; Benz Group Team</p>`;
const KONTOR_INVITE_CONTENT_DE = `<p>Sehr geehrte(r) [name],</p>

<p>Ihr Broker-Konto wurde über Kontor erstellt.</p>

<p>Bitte klicken Sie auf den folgenden Link, um Ihr Passwort festzulegen und auf Ihr Dashboard zuzugreifen:</p>

<p>[set_password_link]</p>

<p>Dieser Link ist 7 Tage gültig.</p>

<p>Mit freundlichen Grüßen,<br />
Ihr Team der Hartmann &amp; Benz Gruppe</p>`;

async function seedPasswordEmailTemplates() {
  try {
    const insertIfMissing = async (subjectEnglish, subjectGerman, contentEnglish, contentGerman) => {
      const [existing] = await db.sequelize.query(
        "SELECT id FROM `6lwup_email_view` WHERE subject_english = :subjectEnglish LIMIT 1",
        { replacements: { subjectEnglish } }
      );
      if (existing.length > 0) {
        console.log(`[SeedPasswordEmailTemplates] "${subjectEnglish}" already exists at id ${existing[0].id} — skipping.`);
        return existing[0].id;
      }

      const [[{ maxId }]] = await db.sequelize.query("SELECT MAX(id) AS maxId FROM `6lwup_email_view`");
      const nextId = (maxId || 0) + 1;

      await db.sequelize.query(
        "INSERT INTO `6lwup_email_view` (id, subject_english, subject_german, content_english, content_german) VALUES (:id, :subjectEnglish, :subjectGerman, :contentEnglish, :contentGerman)",
        { replacements: { id: nextId, subjectEnglish, subjectGerman, contentEnglish, contentGerman } }
      );
      console.log(`[SeedPasswordEmailTemplates] Inserted "${subjectEnglish}" at id ${nextId}.`);
      return nextId;
    };

    const resetPasswordId = await insertIfMissing(
      RESET_PASSWORD_SUBJECT_EN,
      RESET_PASSWORD_SUBJECT_DE,
      RESET_PASSWORD_CONTENT_EN,
      RESET_PASSWORD_CONTENT_DE
    );
    const kontorInviteId = await insertIfMissing(
      KONTOR_INVITE_SUBJECT_EN,
      KONTOR_INVITE_SUBJECT_DE,
      KONTOR_INVITE_CONTENT_EN,
      KONTOR_INVITE_CONTENT_DE
    );

    console.log(`[SeedPasswordEmailTemplates] reset-password template id: ${resetPasswordId}, Kontor invite template id: ${kontorInviteId}`);
  } catch (error) {
    console.error("[SeedPasswordEmailTemplates] Error:", error);
    throw error;
  }
}

module.exports = seedPasswordEmailTemplates;
