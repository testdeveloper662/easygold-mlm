const db = require("../../models");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const { getSellerLanguage } = require("../../utils/getSellerLanguage");
const SendEmailHelper = require("../../utils/sendEmailHelper");

const MAIL_SENDER = process.env.MAIL_SENDER;
const MAIL_PASSWORD = process.env.MAIL_PASSWORD;

// Validate required environment variables
if (!MAIL_SENDER || !MAIL_PASSWORD) {
  console.warn("Warning: MAIL_SENDER or MAIL_PASSWORD not set in environment variables");
}

const SendPaymentConfirmationEmail = async (req, res) => {
  try {
    // 🚨 CRITICAL LOGGING - API HIT CONFIRMATION
    console.log("=".repeat(80));
    console.log("🚨 API HIT: send-payment-confirmation-email");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Payload received:", JSON.stringify(req.body, null, 2));
    console.log("=".repeat(80));

    const { order_id, tree } = req.body;

    // Validate input
    if (!order_id || !tree) {
      console.error("❌ Validation failed: Missing order_id or tree");
      console.log("order_id:", order_id);
      console.log("tree:", tree);
      return res.status(400).json({
        success: false,
        message: "order_id and tree are required",
      });
    }

    console.log("✅ Validation passed");
    console.log("order_id:", order_id);
    console.log("tree:", tree);

    // Validate email configuration
    if (!MAIL_SENDER || !MAIL_PASSWORD) {
      console.error("❌ Email configuration missing!");
      console.log("MAIL_SENDER:", MAIL_SENDER ? "SET" : "NOT SET");
      console.log("MAIL_PASSWORD:", MAIL_PASSWORD ? "SET" : "NOT SET");
      return res.status(500).json({
        success: false,
        message: "Email configuration is missing. Please contact administrator.",
      });
    }

    console.log("✅ Email configuration validated");

    // Fetch all commission entries for this order_id and tree
    console.log("📊 Fetching commission entries from database...");
    const commissionEntries = await db.sequelize.query(
      `
      SELECT
        bch.id,
        bch.order_id,
        bch.order_type,
        bch.order_amount,
        bch.profit_amount,
        bch.broker_id,
        bch.user_id,
        bch.commission_percent,
        bch.commission_amount,
        bch.is_seller,
        bch.is_payment_done,
        bch.tree,
        u.user_email
      FROM broker_commission_histories AS bch
      LEFT JOIN 6LWUP_users AS u ON u.ID = bch.user_id
      WHERE bch.order_id = :order_id AND bch.tree = :tree
    `,
      {
        replacements: { order_id, tree },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    console.log(`✅ Found ${commissionEntries.length} commission entries`);
    console.log("Commission entries:", JSON.stringify(commissionEntries, null, 2));

    if (!commissionEntries || commissionEntries.length === 0) {
      console.error("❌ No commission entries found");
      return res.status(404).json({
        success: false,
        message: "No commission entries found for the given order_id and tree",
      });
    }

    // Separate seller and non-sellers
    const seller = commissionEntries.find((entry) => entry.is_seller === 1);
    const nonSellers = commissionEntries.filter((entry) => entry.is_seller === 0);

    console.log("👤 Seller:", seller ? `broker_id: ${seller.broker_id}, email: ${seller.user_email}` : "NOT FOUND");
    console.log(`📧 Non-sellers (will receive emails): ${nonSellers.length}`);
    nonSellers.forEach((ns, idx) => {
      console.log(`  ${idx + 1}. broker_id: ${ns.broker_id}, email: ${ns.user_email}`);
    });

    if (!seller) {
      console.error("❌ No seller found in commission entries");
      return res.status(404).json({
        success: false,
        message: "No seller found in the commission entries",
      });
    }

    // Check if payment is already marked as done
    if (seller.is_payment_done === 1) {
      console.warn("⚠️ Payment already marked as done");
      return res.status(400).json({
        success: false,
        message: "Payment has already been marked as received for this order",
      });
    }

    console.log("✅ Payment not yet marked - proceeding with email sending");

    // Create transporter with better connection settings
    console.log("📧 Creating email transporter...");
    console.log("✅ Email transporter created with connection pooling");

    // Send emails to all non-sellers
    console.log(`📤 Starting email sending process for ${nonSellers.length} non-sellers...`);
    const emailPromises = [];
    const emailsSent = [];

    for (const broker of nonSellers) {
      console.log(
        `\n📧 Processing broker_id: ${broker.broker_id}, user_id: ${broker.user_id}, email: ${broker.user_email}`
      );

      if (!broker.user_email) {
        console.warn(`⚠️ No email found for broker_id: ${broker.broker_id} - SKIPPING`);
        continue;
      }

      try {
        // Get THIS recipient's language from 6LWUP_usermeta table
        console.log(` Fetching language for recipient user_id: ${broker.user_id}...`);
        const recipientLanguage = await getSellerLanguage(broker.user_id);
        console.log(`Recipient's language: "${recipientLanguage}" (user_id: ${broker.user_id})`);

        // Template variables for email template id=85
        const templateVariables = {
          order_id: broker.order_id,
          email: broker.user_email,
          commission_percent: broker.commission_percent,
          commission_amount: broker.commission_amount.toFixed(2),
          order_amount: broker.order_amount.toFixed(2),
          profit_amount: broker.profit_amount.toFixed(2),
          tree: broker.tree,
        };

        console.log("📝 Template variables:", JSON.stringify(templateVariables, null, 2));

        // Fetch and render email template in RECIPIENT'S language (template id = 85)
        console.log(` Fetching email template id=85 in "${recipientLanguage}" language...`);
        const emailData = await getRenderedEmail(85, recipientLanguage, templateVariables);
        console.log("Email template fetched and rendered");
        console.log("Subject:", emailData.subject);

        const mailOptions = {
          from: MAIL_SENDER,
          to: broker.user_email,
          subject: emailData.subject,
          html: emailData.htmlContent,
        };

        console.log("📨 Preparing to send email to:", broker.user_email);

        // Add to promises array with error handling
        emailPromises.push(
          SendEmailHelper(mailOptions.subject, mailOptions.html, mailOptions.to)
            .then(() => {
              emailsSent.push(broker.user_email);
              console.log(`✅ Email successfully sent to: ${broker.user_email}`);
              return { success: true, email: broker.user_email };
            })
            .catch((sendError) => {
              console.error(`❌ Failed to send email to ${broker.user_email}:`, sendError.message);
              console.error("Error details:", sendError);
              return { success: false, email: broker.user_email, error: sendError.message };
              // transporter
              //   .sendMail(mailOptions)
              //   .then(() => {
              //     emailsSent.push(broker.user_email);
              //     console.log(`✅ Email successfully sent to: ${broker.user_email}`);
              //     return { success: true, email: broker.user_email };
              //   })
              //   .catch((sendError) => {
              //     console.error(`❌ Failed to send email to ${broker.user_email}:`, sendError.message);
              //     console.error("Error details:", sendError);
              //     return { success: false, email: broker.user_email, error: sendError.message };
            })
        );
      } catch (emailError) {
        console.error(`❌ Error preparing email for ${broker.user_email}:`, emailError);
        console.error("Error stack:", emailError.stack);
      }
    }

    console.log(`\n⏳ Waiting for all ${emailPromises.length} emails to be sent...`);

    // Wait for all emails to be sent (with individual error handling)
    const emailResults = await Promise.all(emailPromises);

    // Count successes and failures
    const successCount = emailResults.filter((r) => r && r.success).length;
    const failureCount = emailResults.filter((r) => r && !r.success).length;

    console.log(`✅ Email sending complete: ${successCount} succeeded, ${failureCount} failed`);

    if (failureCount > 0) {
      const failedEmails = emailResults.filter((r) => r && !r.success).map((r) => r.email);
      console.warn(`⚠️ Failed emails:`, failedEmails.join(", "));
    }

    // Update is_payment_done = 1 for ALL entries in this tree (including seller)
    console.log("💾 Updating database: Setting is_payment_done = 1 for all entries in tree...");
    await db.sequelize.query(
      `
      UPDATE broker_commission_histories
      SET is_payment_done = 1
      WHERE order_id = :order_id AND tree = :tree
    `,
      {
        replacements: { order_id, tree },
      }
    );

    console.log(`✅ Database updated successfully for order_id: ${order_id}, tree: ${tree}`);
    console.log("=".repeat(80));
    console.log("🎉 SUCCESS - Payment marked and emails sent!");
    console.log("Total emails sent:", emailsSent.length);
    console.log("Emails sent to:", emailsSent.join(", "));
    console.log("=".repeat(80));

    return res.status(200).json({
      success: true,
      message: "Payment marked successfully. Emails sent to all eligible brokers.",
      data: {
        order_id,
        tree,
        emails_sent: emailsSent,
        total_emails_sent: emailsSent.length,
        total_brokers_in_tree: commissionEntries.length,
      },
    });
  } catch (error) {
    console.error("=".repeat(80));
    console.error("❌ CRITICAL ERROR in SendPaymentConfirmationEmail");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("=".repeat(80));
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = SendPaymentConfirmationEmail;
