const db = require("../../models");

const UpdateUserStatus = async (req, res) => {
  try {
    const { user_id, broker_id, affiliate_id, status } = req.body;

    if (status === undefined) {
      return res.status(400).json({
        success: false,
        message: "status is required",
      });
    }

    let statusVal;
    if (status === "activated" || status === "activate" || status === 0 || status === "0") {
      statusVal = 0;
    } else if (status === "deactivated" || status === "deactivate" || status === 1 || status === "1") {
      statusVal = 1;
    } else if (status === "pending" || status === 2 || status === "2") {
      statusVal = 2;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Must be 0 (activated), 1 (deactivated), or 2 (pending)",
      });
    }

    let targetUserId = user_id;

    if (!targetUserId && broker_id) {
      const broker = await db.Brokers.findOne({ where: { id: broker_id } });
      if (broker) {
        targetUserId = broker.user_id;
      }
    }

    if (!targetUserId && affiliate_id) {
      if (db.Affiliates) {
        const affiliate = await db.Affiliates.findOne({ where: { id: affiliate_id } });
        if (affiliate) {
          targetUserId = affiliate.user_id;
        }
      }
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Could not find a valid user_id to update status",
      });
    }

    const userRecord = await db.Users.findByPk(targetUserId);
    if (!userRecord) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const previousStatus = userRecord.user_status;
    await userRecord.update({ user_status: statusVal });

    // Send email notification based on status change and user language
    try {
      const SendEmailHelper = require("../../utils/sendEmailHelper");
      const { lang } = req.body;
      let userLang = "en";
      if (lang) {
        const langStr = String(lang).toLowerCase().trim();
        if (langStr === "de" || langStr === "german" || langStr === "deutsch") {
          userLang = "de";
        }
      }

      const userName = userRecord.display_name || userRecord.user_email?.split("@")[0] || "Affiliate";
      const userEmail = userRecord.user_email;

      if (statusVal === 0) {
        // Activation Email
        let subject = "";
        let htmlContent = "";

        if (userLang === "de") {
          subject = "Registrierung erfolgreich eingegangen";
          htmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <p>Hallo ${userName},</p>
              <p>vielen Dank für Ihre Registrierung – wir freuen uns, Sie als neuen Partner begrüßen zu dürfen.</p>
              <p>Wir gleichen nun kurz Ihre Daten ab und schalten Ihren Zugang in Kürze frei.</p>
              <p>Sollten Unterlagen oder Informationen fehlen, können Sie diese gerne nachreichen.</p>
              <p>Vielen Dank für Ihre Geduld.</p>
              <p>Beste Grüße<br/>Ihr easygold24-Team</p>
            </div>
          `;
        } else {
          subject = "Registration successfully received";
          htmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <p>Hello ${userName},</p>
              <p>Thank you for registering—we are delighted to welcome you as a new partner.</p>
              <p>We will now briefly check your details and activate your account shortly.</p>
              <p>If any documents or information are missing, please feel free to submit them later.</p>
              <p>Thank you for your patience.</p>
              <p>Best regards,<br/>Your easygold24 team</p>
            </div>
          `;
        }

        if (userEmail) {
          await SendEmailHelper(subject, htmlContent, userEmail);
        }
      } else if (statusVal === 1) {
        // Deactivation / Rejection Email
        let subject = "";
        let htmlContent = "";

        if (userLang === "de") {
          subject = "Ihr Affiliate-Zugang ist vorerst gesperrt";
          htmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <p>Lieber Affiliate,</p>
              <p>wir haben Ihre Daten geprüft und bedauern, dass wir Ihr Konto derzeit nicht freischalten können.</p>
              <p>Dies kann verschiedene Gründe haben, zum Beispiel fehlende Unterlagen oder eine unvollständige Verifizierung.</p>
              <p>Wir werden uns erneut bei Ihnen melden und gegebenenfalls weitere Dokumente anfordern.</p>
              <p>Vielen Dank für Ihr Verständnis und Ihre Geduld.</p>
              <p>Beste Grüße<br/>Ihr easygold24-Team</p>
            </div>
          `;
        } else {
          subject = "Your affiliate access is currently blocked";
          htmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <p>Dear affiliate,</p>
              <p>We have checked your details and regret that we are unable to activate your account at this time.</p>
              <p>There may be various reasons for this, such as missing documents or incomplete verification.</p>
              <p>We will contact you again and request further documents if necessary.</p>
              <p>Thank you for your understanding and patience.</p>
              <p>Best regards,<br/>Your easygold24 team</p>
            </div>
          `;
        }

        if (userEmail) {
          await SendEmailHelper(subject, htmlContent, userEmail);
        }
      }
    } catch (emailErr) {
      console.error("Error sending status change email to affiliate:", emailErr);
    }

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: {
        user_id: targetUserId,
        user_status: statusVal,
      },
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = UpdateUserStatus;

