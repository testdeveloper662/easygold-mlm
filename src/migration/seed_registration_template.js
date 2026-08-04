const db = require("../models");

async function seedRegistrationEmailTemplate() {
  try {
    const templates = [
      {
        id: 134,
        subject_english: "Registration successfully received",
        subject_german: "Registrierung erfolgreich eingegangen",
        content_english: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Hello [name],</p>
  <p>Thank you for registering—we are delighted to welcome you as a new partner.</p>
  <p>We will now briefly check your details and activate your account shortly.</p>
  <p>If any documents or information are missing, please feel free to submit them later.</p>
  <p>Thank you for your patience.</p>
  <p>Best regards,<br/>Your easygold24 team</p>
</div>`,
        content_german: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Hallo [name],</p>
  <p>vielen Dank für Ihre Registrierung – wir freuen uns, Sie als neuen Partner begrüßen zu dürfen.</p>
  <p>Wir gleichen nun kurz Ihre Daten ab und schalten Ihren Zugang in Kürze frei.</p>
  <p>Sollten Unterlagen oder Informationen fehlen, können Sie diese gerne nachreichen.</p>
  <p>Vielen Dank für Ihre Geduld.</p>
  <p>Beste Grüße<br/>Ihr easygold24-Team</p>
</div>`,
      },
      {
        id: 135,
        subject_english: "Your affiliate access is currently blocked",
        subject_german: "Ihr Affiliate-Zugang ist vorerst gesperrt",
        content_english: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Dear [name],</p>
  <p>We have checked your details and regret that we are unable to activate your account at this time.</p>
  <p>There may be various reasons for this, such as missing documents or incomplete verification.</p>
  <p>We will contact you again and request further documents if necessary.</p>
  <p>Thank you for your understanding and patience.</p>
  <p>Best regards,<br/>Your easygold24 team</p>
</div>`,
        content_german: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Hallo [name],</p>
  <p>wir haben Ihre Daten geprüft und bedauern, dass wir Ihr Konto derzeit nicht freischalten können.</p>
  <p>Dies kann verschiedene Gründe haben, zum Beispiel fehlende Unterlagen oder eine unvollständige Verifizierung.</p>
  <p>Wir werden uns erneut bei Ihnen melden und gegebenenfalls weitere Dokumente anfordern.</p>
  <p>Vielen Dank für Ihr Verständnis und Ihre Geduld.</p>
  <p>Beste Grüße<br/>Ihr easygold24-Team</p>
</div>`,
      },
      {
        id: 136,
        subject_english: "Your Affiliate dashboard is now active",
        subject_german: "Ihr Affiliate-Dashboard ist jetzt aktiv",
        content_english: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Dear affiliate partners,</p>
  <p>Thank you again for registering.</p>
  <p>We have successfully verified your details and are pleased to inform you that your <a href="[dashboard_link]" style="color: #0066cc; text-decoration: underline; font-weight: bold;">MLM dashboard</a> is now ready for use.</p>
  <p>From now on, you can:</p>
  <ul>
    <li>Configure your own website.</li>
    <li>Market all other products, including EasyGold tokens and PrimeInvest.</li>
    <li>Earn money on every transaction.</li>
    <li>Register an unlimited number of new affiliate partners.</li>
  </ul>
  <p><strong>Please note:</strong><br/>
  Only existing affiliates can register new affiliates—direct registration is not possible. This allows you to retain full control and build your own structure.</p>
  <p>If you have any questions, please feel free to contact us at any time.</p>
  <p>Best regards,<br/>Your easygold24 team</p>
</div>`,
        content_german: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Liebe Affiliate-Partner,</p>
  <p>vielen Dank nochmals für Ihre Anmeldung.</p>
  <p>Wir haben Ihre Daten erfolgreich geprüft und freuen uns, Ihnen mitzuteilen, dass Ihr <a href="[dashboard_link]" style="color: #0066cc; text-decoration: underline; font-weight: bold;">MLM-Dashboard</a> nun einsatzbereit ist.</p>
  <p>Ab sofort können Sie:</p>
  <ul>
    <li>Eigene Webseite konfigurieren.</li>
    <li>Alle weiteren Produkte wie EasyGold-Token und PrimeInvest vermarkten.</li>
    <li>Bei jeder Transaktion mitverdienen.</li>
    <li>Unbegrenzt neue Affiliate-Partner registrieren.</li>
  </ul>
  <p><strong>Bitte beachten Sie:</strong><br/>
  Nur bestehende Affiliates können neue Affiliates anmelden – eine Direktregistrierung ist ausgeschlossen. Dadurch behalten Sie die volle Kontrolle und können Ihre eigene Struktur aufbauen.</p>
  <p>Wenn Sie noch Fragen haben, kontaktieren Sie uns jederzeit gerne.</p>
  <p>Beste Grüße<br/>Ihr easygold24-Team</p>
</div>`,
      },
    ];

    for (const t of templates) {
      await db.sequelize.query(
        `INSERT INTO \`6lwup_email_view\` (\`id\`, \`subject_english\`, \`subject_german\`, \`content_english\`, \`content_german\`) 
         VALUES (:id, :subject_english, :subject_german, :content_english, :content_german) 
         ON DUPLICATE KEY UPDATE 
           \`subject_english\` = VALUES(\`subject_english\`), 
           \`subject_german\` = VALUES(\`subject_german\`), 
           \`content_english\` = VALUES(\`content_english\`), 
           \`content_german\` = VALUES(\`content_german\`)`,
        {
          replacements: t,
        }
      );
    }

    console.log(`✅ Successfully seeded/updated registration and deactivation email templates in 6lwup_email_view!`);
  } catch (error) {
    console.error("❌ Error seeding email templates:", error);
  }
}

module.exports = seedRegistrationEmailTemplate;
