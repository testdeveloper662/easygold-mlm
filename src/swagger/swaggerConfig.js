const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Import modular path specifications
const authDocs = require("./docs/auth.swagger");
const adminDocs = require("./docs/admin.swagger");
const brokerDocs = require("./docs/broker.swagger");
const userDocs = require("./docs/user.swagger");
const externalDocs = require("./docs/external.swagger");
const uploadDocs = require("./docs/upload.swagger");

// Combine all pre-defined paths
const combinedPaths = {
  ...authDocs,
  ...brokerDocs,
  ...adminDocs,
  ...userDocs,
  ...externalDocs,
  ...uploadDocs,
};

const port = process.env.PORT || 4000;

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "EasyGold MLM Backend API",
    version: "1.0.0",
    // description: `
    // ### EasyGold Multi-Level Marketing (MLM) Platform Backend API
    //
    // This interactive documentation covers all backend REST endpoints for the EasyGold MLM platform.
    //
    // #### Key Modules:
    // - **Auth**: User/Broker/Affiliate authentication, registration, password recovery, OTP validation, and referral validation.
    // - **Admin**: System management for brokers, affiliates, multi-tier fixed/variable commission rules, contracts, and marketing assets.
    // - **Broker**: Downline network hierarchy, real-time dashboard analytics, customer referrals, bank payouts, and marketing tools.
    // - **User & Orders**: Order processing, MLM commission calculation/distribution engine, and IP geo-lookup.
    // - **External APIs**: Integration endpoints for third-party dashboards (GoldFlex, EasyGold Token, PrimeInvest) to synchronize commissions, balance, bank details, and payouts.
    // - **Upload**: File & media upload pipelines.
    //
    // #### Authentication:
    // Protected endpoints require a JWT Bearer token. Use the **Authorize** button below with your token from `POST /api/v1/auth/login`.
    // Format: `<your_jwt_token>` (or `Bearer <your_jwt_token>`).
    //     `,
    // contact: {
    //   name: "EasyGold Technical Support",
    //   email: "support@easygold.ch",
    // },
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: "Current Local Server",
    },
    {
      url: "/",
      description: "Relative (Current Host)",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication, Registration & Referral Verification" },
    { name: "Admin - Brokers & Affiliates", description: "Broker & Affiliate approval, status, and network contracts" },
    { name: "Admin - Commissions", description: "Fixed/variable commissions, manual adjustments, and payout confirmation" },
    { name: "Admin - Customers", description: "Lead management and referral log status" },
    { name: "Admin - Contracts & Terms", description: "Contract agreements, legal terms & PDF documents" },
    { name: "Admin - Marketing", description: "Admin marketing materials (banners, videos, PDFs)" },
    { name: "Broker - Profile & Network", description: "Downline network, upline hierarchy, and profile branding" },
    { name: "Broker - Commissions & Payouts", description: "Commissions logs, bank account info, and payout withdrawals" },
    { name: "Broker - Target Customers", description: "Target customer lead generation, contracts, and tracking" },
    { name: "Broker - Marketing & Invitations", description: "Affiliate banners, invitations, and assets" },
    { name: "User & Orders", description: "Order capture engine, preview calculator, and location services" },
    { name: "External APIs", description: "External partner & customer dashboard endpoints" },
    { name: "Upload", description: "Media and document upload endpoints" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token obtained from /api/v1/auth/login",
      },
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Request completed successfully" },
          data: { type: "object", description: "Endpoint-specific payload" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Something went wrong" },
        },
      },
      // Field set verified against an actual /auth/login response, not guessed.
      User: {
        type: "object",
        properties: {
          ID: { type: "integer", example: 43416 },
          user_login: { type: "string", example: "broker18@yopmail.com" },
          user_nicename: { type: "string", example: "broker18@yopmail.com" },
          user_email: { type: "string", format: "email", example: "broker18@yopmail.com" },
          user_url: { type: "string", example: "" },
          user_registered: { type: "string", format: "date-time" },
          user_activation_key: { type: "string", example: "" },
          user_status: { type: "integer", example: 0, description: "0: Active, 1: Inactive, 2: Review" },
          display_name: { type: "string", example: "broker18" },
          user_type: { type: "integer", example: 0 },
          wallet_amount: { type: "number", format: "float", example: 125.5 },
          wallet_payment: { type: "integer", example: 0 },
          logo: { type: "string", nullable: true, example: "http://localhost:4000/uploads/logo/1779099635240.jpeg" },
          menulogo: { type: "string", nullable: true },
          commission_percentage: { type: "number", example: 10 },
          api_commission_percentage: { type: "number", example: 10 },
          shipping_costs_setting: { type: "number", example: 0 },
          temp_pass: { type: "string", nullable: true },
          mystorekey: { type: "string", nullable: true, example: "broker123" },
          self_service: { type: "integer", example: 1 },
          landing_page: { type: "boolean", example: true },
          deleted_at: { type: "string", nullable: true },
          role_id: { type: "integer", example: 2 },
          role: { type: "string", example: "BROKER", description: "e.g. BROKER, AFFILIATE, ADMIN" },
          referral_code: { type: "string", nullable: true, example: "BIXBC8" },
          broker_id: { type: "integer", nullable: true, example: 130 },
          profile_image: { type: "string", example: "http://localhost:4000/public/default/default_org.png" },
          landing_pageurl: { type: "string", nullable: true },
          goldbuying_page: { type: "string", nullable: true },
          silverpurchase_page: { type: "string", nullable: true },
          platinumpurchase_page: { type: "string", nullable: true },
          palladiumpurchase_page: { type: "string", nullable: true },
          preciousmetalsale_page: { type: "string", nullable: true },
          cointrade_page: { type: "string", nullable: true },
          jewelryappraisal_page: { type: "string", nullable: true },
          consultingexpertise_page: { type: "string", nullable: true },
          previousmetaldealers_page: { type: "string", nullable: true },
          selfservice_page: { type: "string", nullable: true },
          goldflexurl: { type: "string", nullable: true },
          easygoldurl: { type: "string", nullable: true },
          primeinvesturl: { type: "string", nullable: true },
        },
      },
      Broker: {
        type: "object",
        properties: {
          id: { type: "integer", example: 42 },
          user_id: { type: "integer", example: 101 },
          parent_id: { type: "integer", nullable: true, example: 7 },
          referral_code: { type: "string", example: "REF12345" },
          referred_by_code: { type: "string", nullable: true, example: "PARENTREF1" },
          children_count: { type: "integer", example: 3 },
          total_commission_amount: { type: "number", format: "float", example: 1250.5 },
          user: { "$ref": "#/components/schemas/User" },
        },
      },
      Commission: {
        type: "object",
        properties: {
          broker_id: { type: "integer", example: 42 },
          user_id: { type: "integer", example: 101 },
          order_id: { type: "string", example: "5261" },
          order_type: { type: "string", example: "my_store" },
          commission_percent: { type: "number", format: "float", example: 10 },
          commission_amount: { type: "number", format: "float", example: 54.2 },
          is_seller: { type: "boolean", example: true },
          is_payment_done: { type: "boolean", example: false },
          tree: { type: "string", example: "42->7->3" },
          // Enrichment fields the commission-history list endpoints actually add
          // on top of the raw row (verified against getBrokerCommissionHistory.js).
          // seller_username, order_details, is_send_bonus, target_customer_log_id,
          // and is_deleted were trimmed from the response as confirmed-unused
          // anywhere in the frontend (seller_username duplicated user_login).
          seller_name: { type: "string", nullable: true, example: "Jane Seller" },
          user_login: { type: "string", example: "broker_login" },
          diamond_page_source: { type: "string", nullable: true },
          payment_type: { type: "string", nullable: true, example: "wallet" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          currentPage: { type: "integer", example: 1 },
          totalPages: { type: "integer", example: 5 },
          totalItems: { type: "integer", example: 47 },
          itemsPerPage: { type: "integer", example: 10 },
        },
      },

      // ---- Shared primitives (reused across multiple endpoints) ----
      EmailRequest: {
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", format: "email", example: "user@example.com" } },
      },
      OrderIdRequest: {
        type: "object",
        properties: { order_id: { type: "string", example: "5261" } },
      },
      ReferralRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", example: "newbroker@example.com" },
          name: { type: "string", example: "Max Mustermann" },
          phone: { type: "string", example: "+41791234567" },
        },
      },

      // ---- Auth ----
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@easygold.ch" },
          password: { type: "string", format: "password", example: "admin123" },
          referral_code: { type: "string", example: "REF12345" },
        },
      },
      BrokerRegisterVerifyRequest: {
        type: "object",
        required: ["email", "password", "referral_code"],
        properties: {
          email: { type: "string", format: "email", example: "broker@example.com" },
          password: { type: "string", example: "password123" },
          referral_code: { type: "string", example: "REF123" },
        },
      },
      AffiliateRegisterRequest: {
        type: "object",
        required: ["u_fname", "u_lname", "email", "password", "empfehlercode"],
        properties: {
          u_fname: { type: "string", example: "John" },
          u_lname: { type: "string", example: "Doe" },
          email: { type: "string", format: "email", example: "john.doe@example.com" },
          password: { type: "string", example: "Secret123!" },
          u_person_type: { type: "string", example: "affiliate" },
          u_country: { type: "string", example: "Germany" },
          u_vat_no: { type: "string", example: "DE123456789" },
          u_role: { type: "string", example: "AFFILIATE" },
          empfehlercode: { type: "string", example: "PARENTREF1" },
          language: { type: "string", example: "de" },
          veriff_session_id: { type: "string" },
        },
      },
      OtpValidateRequest: {
        type: "object",
        required: ["email", "otp"],
        properties: {
          email: { type: "string", format: "email", example: "user@example.com" },
          otp: { type: "string", example: "123456" },
        },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["token", "newPassword"],
        properties: {
          token: { type: "string", example: "jwt-reset-token-here" },
          newPassword: { type: "string", format: "password", example: "NewSecurePassword123!" },
        },
      },
      PartnerReferralRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", example: "customer@example.com" },
          product: { type: "string", example: "goldflex" },
        },
      },
      PersonType: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          value: { type: "string", example: "business" },
          label_en: { type: "string", example: "Business" },
          label_de: { type: "string", example: "Unternehmen" },
        },
      },

      // ---- Broker ----
      // Field set verified directly against src/controller/auth/brokerRegistration.js
      // (destructuring + the required-fields check), not the originally guessed names.
      BrokerRegisterRequest: {
        type: "object",
        required: [
          "referralCode", "fullName", "company", "contactPerson", "postalCode",
          "city", "country", "email", "phone", "mobile", "username", "password", "idExpiryDate",
        ],
        properties: {
          u_trade_register: { type: "string", format: "binary" },
          u_travel_id: { type: "string", format: "binary" },
          bill_upload: { type: "string", format: "binary" },
          signatureData: { type: "string", format: "binary" },
          veriffId: { type: "string" },
          referralCode: { type: "string", description: "Parent referral code" },
          fullName: { type: "string" },
          company: { type: "string" },
          contactPerson: { type: "string" },
          address: { type: "string" },
          u_street_no: { type: "string" },
          street: { type: "string" },
          postalCode: { type: "string" },
          city: { type: "string" },
          country: { type: "string" },
          vatId: { type: "string" },
          taxNumber: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          mobile: { type: "string" },
          website: { type: "string" },
          username: { type: "string" },
          password: { type: "string" },
          idExpiryDate: { type: "string", format: "date" },
          language: { type: "string" },
          business_activity_check: { type: "string" },
        },
      },
      // {email, lang} — the broker's own self-referral invite.
      // Not the same shape as admin's ReferralRequest below.
      BrokerReferralRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", example: "newbroker@example.com" },
          lang: { type: "string", example: "en" },
        },
      },
      // Field set verified against src/controller/auth/checkExist.js —
      // phone is never read; company/username are.
      CheckExistRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          company: { type: "string" },
          username: { type: "string" },
        },
      },
      CustomerReferralRequest: {
        type: "object",
        properties: {
          customer_email: { type: "string", format: "email" },
          customer_name: { type: "string" },
          product: { type: "string" },
        },
      },
      NudgeReferralRequest: {
        type: "object",
        properties: { broker_id: { type: "integer" } },
      },
      CustomerDetailRequest: {
        type: "object",
        properties: {
          order_id: { type: "string" },
          email: { type: "string" },
        },
      },
      LogoUploadRequest: {
        type: "object",
        properties: { logo: { type: "string", format: "binary" } },
      },
      ProfileImageUploadRequest: {
        type: "object",
        properties: { profile: { type: "string", format: "binary" } },
      },
      AffiliateBannerCreateRequest: {
        type: "object",
        properties: {
          backgroundImage: { type: "string", format: "binary" },
          title: { type: "string" },
          description: { type: "string" },
        },
      },
      AffiliateBannerUpdateRequest: {
        type: "object",
        properties: {
          backgroundImage: { type: "string", format: "binary" },
          title: { type: "string" },
        },
      },
      BrokerBankDetailRequest: {
        type: "object",
        properties: {
          ac_holder_name: { type: "string" },
          iban: { type: "string" },
          bic_swift_code: { type: "string" },
          bank_name: { type: "string" },
          banks: { type: "object" },
        },
      },
      PayoutRequestCreate: {
        type: "object",
        required: ["amount", "payout_for"],
        properties: {
          amount: { type: "number", example: 100.0 },
          // Verified against createBrokerPayoutRequest.js's enum check — uppercase,
          // case-sensitive. "goldflex" (lowercase) is rejected with a 400.
          payout_for: {
            type: "string",
            enum: ["EASYGOLD_TOKEN", "PRIMEINVEST", "GOLDFLEX", "B2B_DASHBOARD"],
            example: "GOLDFLEX",
          },
        },
      },
      TargetCustomerCreateRequest: {
        type: "object",
        required: ["customer_name", "customer_email"],
        properties: {
          customer_name: { type: "string" },
          customer_email: { type: "string", format: "email" },
          telephone: { type: "string" },
          country: { type: "string" },
          interest_in: { type: "string" },
          status: { type: "string" },
        },
      },
      TargetCustomerReferralRequest: {
        type: "object",
        required: ["customer_email", "referral_code"],
        properties: {
          customer_name: { type: "string" },
          customer_email: { type: "string", format: "email" },
          telephone: { type: "string" },
          referral_code: { type: "string" },
          interest_in: { type: "string" },
        },
      },
      TargetCustomerUpdateRequest: {
        type: "object",
        properties: {
          customer_name: { type: "string" },
          telephone: { type: "string" },
          status: { type: "string" },
        },
      },
      TargetCustomerUpdateByEmailRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string" },
          customer_name: { type: "string" },
          telephone: { type: "string" },
        },
      },
      CustomerSignupRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
          referral_code: { type: "string" },
        },
      },
      InvitationRequest: {
        type: "object",
        properties: {
          email: { type: "string" },
          referral_code: { type: "string" },
        },
      },

      // ---- Admin ----
      CommissionTiersUpdateRequest: {
        type: "object",
        properties: { commissions: { type: "array", items: { type: "object" } } },
      },
      // Verified against controller/admin/updateUserStatus.js — there is no
      // userId field; it's user_id OR broker_id OR affiliate_id, and status
      // accepts either the string form or the integer form.
      UpdateUserStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          user_id: { type: "integer", example: 10, description: "One of user_id/broker_id/affiliate_id is required" },
          broker_id: { type: "integer", example: 42 },
          affiliate_id: { type: "integer", example: 7 },
          status: {
            description: "Accepts the string form or the equivalent integer (0/1/2)",
            oneOf: [
              { type: "string", enum: ["activated", "deactivated", "pending"] },
              { type: "integer", enum: [0, 1, 2] },
            ],
            example: "activated",
          },
          lang: { type: "string", example: "en" },
        },
      },
      // Verified against controller/admin/submitManualCommission.js.
      ManualCommissionRequest: {
        type: "object",
        required: ["broker_id", "user_id", "amount", "order_type"],
        properties: {
          broker_id: { type: "integer" },
          user_id: { type: "integer" },
          amount: { type: "number" },
          order_type: { type: "string" },
          order_id: { type: "string", description: "Optional" },
          notes: { type: "string" },
          selected_payment_method: { type: "string" },
          divide_to_whole_tree: { type: "boolean" },
        },
      },
      // Verified against controller/admin/updateBrokerPaymentStatus.js — there
      // is no is_payment_done field in the body; it's always set true server-side.
      UpdatePaymentStatusRequest: {
        type: "object",
        required: ["order_id"],
        properties: {
          order_id: { type: "string" },
          order_type: { type: "string" },
          tree: { type: "string" },
          type: { type: "string", example: "broker" },
        },
      },
      // Verified against controller/admin/sendPaymentConfirmationEmail.js.
      PaymentConfirmationEmailRequest: {
        type: "object",
        required: ["order_id", "tree"],
        properties: {
          order_id: { type: "string" },
          tree: { type: "string" },
        },
      },
      // Verified against controller/admin/sendPaymentDeclineEmail.js.
      PaymentDeclineEmailRequest: {
        type: "object",
        required: ["order_id", "tree"],
        properties: {
          order_id: { type: "string" },
          tree: { type: "string" },
        },
      },
      // Verified against controller/admin/updateBrokerPayoutRequest.js — the id
      // is a query parameter (?id=), not a body field; status is uppercase;
      // field is rejection_reason, not decline_reason.
      PayoutRequestStatusUpdate: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"] },
          amount: { type: "number" },
          rejection_reason: { type: "string" },
        },
      },
      // Verified against controller/admin/getOrderDetails.js and getCustomerDetails.js —
      // both require camelCase orderId + orderType, not order_id.
      OrderDetailByIdRequest: {
        type: "object",
        required: ["orderId", "orderType"],
        properties: {
          orderId: { type: "string", example: "5261" },
          orderType: { type: "string", example: "my_store" },
        },
      },
      ReferralLogStatusUpdateRequest: {
        type: "object",
        properties: { status: { type: "string" } },
      },
      AdminContractUpdateRequest: {
        type: "object",
        properties: {
          english_pdf_file: { type: "string", format: "binary" },
          german_pdf_file: { type: "string", format: "binary" },
          name: { type: "string" },
        },
      },
      TermsCreateRequest: {
        type: "object",
        properties: {
          document_key: { type: "string" },
          english_name: { type: "string" },
          german_name: { type: "string" },
          english_pdf_file: { type: "string", format: "binary" },
          german_pdf_file: { type: "string", format: "binary" },
        },
      },
      TermsUpdateRequest: {
        type: "object",
        properties: {
          english_pdf_file: { type: "string", format: "binary" },
          german_pdf_file: { type: "string", format: "binary" },
        },
      },
      MarketingMaterialCreateRequest: {
        type: "object",
        properties: {
          asset: { type: "string", format: "binary" },
          german_asset: { type: "string", format: "binary" },
          title: { type: "string" },
          type: { type: "string", enum: ["banner", "video", "pdf", "brochure"] },
        },
      },
      MarketingMaterialUpdateRequest: {
        type: "object",
        properties: {
          asset: { type: "string", format: "binary" },
          german_asset: { type: "string", format: "binary" },
          title: { type: "string" },
        },
      },

      // ---- External APIs ----
      ExternalBankDetailRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", example: "user@example.com" },
          ac_holder_name: { type: "string", example: "Max Mustermann" },
          iban: { type: "string", example: "CH9300000000000000000" },
          bic_swift_code: { type: "string", example: "UBSWCHZH" },
          bank_name: { type: "string", example: "UBS Switzerland AG" },
          banks: { type: "object", description: "Structured JSON of sepa, swift, or ach bank profiles" },
        },
      },
      ExternalPayoutRequestCreate: {
        type: "object",
        required: ["email", "amount", "payout_for"],
        properties: {
          email: { type: "string", format: "email", example: "user@example.com" },
          amount: { type: "number", example: 250.0 },
          payout_for: {
            type: "string",
            enum: ["easygold_token", "primeinvest", "goldflex", "b2b_dashboard"],
            example: "goldflex",
          },
        },
      },

      // ---- Upload ----
      ImageUploadRequest: {
        type: "object",
        required: ["upload"],
        properties: {
          upload: { type: "string", format: "binary", description: "Image file to upload" },
        },
      },
      ImageUploadResponse: {
        type: "object",
        properties: {
          uploaded: { type: "integer", example: 1 },
          fileName: { type: "string", example: "1710000000-123456789.png" },
          url: { type: "string", example: "http://localhost:4000/uploads/contracts/1710000000-123456789.png" },
        },
      },

      // ---- User & Orders ----
      CaptureOrderRequest: {
        type: "object",
        required: ["orderId"],
        properties: {
          orderId: { type: "string", example: "ORD-99824" },
          orderType: { type: "string", example: "goldflex" },
          b2bCommissionAmount: { type: "number", example: 150.0 },
          selected_payment_method: { type: "string", example: "bank_transfer" },
          b2bEmail: { type: "string", format: "email", example: "buyer@example.com" },
          b2bName: { type: "string", example: "Max Mustermann" },
          b2bAddress: { type: "string", example: "Musterstrasse 1, 8000 Zurich" },
        },
      },
      CaptureOrderPreviewRequest: {
        type: "object",
        required: ["orderId"],
        properties: {
          orderId: { type: "string", example: "ORD-99824" },
          orderType: { type: "string", example: "goldflex" },
          b2bCommissionAmount: { type: "number", example: 150.0 },
          b2bEmail: { type: "string", format: "email", example: "buyer@example.com" },
        },
      },
      GeoLookupResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          ip: { type: "string", example: "127.0.0.1" },
          country_code: { type: "string", example: "CH" },
          city: { type: "string", example: "Zurich" },
          timezone: { type: "string", example: "Europe/Zurich" },
        },
      },
    },
  },
  paths: combinedPaths,
};

// Also scan routes for any inline JSDoc annotations
const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.js", "./index.js"],
};

const swaggerDocs = swaggerJsdoc(options);

// Our swagger-ui-dist (5.33.3) auto-detects OS/browser dark mode and can
// switch the whole page to a black theme — the reference project's older
// version (5.22.0) doesn't have this feature at all. This is the one thing
// kept, just to force a single, consistent light theme like the reference.
const customJsStr = `
  (function () {
    function forceLight() {
      document.documentElement.classList.remove("dark-mode");
    }
    forceLight();
    new MutationObserver(forceLight).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  })();
`;

// Hide just the logo image in the black topbar — the bar and its text stay,
// only the icon graphic itself is removed.
const customCss = `
  .swagger-ui .topbar .topbar-wrapper img { display: none; }
`;

const swaggerUiOptions = { customJsStr, customCss };

module.exports = {
  swaggerUi,
  swaggerDocs,
  swaggerUiOptions,
};
