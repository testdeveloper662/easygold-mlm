const db = require("../../models");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const SendEmailHelper = require("../../utils/sendEmailHelper");

const MAIL_SENDER = process.env.MAIL_SENDER;
const ADMIN_REFERRAL_CODE = process.env.ADMIN_REFERRAL_CODE;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";

const RegisterAffiliate = async (req, res) => {
  try {
    const { affiliateName, email, lang } = req.body;

    let language = "en";
    if (lang) {
      const langStr = String(lang).toLowerCase().trim();
      if (langStr === "de" || langStr === "german" || langStr === "deutsch") {
        language = "de";
      }
    }

    const existingUser = await db.Users.findOne({ where: { user_email: email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    const registerUrl = `${FRONTEND_URL}/affiliate-register?referral=${ADMIN_REFERRAL_CODE || "ADMIN"}`;
    const linkText = language === "de" ? "Jetzt als Affiliate registrieren" : "Register now as an affiliate";

    const templateVariables = {
      email: email,
      referral_code: ADMIN_REFERRAL_CODE || "ADMIN",
      referal_code_link: `<a href="${registerUrl}" style="color: #7c3aed; text-decoration: none; font-weight: bold;">${linkText}</a>`,
      brokerName: affiliateName || email.split("@")[0],
    };

    let emailData;
    try {
      emailData = await getRenderedEmail(84, language, templateVariables);
    } catch (err) {
      emailData = {
        subject: language === "de" ? "Affiliate Registrierung" : "Affiliate Registration",
        htmlContent: `<p>Hello ${affiliateName || email},</p><p>You have been invited to register as an affiliate. <a href="${registerUrl}">Click here to register</a> using referral code: ${ADMIN_REFERRAL_CODE || "ADMIN"}</p>`,
      };
    }

    if (MAIL_SENDER) {
      await SendEmailHelper(emailData.subject, emailData.htmlContent, email);
    }

    // Save invitation record in db.AffiliateInvitations
    try {
      const senderUserId = req.user?.user?.ID || req.user?.ID || req.user?.id;
      let brokerId = senderUserId || null;

      if (senderUserId) {
        const broker = await db.Brokers.findOne({ where: { user_id: senderUserId } });
        if (broker) {
          brokerId = broker.id;
        } else if (db.Affiliates) {
          const aff = await db.Affiliates.findOne({ where: { user_id: senderUserId } });
          if (aff) brokerId = aff.id;
        }
      }

      if (db.AffiliateInvitations) {
        // Check if an invitation record already exists for this email
        const existingInv = await db.AffiliateInvitations.findOne({ where: { email } });
        if (existingInv) {
          await existingInv.update({
            last_invitation_sent: new Date(),
          });
        } else {
          await db.AffiliateInvitations.create({
            email: email,
            invitation_status: "SENT",
            invited_by: brokerId,
            last_invitation_sent: new Date(),
          });
        }
      }
    } catch (invErr) {
      console.error("Error creating AffiliateInvitations record:", invErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Affiliate registration invitation email sent successfully.",
      data: { registerUrl },
    });
  } catch (error) {
    console.error("Error in RegisterAffiliate:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = RegisterAffiliate;
