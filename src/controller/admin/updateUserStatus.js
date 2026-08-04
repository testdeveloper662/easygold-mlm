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

      const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
      const userName = userRecord.display_name || userRecord.user_email?.split("@")[0] || "Affiliate";
      const userEmail = userRecord.user_email;

      if (statusVal === 0) {
        // Activation Email using DB template ID 136 (Affiliate active email)
        if (userEmail) {
          const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/login`;
          const emailData = await getRenderedEmail(136, userLang, {
            name: userName,
            dashboard_link: dashboardUrl,
          });
          if (emailData && emailData.subject && emailData.htmlContent) {
            await SendEmailHelper(emailData.subject, emailData.htmlContent, userEmail);
          }
        }
      } else if (statusVal === 1) {
        // Deactivation / Rejection Email using DB template ID 135
        if (userEmail) {
          const emailData = await getRenderedEmail(135, userLang, { name: userName });
          if (emailData && emailData.subject && emailData.htmlContent) {
            await SendEmailHelper(emailData.subject, emailData.htmlContent, userEmail);
          }
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

