module.exports = {
  "/api/v1/broker/register": {
    post: {
      tags: ["Broker - Profile & Network"],
      summary: "Register a new broker with documents and signature",
      description: "Creates a broker registration submission including uploaded trade registry, ID, utility bill, and signature data.",
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": { schema: { "$ref": "#/components/schemas/BrokerRegisterRequest" } },
        },
      },
      responses: {
        200: { description: "Broker registration successful" },
        400: { description: "Validation error or invalid referral" },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/broker/checkexist": {
    post: {
      tags: ["Broker - Profile & Network"],
      summary: "Check if broker email, company, or username already exists",
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/CheckExistRequest" } },
        },
      },
      responses: {
        200: { description: "Check result returned (success:false in body if already taken)" },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/broker/referral": {
    post: {
      tags: ["Broker - Profile & Network"],
      summary: "Invite/refer a new broker",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/BrokerReferralRequest" } },
        },
      },
      responses: {
        200: { description: "Referral email sent" },
        400: {
          description: "Broker already registered, or referral code not found",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        403: {
          description: "No authenticated broker on the request",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/broker/referralcustomer": {
    post: {
      tags: ["Broker - Profile & Network"],
      summary: "Send referral invitation email to customer",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/CustomerReferralRequest" } },
        },
      },
      responses: {
        200: { description: "Referral email sent successfully" },
      },
    },
  },
  "/api/v1/broker/nudgereferral": {
    post: {
      tags: ["Broker - Profile & Network"],
      summary: "Send reminder/nudge to referred broker",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/NudgeReferralRequest" } },
        },
      },
      responses: {
        200: { description: "Nudge email sent" },
      },
    },
  },
  "/api/v1/broker/network": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get current broker's downline network hierarchy",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "viewUserId", in: "query", schema: { type: "string" }, description: "Admin-only: view another user's network" },
        { name: "type", in: "query", schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Network tree with child brokers/affiliates" },
      },
    },
  },
  "/api/v1/broker/network/{broker_id}": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get network hierarchy for specific broker ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "broker_id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Subtree hierarchy" },
      },
    },
  },
  "/api/v1/broker/uplinenetwork/{broker_id}": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get upline parent hierarchy for a broker ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "broker_id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Upline ancestor chain" },
      },
    },
  },
  "/api/v1/broker/referralname": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Lookup broker details by referral code",
      parameters: [{ name: "referral_code", in: "query", schema: { type: "string" }, example: "REF123" }],
      responses: {
        200: {
          description: "Broker referral info",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { "$ref": "#/components/schemas/SuccessResponse" },
                  { type: "object", properties: { data: { "$ref": "#/components/schemas/Broker" } } },
                ],
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/checkvalidvat": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Check and validate VAT number via external VIES",
      description: "Query parameter is vatId, not vatNumber — verified against checkVatnumberValid.js and the frontend.",
      parameters: [{ name: "vatId", in: "query", required: true, schema: { type: "string" }, example: "CHE123456789" }],
      responses: {
        200: { description: "VAT validation response" },
      },
    },
  },
  "/api/v1/broker/commissions/{id}": {
    get: {
      tags: ["Broker - Commissions & Payouts"],
      summary: "Get commission history logs for broker",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        { name: "is_seller", in: "query", schema: { type: "string" } },
        { name: "type", in: "query", schema: { type: "string" }, description: "user_type filter" },
      ],
      responses: {
        200: {
          description: "Commissions list",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { "$ref": "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { "$ref": "#/components/schemas/Commission" } },
                      pagination: { "$ref": "#/components/schemas/Pagination" },
                    },
                  },
                ],
              },
            },
          },
        },
        400: {
          description: "user id is required",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/broker/direct-commissions/{id}": {
    get: {
      tags: ["Broker - Commissions & Payouts"],
      summary: "Get direct commission history for broker",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Direct commission logs",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { "$ref": "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { "$ref": "#/components/schemas/Commission" } },
                      pagination: { "$ref": "#/components/schemas/Pagination" },
                    },
                  },
                ],
              },
            },
          },
        },
        400: {
          description: "user id is required",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/broker/order/detail": {
    post: {
      tags: ["Broker - Commissions & Payouts"],
      summary: "Get order commission detail for broker",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/OrderIdRequest" } },
        },
      },
      responses: {
        200: { description: "Order detail" },
      },
    },
  },
  "/api/v1/broker/customer/detail": {
    post: {
      tags: ["Broker - Target Customers"],
      summary: "Get customer detail by order or email",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/CustomerDetailRequest" } },
        },
      },
      responses: {
        200: { description: "Customer details" },
      },
    },
  },
  "/api/v1/broker/logo-image": {
    post: {
      tags: ["Broker - Profile & Network"],
      summary: "Upload broker logo image",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": { schema: { "$ref": "#/components/schemas/LogoUploadRequest" } },
        },
      },
      responses: {
        200: { description: "Logo uploaded successfully" },
      },
    },
  },
  "/api/v1/broker/profile-image": {
    post: {
      tags: ["Broker - Profile & Network"],
      summary: "Upload broker profile photo",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": { schema: { "$ref": "#/components/schemas/ProfileImageUploadRequest" } },
        },
      },
      responses: {
        200: { description: "Profile photo uploaded successfully" },
      },
    },
  },
  "/api/v1/broker/getbrokerlinks": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get referral links for store, landing page, and products",
      parameters: [{ name: "referral_code", in: "query", schema: { type: "string" } }],
      responses: {
        200: { description: "Generated store & referral URLs" },
      },
    },
  },
  "/api/v1/broker/getuserurls": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get current authenticated broker's custom URLs",
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Broker product URLs" },
      },
    },
  },
  "/api/v1/broker/affiliate-banners": {
    post: {
      tags: ["Broker - Marketing & Invitations"],
      summary: "Create affiliate banner",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "multipart/form-data": { schema: { "$ref": "#/components/schemas/AffiliateBannerCreateRequest" } },
        },
      },
      responses: {
        200: { description: "Banner created" },
      },
    },
    get: {
      tags: ["Broker - Marketing & Invitations"],
      summary: "Get affiliate banners",
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "List of banners" },
      },
    },
  },
  "/api/v1/broker/affiliate-banners/{id}": {
    get: {
      tags: ["Broker - Marketing & Invitations"],
      summary: "Get affiliate banner by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Banner item" } },
    },
    put: {
      tags: ["Broker - Marketing & Invitations"],
      summary: "Update affiliate banner",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "multipart/form-data": { schema: { "$ref": "#/components/schemas/AffiliateBannerUpdateRequest" } },
        },
      },
      responses: { 200: { description: "Banner updated" } },
    },
    delete: {
      tags: ["Broker - Marketing & Invitations"],
      summary: "Delete affiliate banner",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Banner deleted" } },
    },
  },
  "/api/v1/broker/bank/detail": {
    post: {
      tags: ["Broker - Commissions & Payouts"],
      summary: "Add or update broker bank details",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/BrokerBankDetailRequest" } },
        },
      },
      responses: { 200: { description: "Bank details saved" } },
    },
    get: {
      tags: ["Broker - Commissions & Payouts"],
      summary: "Get broker bank details and balance",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "viewUserId", in: "query", schema: { type: "string" }, description: "Admin-only: view another broker's bank details" },
      ],
      responses: {
        200: { description: "Bank details" },
        400: {
          description: "Invalid request",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        404: {
          description: "Broker not found",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/broker/payout/request": {
    post: {
      tags: ["Broker - Commissions & Payouts"],
      summary: "Submit broker payout request",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/PayoutRequestCreate" } },
        },
      },
      responses: {
        200: { description: "Payout request submitted" },
        400: {
          description: "amount/payout_for required or invalid payout_for enum value",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        404: {
          description: "Broker not found",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/broker/payout/requests": {
    get: {
      tags: ["Broker - Commissions & Payouts"],
      summary: "Get broker payout request history",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        { name: "type", in: "query", schema: { type: "string" } },
        { name: "viewUserId", in: "query", schema: { type: "string" }, description: "Admin-only" },
      ],
      responses: {
        200: { description: "List of payout requests" },
        400: {
          description: "Invalid request",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        404: {
          description: "Broker not found",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/broker/target-customers": {
    post: {
      tags: ["Broker - Target Customers"],
      summary: "Create a target customer lead",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/TargetCustomerCreateRequest" } },
        },
      },
      responses: { 200: { description: "Customer created" } },
    },
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get list of broker's target customers",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        { name: "search", in: "query", schema: { type: "string" } },
      ],
      responses: { 200: { description: "Paginated target customers" } },
    },
  },
  "/api/v1/broker/target-customers/referralCustomer": {
    post: {
      tags: ["Broker - Target Customers"],
      summary: "Create referral target customer via shared link",
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/TargetCustomerReferralRequest" } },
        },
      },
      responses: { 200: { description: "Referral lead recorded" } },
    },
  },
  "/api/v1/broker/target-customers-contract": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get customer contracts list for broker",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "List of customer contracts" } },
    },
  },
  "/api/v1/broker/target-customers/getdetails": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get customer details by query params",
      parameters: [
        { name: "email", in: "query", schema: { type: "string" } },
        { name: "product", in: "query", schema: { type: "string" } },
      ],
      responses: { 200: { description: "Target customer details" } },
    },
  },
  "/api/v1/broker/target-customers/stats": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get target customer statistics for broker dashboard",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Target customer metrics" } },
    },
  },
  "/api/v1/broker/target-customers/{id}": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get target customer by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Target customer detail" } },
    },
    put: {
      tags: ["Broker - Target Customers"],
      summary: "Update target customer by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/TargetCustomerUpdateRequest" } },
        },
      },
      responses: { 200: { description: "Target customer updated" } },
    },
    delete: {
      tags: ["Broker - Target Customers"],
      summary: "Delete target customer lead",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Target customer deleted" } },
    },
  },
  "/api/v1/broker/target-customers/updateCustomer": {
    put: {
      tags: ["Broker - Target Customers"],
      summary: "Update target customer by email",
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/TargetCustomerUpdateByEmailRequest" } },
        },
      },
      responses: { 200: { description: "Customer updated" } },
    },
  },
  "/api/v1/broker/brokers": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get list of brokers in network",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "List of brokers" } },
    },
  },
  "/api/v1/broker/brokers-contract": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get broker contracts",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Broker contracts list" } },
    },
  },
  "/api/v1/broker/owncontracts": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get authenticated broker's own agreement contract",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Own contract PDF URLs and info" } },
    },
  },
  "/api/v1/broker/target-customers/signup": {
    post: {
      tags: ["Broker - Target Customers"],
      summary: "Customer signup from EasyGold token page",
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/CustomerSignupRequest" } },
        },
      },
      responses: { 200: { description: "Customer signed up" } },
    },
  },
  "/api/v1/broker/ordercustomer/detail": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get customer details by order ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "order_id", in: "query", schema: { type: "string" } }],
      responses: { 200: { description: "Customer order detail" } },
    },
  },
  "/api/v1/broker/target-customers-logs/investement-logs": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get investment logs for target customers",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Investment logs list" } },
    },
  },
  "/api/v1/broker/target-customers-logs/investnent-logs-external": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get referral logs by email externally",
      parameters: [{ name: "email", in: "query", schema: { type: "string" } }],
      responses: { 200: { description: "Referral logs" } },
    },
  },
  "/api/v1/broker/target-customers-logs/{id}": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get referral logs by target customer ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Referral logs for target customer" } },
    },
  },
  "/api/v1/broker/dashboard": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get comprehensive broker dashboard stats and charts",
      description: "Query param is filterType, not filter — verified against getDashboardData.js and the frontend.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "filterType", in: "query", schema: { type: "string" }, description: "e.g. today, weekly, monthly, yearly" },
        { name: "from", in: "query", schema: { type: "string", format: "date" } },
        { name: "to", in: "query", schema: { type: "string", format: "date" } },
        { name: "viewUserId", in: "query", schema: { type: "string" }, description: "Admin-only" },
        { name: "type", in: "query", schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer" } },
      ],
      responses: { 200: { description: "Dashboard summary, commissions, customer counters" } },
    },
  },
  "/api/v1/broker/remove-brocker-image/{type}": {
    delete: {
      tags: ["Broker - Profile & Network"],
      summary: "Remove broker image (logo or profile)",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "type", in: "path", required: true, schema: { type: "string", enum: ["logo", "profile"] } },
      ],
      responses: { 200: { description: "Image removed" } },
    },
  },
  "/api/v1/broker/invitation": {
    post: {
      tags: ["Broker - Marketing & Invitations"],
      summary: "Create or update invitation",
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/InvitationRequest" } },
        },
      },
      responses: { 200: { description: "Invitation recorded" } },
    },
  },
  "/api/v1/broker/invitations": {
    get: {
      tags: ["Broker - Marketing & Invitations"],
      summary: "Get invitations sent by broker",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "List of invitations" } },
    },
  },
  "/api/v1/broker/marketing-materials": {
    get: {
      tags: ["Broker - Marketing & Invitations"],
      summary: "Get available marketing materials for broker",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Marketing materials list" } },
    },
  },
  "/api/v1/broker/partner-referral": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get partner referral code",
      parameters: [{ name: "email", in: "query", schema: { type: "string" } }],
      responses: { 200: { description: "Referral code found" } },
    },
    post: {
      tags: ["Broker - Target Customers"],
      summary: "Get partner referral code",
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/EmailRequest" } },
        },
      },
      responses: { 200: { description: "Referral code found" } },
    },
  },
};
