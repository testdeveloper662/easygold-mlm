const db = require("../../models");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const SendEmailHelper = require("../../utils/sendEmailHelper");

const MAIL_SENDER = process.env.MAIL_SENDER;

const referNudgeBroker = async (req, res) => {
  try {
    const { email, lang } = req.body;
    const { user } = req.user;

    let language = "en"; // Default to English

    if (lang) {
      const langStr = String(lang).toLowerCase().trim();
      if (langStr === "de-DE" || langStr === "de" || langStr === "german" || langStr === "deutsch") {
        language = "de-DE";
      }
    }
    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access. Only brokers can register new brokers.",
      });
    }

    const userExist = await db.Users.findOne({
      where: { user_email: email },
      raw: true
    });

    const parentBroker = await db.Brokers.findOne({
      where: { user_id: user.ID },
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "display_name", "user_email"],
          include: [
            {
              model: db.UsersMeta,
              as: "user_meta",
              attributes: ["meta_key", "meta_value"],
              where: {
                meta_key: [
                  "u_street_no",
                  "u_street",
                  "u_location",
                  "u_postcode",
                  "u_company",
                  "u_phone"
                ]
              },
              required: false
            }
          ]
        }
      ]
    });

    if (!parentBroker) {
      return res.status(400).json({
        success: false,
        message: "Parent broker record not found.",
      });
    }

    function getMeta(user, key) {
      return user?.user_meta?.find(m => m.meta_key === key)?.meta_value || "";
    }

    const parent_name = parentBroker?.user?.display_name || "";
    const parent_email = parentBroker?.user?.user_email || "";

    const streetNo = getMeta(parentBroker.user, "u_street_no");
    const street = getMeta(parentBroker.user, "u_street");
    const location = getMeta(parentBroker.user, "u_location");
    const postcode = getMeta(parentBroker.user, "u_postcode");
    const company = getMeta(parentBroker.user, "u_company");
    const phone = getMeta(parentBroker.user, "u_phone");

    const brokerStreet = [street, streetNo]
      .filter(v => v && v !== "undefined" && v !== "null")
      .join(" ");

    const brokerPostalCity = [postcode, location]
      .filter(v => v && v !== "undefined" && v !== "null")
      .join("/");

    const b2bInfoFormatted = [
      company,
      parent_name,
      brokerStreet,
      brokerPostalCity,
      phone,
      parent_email,
    ]
      .filter(Boolean)
      .map(v => `${v},`)
      .join("<br>");

    let mailOptions;
    // Template variables to replace placeholders
    const templateVariables = {
      b2b_name: userExist.display_name,
      b2b_info: b2bInfoFormatted || ""
    };

    // Fetch and render email template from database
    let emailData;
    try {
      emailData = await getRenderedEmail(103, language, templateVariables);
    } catch (templateError) {
      throw new Error(
        "Email template not found in database. Please ensure template with id 84 exists in 6lwup_email_view table."
      );
    }

    mailOptions = {
      from: MAIL_SENDER,
      to: email,
      subject: emailData.subject,
      html: emailData.htmlContent,
    };

    await SendEmailHelper(mailOptions.subject, mailOptions.html, mailOptions.to);

    return res.status(200).json({
      success: true,
      message: `Email sent successfully to ${email}`,
    });
  } catch (error) {
    console.error("Error in ReferBroker:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = referNudgeBroker;
