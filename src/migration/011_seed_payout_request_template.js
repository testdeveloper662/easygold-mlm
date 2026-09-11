const db = require("../models");

async function seedPayoutRequestEmailTemplate() {
  try {
    const templates = [
      {
        subject_english: "New Payout Request Received",
        subject_german: "Neue Auszahlungsanfrage eingegangen",
        content_english: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Dear Admin,</p>
  <p>A new payout request has been submitted and requires your review and approval.</p>
  <p>A {broker_or_affiliate} has requested a payout of {amount} on {request_date}. Please review the request and verify the relevant details before processing the payout through the admin panel.</p>
  <p><strong>Payout Details</strong></p>
  <p>
    Payout Amount: {amount}<br/>
    Request Date: {request_date}
  </p>
  <p><strong>{Broker_or_Affiliate} Details</strong></p>
  <p>
    Type: {broker_or_affiliate}<br/>
    Name: {name}<br/>
    Email: {email}<br/>
    Phone: {phone}<br/>
    Address: {full_address}<br/>
    User ID: {account_id}
  </p>
  <p>
    Please log in to the admin panel to review and manage this payout request.<br/>
    Thank you.<br/>
    Kind regards,<br/>
    EasyGold
  </p>
</div>`,
        content_german: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Sehr geehrter Administrator,</p>
  <p>es wurde eine neue Auszahlungsanfrage eingereicht, die Ihre Prüfung und Genehmigung erfordert.</p>
  <p>Ein {broker_or_affiliate} hat am {request_date} eine Auszahlung in Höhe von {amount} beantragt. Bitte prüfen Sie die Anfrage und verifizieren Sie die entsprechenden Angaben, bevor Sie die Auszahlung über das Admin-Panel veranlassen.</p>
  <p><strong>Auszahlungsdetails</strong></p>
  <p>
    Auszahlungsbetrag: {amount}<br/>
    Antragsdatum: {request_date}
  </p>
  <p><strong>Details zu {Broker_or_Affiliate}</strong></p>
  <p>
    Typ: {broker_or_affiliate}<br/>
    Name: {name}<br/>
    E-Mail: {email}<br/>
    Telefon: {phone}<br/>
    Adresse: {full_address}<br/>
    Benutzer-ID: {account_id}
  </p>
  <p>
    Bitte melden Sie sich im Admin-Panel an, um diese Auszahlungsanfrage zu prüfen und zu verwalten.<br/>
    Vielen Dank.<br/>
    Mit freundlichen Grüßen<br/>
    EasyGold
  </p>
</div>`,
      },
      {
        subject_english: "Payout Request Approved",
        subject_german: "Auszahlungsanfrage genehmigt",
        content_english: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Dear {broker_or_affiliate},</p>
  <p>We are pleased to inform you that your payout request has been approved by the EasyGold admin team.</p>
  <p>The requested payout amount of {amount} was submitted on {request_date} and approved on {approval_date}. The payout request is now marked as Approved and will be processed according to the applicable payment process.</p>
  <p><strong>Payout Details</strong></p>
  <p>
    Payout Amount: {amount}<br/>
    Request Date: {request_date}<br/>
    Approval Date: {approval_date}<br/>
    Status: Approved
  </p>
  <p>If you have any questions regarding your payout, please contact the EasyGold support team.</p>
  <p>
    Thank you.<br/>
    Kind regards,<br/>
    EasyGold
  </p>
</div>`,
        content_german: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Sehr geehrte(r) {broker_or_affiliate},</p>
  <p>wir freuen uns, Ihnen mitteilen zu können, dass Ihre Auszahlungsanfrage vom EasyGold-Admin-Team genehmigt wurde.</p>
  <p>Der beantragte Auszahlungsbetrag von {amount} wurde am {request_date} eingereicht und am {approval_date} genehmigt. Die Auszahlungsanfrage ist nun als Genehmigt markiert und wird gemäß dem geltenden Zahlungsverfahren bearbeitet.</p>
  <p><strong>Auszahlungsdetails</strong></p>
  <p>
    Auszahlungsbetrag: {amount}<br/>
    Antragsdatum: {request_date}<br/>
    Genehmigungsdatum: {approval_date}<br/>
    Status: Genehmigt
  </p>
  <p>Wenn Sie Fragen zu Ihrer Auszahlung haben, wenden Sie sich bitte an das EasyGold-Support-Team.</p>
  <p>
    Vielen Dank.<br/>
    Mit freundlichen Grüßen<br/>
    EasyGold
  </p>
</div>`,
      },
      {
        subject_english: "Payout Request Rejected",
        subject_german: "Auszahlungsanfrage abgelehnt",
        content_english: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Dear {broker_or_affiliate},</p>
  <p>We regret to inform you that your payout request has been rejected following review by the EasyGold admin team.</p>
  <p>The requested payout amount of {amount} was submitted on {request_date} and reviewed on {rejection_date}. The payout request is currently marked as Rejected.</p>
  <p><strong>Rejection Reason:</strong> {rejection_reason}</p>
  <p><strong>Payout Details</strong></p>
  <p>
    Payout Amount: {amount}<br/>
    Request Date: {request_date}<br/>
    Review Date: {rejection_date}<br/>
    Status: Rejected
  </p>
  <p>If you have any questions or believe the request was rejected in error, please contact the EasyGold support team for further assistance.</p>
  <p>
    Thank you.<br/>
    Kind regards,<br/>
    EasyGold
  </p>
</div>`,
        content_german: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Sehr geehrte(r) {broker_or_affiliate},</p>
  <p>wir bedauern, Ihnen mitteilen zu müssen, dass Ihre Auszahlungsanfrage nach Prüfung durch das EasyGold-Admin-Team abgelehnt wurde.</p>
  <p>Der beantragte Auszahlungsbetrag von {amount} wurde am {request_date} eingereicht und am {rejection_date} geprüft. Die Auszahlungsanfrage ist derzeit als Abgelehnt markiert.</p>
  <p><strong>Ablehnungsgrund:</strong> {rejection_reason}</p>
  <p><strong>Auszahlungsdetails</strong></p>
  <p>
    Auszahlungsbetrag: {amount}<br/>
    Antragsdatum: {request_date}<br/>
    Prüfdatum: {rejection_date}<br/>
    Status: Abgelehnt
  </p>
  <p>Wenn Sie Fragen haben oder glauben, dass die Anfrage irrtümlich abgelehnt wurde, wenden Sie sich bitte an das EasyGold-Support-Team.</p>
  <p>
    Vielen Dank.<br/>
    Mit freundlichen Grüßen<br/>
    EasyGold
  </p>
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

    console.log(`✅ Successfully seeded/updated payout request email templates (137, 138, 139) in 6lwup_email_view!`);
  } catch (error) {
    console.error("❌ Error seeding payout request email templates:", error);
  }
}

module.exports = seedPayoutRequestEmailTemplate;
