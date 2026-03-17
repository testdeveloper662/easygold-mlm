require("dotenv").config();
const db = require("../../models");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const SendEmailHelper = require("../../utils/sendEmailHelper");

const MAIL_SENDER = process.env.MAIL_SENDER;
const EASY_GOLD_CUSTOMER_SUPPORT_EMAIL = process.env.EASY_GOLD_CUSTOMER_SUPPORT_EMAIL;

const CreateTargetCustomer = async (req, res) => {
  try {
    const { user } = req.user;

    // Get broker details
    const broker = await db.Brokers.findOne({
      where: { user_id: user.ID },
      attributes: ["id", "referral_code"],
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["display_name", "landing_page", "mystorekey", "user_email"]
        }
      ]
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    const brokerMeta = await db.UsersMeta.findAll({
      where: {
        user_id: user.ID,
        meta_key: [
          "u_company",
          "u_street_no",
          "u_street",
          "u_location",
          "u_postcode",
          "u_country",
          "u_phone",
          "language"
        ]
      },
      attributes: ["meta_key", "meta_value"]
    });

    const sanitizeValue = (val) => {
      if (!val) return false;
      const cleaned = String(val).trim();
      const lower = cleaned.toLowerCase();

      // Remove null, undefined, blank, "null", "undefined"
      if (!cleaned || lower === "null" || lower === "undefined") return false;

      return cleaned;
    };

    const metaMap = {};
    brokerMeta.forEach((meta) => {
      metaMap[meta.meta_key] = meta.meta_value || null;
    });

    // Address formatting with removing undefined/empty
    const addressParts = [
      metaMap.u_street_no,
      metaMap.u_street,
      metaMap.u_location,
      metaMap.u_country,
      metaMap.u_postcode
    ].filter(item => item && item !== "undefined" && item !== "null");

    let formattedAddress = addressParts.join(", ");

    const companyInfo = sanitizeValue(metaMap.u_company) ? metaMap.u_company : "";
    const phoneInfo = sanitizeValue(metaMap.u_phone) ? metaMap.u_phone : "";

    if (companyInfo || phoneInfo) {
      formattedAddress += " / " + [companyInfo, phoneInfo].filter(sanitizeValue).join(", ");
    }

    const { customer_name, customer_email, interest_in } = req.body;

    // Validate required fields
    if (!customer_name || !customer_email) {
      return res.status(400).json({
        success: false,
        message: "Customer name and email are required",
      });
    }

    if (broker.user?.landing_page == 0 && interest_in == "Landingpage") {
      return res.status(400).json({
        success: false,
        message: "Your landing page not activate yet, Please activate first on B2B dashboard.",
      });
    }

    // Check if customer email already exists for this broker
    // const existingCustomer = await db.TargetCustomers.findOne({
    //   where: {
    //     broker_id: broker.id,
    //     customer_email: customer_email,
    //   },
    // });

    // if (existingCustomer) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Customer with this email already exists in your target list",
    //   });
    // }

    let existingCustomer;

    switch (interest_in) {
      case "easygold Token":
        // 🌍 Global uniqueness
        existingCustomer = await db.TargetCustomers.findOne({
          where: {
            customer_email,
            interest_in: "easygold Token",
          },
          attributes: ["id", "broker_id"],
        });
        break;

      case "goldflex":
        existingCustomer = await db.TargetCustomers.findOne({
          where: {
            customer_email,
            interest_in: "goldflex",
          },
          attributes: ["id", "broker_id"],
        });
        break;

      case "Primeinvest":
        existingCustomer = await db.TargetCustomers.findOne({
          where: {
            customer_email,
            interest_in: "Primeinvest",
          },
          attributes: ["id", "broker_id"],
        });
        break;

      default:
        // 🧑‍💼 Broker-level uniqueness
        existingCustomer = await db.TargetCustomers.findOne({
          where: {
            broker_id: broker.id,
            customer_email,
            interest_in,
          },
        });
        break;
    }

    if (existingCustomer) {
      let message = "Customer already exists in your target list";

      if (interest_in === "easygold Token" || interest_in === "goldflex") {
        message =
          existingCustomer.broker_id == broker.id
            ? "Customer already registered with this Product"
            : "This customer already connected to other organization";
      }

      return res.status(400).json({
        success: false,
        message,
      });
    }

    // Create target customer
    const targetCustomer = await db.TargetCustomers.create({
      broker_id: broker.id,
      customer_name,
      customer_email,
      referral_code: null,
      interest_in: interest_in || null,
      referred_by_code: broker.referral_code,
      status: "INVITED",
      children_count: 0,
      bonus_points: 0,
      parent_customer_id: null
    });

    let sending_link = "";
    let contract_link = "";

    let brokerLanguage = "en";
    if (metaMap.language == "de-DE") {
      brokerLanguage = "de";
    } else {
      brokerLanguage = "en";
    }

    let easyGoldReferralCode = Buffer.from(String(broker.referral_code), "utf-8").toString("base64");

    if (interest_in === "Landingpage") {
      const registrationUrl = `${process.env.EASY_GOLD_URL}/landingpage/${broker.user?.mystorekey}`;
      sending_link = `<a href="${registrationUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">link</a>`;
      contract_link = `<a href="${registrationUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">here</a>`;
    } else if (interest_in === "easygold Token") {
      const registrationUrl = `${process.env.FRONTEND_URL}/customer-register/${customer_email}/easygold`;
      const sendingUrl = `${process.env.EASY_GOLD_FRONTEND_URL}`;
      sending_link = `<a href="${sendingUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">link</a>`;
      contract_link = `<a href="${registrationUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">here</a>`;
    } else if (interest_in === "Primeinvest") {
      const registrationUrl = `${process.env.FRONTEND_URL}/customer-register/${customer_email}/primeinvest`;
      const sendingUrl = `${process.env.PRIME_INVEST_URL}`;
      sending_link = `<a href="${sendingUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">link</a>`;
      contract_link = `<a href="${registrationUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">here</a>`;
    } else if (interest_in === "goldflex") {
      const registrationUrl = `${process.env.FRONTEND_URL}/customer-register/${customer_email}/goldflex`;
      const sendingUrl = `${process.env.GOLD_FLEX_URL}`;
      sending_link = `<a href="${sendingUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">link</a>`;
      contract_link = `<a href="${registrationUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">here</a>`;
    }

    const brokerCompany = sanitizeValue(metaMap.u_company);
    const brokerName = sanitizeValue(broker.user?.display_name);

    const brokerStreet = [
      sanitizeValue(metaMap.u_street),
      sanitizeValue(metaMap.u_street_no)
    ].filter(Boolean).join(" ");

    const brokerPostalCity = [
      sanitizeValue(metaMap.u_postcode),
      sanitizeValue(metaMap.u_location)
    ].filter(Boolean).join("/");

    const brokerPhone = sanitizeValue(metaMap.u_phone);
    const brokerEmail = sanitizeValue(broker.user?.user_email);

    const b2bInfoFormatted = [
      brokerCompany,
      brokerName,
      brokerStreet,
      brokerPostalCity,
      brokerPhone,
      brokerEmail,
    ]
      .filter(Boolean)
      .map((v, i, arr) => i === arr.length - 1 ? v : `${v},`)
      .join("<br>");

    const templateVariables = {
      b2b_partner: brokerCompany,
      sending_link: sending_link,
      contract_link: contract_link,
      b2b_info: b2bInfoFormatted || "",
    };

    // "de-DE" "en-US"

    let language = "en";

    if (metaMap.language == "de-DE") {
      language = "de";
    } else {
      language = "en";
    }

    let emailData;
    try {
      // Template ID 92 used (adjust as required)
      emailData = await getRenderedEmail(104, language, templateVariables);
    } catch (templateError) {
      console.error(templateError);
      throw new Error(
        "Email template (ID: 92) not found. Please ensure it exists in 6lwup_email_view table."
      );
    }

    let emailLandingPageData;

    if (interest_in === "Landingpage") {
      try {
        // Template ID 92 used (adjust as required)
        emailLandingPageData = await getRenderedEmail(102, language, templateVariables);
      } catch (templateError) {
        console.error(templateError);
        throw new Error(
          "Email template (ID: 92) not found. Please ensure it exists in 6lwup_email_view table."
        );
      }
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

    const senderName = "EasyGold24 Team";
    const senderEmail = EASY_GOLD_CUSTOMER_SUPPORT_EMAIL;

    const dynamicFrom = `"${senderName}" <${senderEmail}>`;

    let finalFrom;

    // if (isAllowedEmail(senderEmail)) {
    // finalFrom = dynamicFrom; // allow Gmail, Yahoo, Outlook, company domain
    // } else {
    finalFrom = EASY_GOLD_CUSTOMER_SUPPORT_EMAIL; // fallback to verified sender domain
    // }

    if (interest_in == "Landingpage") {
      mailOptions = {
        from: finalFrom,
        to: customer_email,
        subject: emailLandingPageData.subject,
        html: emailLandingPageData.htmlContent,
      };
    } else {
      mailOptions = {
        from: finalFrom,
        to: customer_email,
        subject: emailData.subject,
        html: emailData.htmlContent,
      };
    }

    let attachmentPath = null;

    if (interest_in === "Landingpage" && language === "en") {
      attachmentPath = `${process.env.NODE_URL}public/uploads/agreements/landing_page_en.pdf`;
    } else if (interest_in === "Landingpage" && language === "de") {
      attachmentPath = `${process.env.NODE_URL}public/uploads/agreements/landing_page_de.pdf`;
    }

    if (interest_in == "Landingpage") {
      // Send email to customer
      await SendEmailHelper(mailOptions.subject, mailOptions.html, mailOptions.to, attachmentPath, null, finalFrom);
    } else {
      await SendEmailHelper(mailOptions.subject, mailOptions.html, mailOptions.to, attachmentPath, null, finalFrom);
    }

    let address = "";

    if (interest_in == "easygold Token") {
      address = "HARTMANN & BENZ, LLC<br>a District of Columbia limited liability company<br>1717 N Street, NW STE 1<br>Washington, DC 20036<br>www.easygold.io<br>support@easygold.io";
    } else if (interest_in == "Primeinvest") {
      address = "Hartmann & Benz Inc<br>8 The Green, Suite A<br>19901 Dover Kent County<br>United States of America (USA)<br>support@hbprimeinvest.com";
    } else if (interest_in == "goldflex") {
      address = "Service in NGR – U.S. headquarters.<br><br>HARTMANN & BENZ, LLC<br>a District of Columbia limited liability company<br>1717 N Street, NW STE 1<br>Washington, DC 20036<br>www.goldflex.io<br>support @goldflex.io";
    }

    const brokerTemplateVariables = {
      details: address
    };

    let brokerEmailData;
    try {
      // Template ID 92 used (adjust as required)
      brokerEmailData = await getRenderedEmail(105, brokerLanguage, brokerTemplateVariables);
    } catch (templateError) {
      console.error(templateError);
      throw new Error(
        "Email template (ID: 92) not found. Please ensure it exists in 6lwup_email_view table."
      );
    }

    if (interest_in !== "Landingpage" && brokerLanguage === "en") {
      attachmentPath = `${process.env.NODE_URL}public/uploads/agreements/gold_bonus_for_referrals_en.pdf`;
    } else if (interest_in !== "Landingpage" && brokerLanguage === "de") {
      attachmentPath = `${process.env.NODE_URL}public/uploads/agreements/gold_bonus_for_referrals_de.pdf`;
    }

    let beokerMailOptions = {
      from: MAIL_SENDER,
      to: brokerEmail,
      subject: brokerEmailData.subject,
      html: brokerEmailData.htmlContent,
    };

    if (interest_in !== "Landingpage") {
      await SendEmailHelper(beokerMailOptions.subject, beokerMailOptions.html, beokerMailOptions.to, attachmentPath);
    }

    return res.status(201).json({
      success: true,
      message: "Target customer created successfully",
      data: targetCustomer,
    });
  } catch (error) {
    console.error("Error creating target customer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = CreateTargetCustomer;
