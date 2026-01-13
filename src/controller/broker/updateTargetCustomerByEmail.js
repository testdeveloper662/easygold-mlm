const db = require("../../models");
const geoip = require("geoip-lite");
const { generateTargetCustomerPDF } = require("../../utils/targetCustomerPdfHelper");
const { generateImageUrl } = require("../../utils/Helper");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const SendEmailHelper = require("../../utils/sendEmailHelper");

function getMeta(user, key) {
  return user?.user_meta?.find(m => m.meta_key === key)?.meta_value || "";
}

const UpdateTargetCustomerByEmail = async (req, res) => {
  try {
    let ip =
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const geo = geoip.lookup(ip);

    const { customer_name, customer_email, product_type, telephone, tax_id, u_street_no, u_street, city, state, postalCode, country, signature_data, consent_at } = req.body;

    let interest_in;
    if (product_type == "easygold") {
      interest_in = "easygold Token";
    } else if (product_type == "primeinvest") {
      interest_in = "Primeinvest";
    }

    const targetCustomer = await db.TargetCustomers.findOne({
      where: {
        interest_in: interest_in,
        customer_email: customer_email,
      },
    });

    if (!targetCustomer) {
      return res.status(404).json({
        success: false,
        message: "Target customer not found",
      });
    }

    let parentBroker = await db.Brokers.findOne({
      where: { id: targetCustomer.broker_id },
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: [
            "ID",
            "display_name",
            "user_email"
          ],
          include: [
            {
              model: db.UsersMeta,
              as: "user_meta",
              attributes: ["meta_key", "meta_value"],
              where: {
                meta_key: ["u_street_no",
                  "u_street",
                  "u_location",
                  "u_postcode",
                  "signatureData",
                  "language", "u_company"]
              },
              required: false
            }
          ]
        }
      ]
    });

    const parent_name = parentBroker?.user?.display_name;
    const parent_email = parentBroker?.user?.user_email;
    const streetNo = getMeta(parentBroker.user, "u_street_no");
    const street = getMeta(parentBroker.user, "u_street");
    const location = getMeta(parentBroker.user, "u_location");
    const postcode = getMeta(parentBroker.user, "u_postcode");
    const parent_company = getMeta(parentBroker.user, "u_company");
    const parent_language = getMeta(parentBroker.user, "language");
    const parent_city = location;
    const parent_signaturedata = getMeta(parentBroker.user, "signatureData");

    const addressParts = [u_street_no, u_street, city, state, country, postalCode]
      .map(v => v?.toString().trim())                                          // remove spaces
      .filter(v => v && v !== "undefined" && v !== "null");                    // remove bad values

    const formattedAddress = addressParts.join(", ");

    const parts = [
      streetNo,
      street,
      location,
      postcode
    ].filter(
      (item) =>
        item !== null &&
        item !== undefined &&
        item !== "" &&
        item !== "undefined" &&
        item !== "null"
    );

    parent_address = parts.join(", ");

    const date = new Date(consent_at);

    const formatted =
      String(date.getDate()).padStart(2, "0") + "-" +
      String(date.getMonth() + 1).padStart(2, "0") + "-" +
      date.getFullYear();

    let partnerPdfData = {
      broker_signature: `${process.env.PUBLIC_URL}${parent_signaturedata}`,
      broker_name: parent_name,
      broker_company_name: parent_company,
      broker_email: parent_email,
      broker_address: parent_address,
      date: formatted,
      customer_name: customer_name,
      customer_email: customer_email,
      customer_address: formattedAddress,
      customer_telephone: telephone,
      customer_social_security: tax_id,
      customer_signature: signature_data,
      customer_state: state,
      signature: await generateImageUrl("agreements/sign.png", 'agreements'),
      customer_ipaddress: ip,
      product_type: product_type
    };

    let partnerDocsData = await generateTargetCustomerPDF(partnerPdfData);

    let sending_link = "";

    let brokerLanguage = "en";
    if (parent_language == "de-DE") {
      brokerLanguage = "de";
    } else {
      brokerLanguage = "en";
    }

    let easyGoldReferralCode = Buffer.from(String(parentBroker.referral_code), "utf-8").toString("base64");

    if (interest_in === "Landingpage") {
      const registrationUrl = `${process.env.EASY_GOLD_URL}/landingpage/${broker.user?.mystorekey}`;
      sending_link = `<a href="${registrationUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">${registrationUrl}</a>`;
    } else if (interest_in === "easygold Token") {
      const registrationUrl = `${process.env.EASY_GOLD_FRONTEND_URL}/${brokerLanguage}/broker/${easyGoldReferralCode}`;
      sending_link = `<a href="${registrationUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">${registrationUrl}</a>`;
    } else if (interest_in === "Primeinvest") {
      const registrationUrl = `${process.env.PRIME_INVEST_FRONTEND_URL}/${brokerLanguage}/sign-up`;
      sending_link = `<a href="${registrationUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">${registrationUrl}</a>`;
    } else if (interest_in === "goldflex") {
      const registrationUrl = `${process.env.GOLD_FLEX_FRONTEND_URL}/register?ref=${easyGoldReferralCode}`;
      sending_link = `<a href="${registrationUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">${registrationUrl}</a>`;
    }

    const templateVariables = {
      b2b_partner: parentBroker.user?.display_name,
      sending_link: sending_link,
      b2b_info: formattedAddress || "",
    };

    // "de-DE" "en-US"

    let language = "en";

    if (metaMap.language == "de-DE") {
      language = "de";
    } else {
      language = "en";
    }

    let emailData;
    let brokeremailData;
    try {
      // Template ID 92 used (adjust as required)
      emailData = await getRenderedEmail(98, language, templateVariables);
      brokeremailData = await getRenderedEmail(99, language, templateVariables);
    } catch (templateError) {
      console.error(templateError);
      throw new Error(
        "Email template (ID: 92) not found. Please ensure it exists in 6lwup_email_view table."
      );
    }

    const blockedDomains = [
      "yopmail.com",
      "mailinator.com",
      "tempmail.com",
      "10minutemail.com",
      "guerrillamail.com",
      "getnada.com",
      "fakeinbox.com",
      "trashmail.com",
      "moakt.com",
    ];

    const isAllowedEmail = (email) => {
      if (!email) return false;
      const domain = email.split("@")[1]?.toLowerCase();
      return !blockedDomains.includes(domain);
    };

    const senderName = broker.user?.display_name || "Your broker team";
    const senderEmail = broker.user?.user_email;

    const dynamicFrom = `"${senderName}" <${senderEmail}>`;

    let finalFrom;

    if (isAllowedEmail(senderEmail)) {
      finalFrom = dynamicFrom; // allow Gmail, Yahoo, Outlook, company domain
    } else {
      finalFrom = MAIL_SENDER; // fallback to verified sender domain
    }

    mailOptions = {
      from: finalFrom,
      to: customer_email,
      subject: emailData.subject,
      html: emailData.htmlContent,
    };

    brokermailOptions = {
      from: MAIL_SENDER,
      to: parent_email,
      subject: emailData.subject,
      html: emailData.htmlContent,
    };

    let attachmentPath = `${process.env.NODE_URL}/public/uploads/agreements/${partnerDocsData.pdf_doc}`;

    await SendEmailHelper(mailOptions.subject, mailOptions.html, mailOptions.to, attachmentPath, null, finalFrom);

    await SendEmailHelper(brokermailOptions.subject, brokermailOptions.html, brokermailOptions.to, attachmentPath, null, null);

    console.log(partnerDocsData, "partnerDocsData");

    await targetCustomer.update({
      status: "REGISTERED",
      customer_name: customer_name !== undefined ? customer_name : targetCustomer.customer_name,
      address: formattedAddress,
      telephone: telephone,
      tax_id: tax_id,
      consent_at: new Date(consent_at),
      pdf_url: `uploads/agreements/${partnerDocsData.pdf_doc}`
    });

    return res.status(200).json({
      success: true,
      message: "Target customer register successfully",
      data: targetCustomer,
    });
  } catch (error) {
    console.error("Error updating target customer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = UpdateTargetCustomerByEmail;
