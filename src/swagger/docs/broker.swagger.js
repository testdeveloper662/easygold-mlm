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
        200: {
          description: "Broker registration successful",
          content: {
            "application/json": {
              example: { success: true, message: "Broker registered successfully" },
            },
          },
        },
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
        200: {
          description: "Check result returned (success:false in body if already taken)",
          content: {
            "application/json": {
              examples: {
                available: {
                  summary: "Not taken — safe to register",
                  value: { success: true, message: "Broker Not exists" },
                },
                email_taken: {
                  summary: "Email already in use",
                  value: { success: false, field: "email", message: "A user with this email already exists. Please use a different email address." },
                },
                username_taken: {
                  summary: "Username already in use",
                  value: { success: false, field: "username", message: "This username is already taken. Please choose a different username." },
                },
                company_taken: {
                  summary: "Company name already in use",
                  value: { success: false, field: "company", message: "This company name is already taken. Please choose a different company name." },
                },
              },
            },
          },
        },
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
        200: {
          description: "Referral email sent",
          content: {
            "application/json": {
              example: { success: true, message: "Email sent successfully to anna.weber@example.com" },
            },
          },
        },
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
        200: {
          description: "Referral email sent successfully",
          content: {
            "application/json": {
              example: { success: true, message: "Email sent successfully to anna.weber@example.com" },
            },
          },
        },
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
        200: {
          description: "Nudge email sent",
          content: {
            "application/json": {
              example: { success: true, message: "Email sent successfully to referred.broker@example.com" },
            },
          },
        },
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
        200: {
          description: "Network tree with child brokers/affiliates",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  broker_id: 173,
                  user_id: 43530,
                  user_email: "max.partner@example.com",
                  display_name: "Max Partner",
                  profile_image: "https://cdn.example.com/uploads/profile/43530.png",
                  is_affiliate: false,
                  role_id: 2,
                  role_name: "BROKER",
                  referral_code: "ESYG0916",
                  level: 1,
                  commission_amount: 248.84,
                  children: [
                    {
                      broker_id: 181,
                      user_id: 43612,
                      profile_image: "",
                      user_email: "anna.weber@example.com",
                      display_name: "Anna Weber",
                      referral_code: "ANW4521",
                      role_id: 2,
                      role_name: "BROKER",
                      is_affiliate: false,
                      commission_amount: 42.0,
                      level: 2,
                      children: [],
                      children_count: 0,
                    },
                  ],
                  children_count: 1,
                },
              },
            },
          },
        },
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
        200: {
          description: "Subtree hierarchy",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  broker: {
                    broker_id: 173,
                    user_id: 43530,
                    display_name: "Max Partner",
                    referral_code: "ESYG0916",
                    total_direct_children: 1,
                  },
                  network: {
                    broker_id: 173,
                    profile_image: "https://cdn.example.com/uploads/profile/43530.png",
                    user_id: 43530,
                    user_email: "max.partner@example.com",
                    display_name: "Max Partner",
                    referral_code: "ESYG0916",
                    role_id: 2,
                    role_name: "BROKER",
                    commission_amount: 248.84,
                    level: 1,
                    children: [
                      {
                        broker_id: 181,
                        user_id: 43612,
                        profile_image: "",
                        user_email: "anna.weber@example.com",
                        display_name: "Anna Weber",
                        referral_code: "ANW4521",
                        role_id: 2,
                        role_name: "BROKER",
                        is_affiliate: false,
                        commission_amount: 42.0,
                        level: 2,
                        children: [],
                        children_count: 0,
                      },
                    ],
                    children_count: 1,
                  },
                },
              },
            },
          },
        },
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
        200: {
          description: "Upline ancestor chain",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  broker: {
                    broker_id: 181,
                    user_id: 43612,
                    display_name: "Anna Weber",
                    referral_code: "ANW4521",
                    total_direct_children: 1,
                  },
                  network: {
                    broker_id: 181,
                    profile_image: "",
                    user_id: 43612,
                    user_email: "anna.weber@example.com",
                    display_name: "Anna Weber",
                    referral_code: "ANW4521",
                    commission_amount: 42.0,
                    level: 1,
                    children: [
                      {
                        broker_id: 173,
                        user_id: 43530,
                        profile_image: "https://cdn.example.com/uploads/profile/43530.png",
                        user_email: "max.partner@example.com",
                        display_name: "Max Partner",
                        referral_code: "ESYG0916",
                        commission_amount: 248.84,
                        level: 2,
                        children: [],
                        children_count: 0,
                      },
                    ],
                    children_count: 1,
                  },
                },
              },
            },
          },
        },
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
              example: {
                success: true,
                referral_code: "ESYG0916",
                referral_name: "Max Partner",
                total_children: 4,
                limitReached: false,
                language: "en",
                country: "US",
                contracts: [
                  {
                    id: 3,
                    document_key: "b2b_partner_agreement",
                    english_name: "Partner Agreement",
                    german_name: "Partnervereinbarung",
                    english_pdf_file: "https://api.example.com/public/uploads/contracts/partner_agreement_en.pdf",
                    german_pdf_file: "https://api.example.com/public/uploads/contracts/partner_agreement_de.pdf",
                  },
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
        200: {
          description: "VAT validation response",
          content: {
            "application/json": {
              example: { success: true },
            },
          },
        },
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
              example: {
                success: true,
                message: "Commission history fetched successfully.",
                data: [
                  {
                    id: 5021,
                    broker_id: 173,
                    user_id: 43530,
                    order_id: "8842",
                    order_type: "my_store",
                    order_amount: 2488.4,
                    profit_amount: 497.68,
                    commission_percent: 10,
                    commission_amount: 248.84,
                    tree: "173->161->140",
                    is_seller: true,
                    is_payment_done: true,
                    is_payment_declined: false,
                    selected_payment_method: 1,
                    choose_payment_option: 1,
                    commission_type: "direct",
                    product_type: "product",
                    seller_name: "Max Partner",
                    user_login: "max.partner",
                    payment_type: "Bank Transfer",
                    createdAt: "2026-10-12T09:15:21.000Z",
                    updatedAt: "2026-10-12T09:15:21.000Z",
                  },
                ],
                pagination: { currentPage: 1, totalPages: 3, totalItems: 27, itemsPerPage: 10 },
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
              example: {
                success: true,
                message: "Direct commission history fetched successfully.",
                data: [
                  {
                    id: 5021,
                    broker_id: 173,
                    user_id: 43530,
                    order_id: "8842",
                    order_type: "my_store",
                    order_amount: 2488.4,
                    profit_amount: 497.68,
                    commission_percent: 10,
                    commission_amount: 248.84,
                    tree: "173->161->140",
                    is_seller: true,
                    is_payment_done: true,
                    is_payment_declined: false,
                    selected_payment_method: 1,
                    choose_payment_option: 1,
                    commission_type: "direct",
                    product_type: "product",
                    seller_name: "Max Partner",
                    user_login: "max.partner",
                    payment_type: "Bank Transfer",
                    createdAt: "2026-10-12T09:15:21.000Z",
                    updatedAt: "2026-10-12T09:15:21.000Z",
                  },
                ],
                pagination: { currentPage: 1, totalPages: 1, totalItems: 6, itemsPerPage: 10 },
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
        200: {
          description: "Order detail",
          content: {
            "application/json": {
              examples: {
                standard_order: {
                  summary: "my_store / landing_page / api order",
                  value: {
                    success: true,
                    data: {
                      products: [
                        { id: 42, title: "1oz Gold Bar", price: 1988.5, quantity: 1 },
                      ],
                      orderDetails: { order_id: "8842", order_type: "my_store" },
                      partner: { name: "Max Partner", email: "max.partner@example.com" },
                    },
                  },
                },
                gold_type_order: {
                  summary: "gold_purchase / goldflex / easygoldtoken / primeinvest order",
                  value: {
                    success: true,
                    data: {
                      order_id: "8842",
                      order_type: "gold_purchase",
                      order_amount: 2488.4,
                      profit_amount: 248.84,
                      createdAt: "2026-10-12T09:15:21.000Z",
                      updatedAt: "2026-10-12T09:15:21.000Z",
                      broker_commissions: [
                        { broker_id: 173, user_id: 43530, user_email: "max.partner@example.com", commission_percent: 10, commission_amount: 248.84, is_seller: true, is_payment_done: true, is_payment_declined: false, tree: "173->161->140" },
                      ],
                      tree: "173->161->140",
                      customer: { name: "Anna Weber", email: "anna.weber@example.com", phone: "+1 555 0100", address: "221B Baker Street", city: "Austin", country: "US" },
                    },
                  },
                },
              },
            },
          },
        },
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
        200: {
          description: "Customer details",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  commission_data: {
                    id: 5021,
                    broker_id: 173,
                    user_id: 43530,
                    order_id: "8842",
                    order_type: "my_store",
                    order_amount: 2488.4,
                    commission_percent: 10,
                    commission_amount: 248.84,
                    tree: "173->161->140",
                    is_seller: true,
                    is_payment_done: true,
                    customer_id: 91,
                  },
                  customer: {
                    id: 91,
                    customer_name: "Anna Weber",
                    customer_email: "anna.weber@example.com",
                    interest_in: "easygold Token",
                    status: "REGISTERED",
                  },
                },
              },
            },
          },
        },
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
        200: {
          description: "Logo uploaded successfully",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Logo image updated successfully",
                data: {
                  ID: 43530,
                  display_name: "Max Partner",
                  user_email: "max.partner@example.com",
                  logo: "https://cdn.example.com/uploads/logo/43530.png",
                },
              },
            },
          },
        },
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
        200: {
          description: "Profile photo uploaded successfully",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Profile image updated successfully",
                data: {
                  ID: 43530,
                  display_name: "Max Partner",
                  user_email: "max.partner@example.com",
                  profile_image: "https://cdn.example.com/uploads/profile/43530.png",
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/getbrokerlinks": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get referral links for store, landing page, and products",
      parameters: [{ name: "referral_code", in: "query", schema: { type: "string" } }],
      responses: {
        200: {
          description: "Generated store & referral URLs",
          content: {
            "application/json": {
              example: {
                success: true,
                landing_page_url: "https://api.example.com/landingpage/maxpartner",
                registration_page_url: "https://app.example.com/broker-register/step1/RVNZRzA5MTY=",
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/getuserurls": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get current authenticated broker's custom URLs",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Broker product URLs",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "User urls retrieved successfully",
                data: {
                  goldflexurl: "https://app.example.com/customer-referral/RVNZRzA5MTY=/goldflex",
                  primeinvesturl: "https://app.example.com/customer-referral/RVNZRzA5MTY=/primeinvest",
                  easygoldurl: "https://app.example.com/customer-referral/RVNZRzA5MTY=/easygold",
                  landing_page: 1,
                  landing_pageurl: "https://api.example.com/landingpage/maxpartner",
                  goldbuying_page: "https://api.example.com/Goldankauf/maxpartner",
                  silverpurchase_page: "https://api.example.com/Silberankauf/maxpartner",
                  platinumpurchase_page: "https://api.example.com/Platinankauf/maxpartner",
                  palladiumpurchase_page: "https://api.example.com/Palladiumankauf/maxpartner",
                  preciousmetalsale_page: "https://api.example.com/Edelmetallverkauf/maxpartner",
                  cointrade_page: "https://api.example.com/Muenzhandel/maxpartner",
                  jewelryappraisal_page: "https://api.example.com/schmuckbewertung/maxpartner",
                  consultingexpertise_page: "https://api.example.com/BeratungUndExpertise/maxpartner",
                  previousmetaldealers_page: "https://api.example.com/zoomLanding/maxpartner",
                  selfservice_page: "https://api.example.com/mystore/maxpartner",
                },
              },
            },
          },
        },
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
        200: {
          description: "Banner created",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Affiliate banner created successfully",
                data: {
                  id: 31,
                  broker_id: 173,
                  name: "Autumn Gold Promo",
                  german_name: "Herbst Gold Aktion",
                  product_selected: "Landingpage",
                  url: "https://api.example.com/landingpage/maxpartner",
                  qrPosition: null,
                  qrSize: null,
                  backgroundImage: "/banners/1729342567-promo.png",
                  createdAt: "2026-10-19T09:12:03.000Z",
                  updatedAt: "2026-10-19T09:12:03.000Z",
                },
              },
            },
          },
        },
      },
    },
    get: {
      tags: ["Broker - Marketing & Invitations"],
      summary: "Get affiliate banners",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "List of banners",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Affiliate Banners retrieved successfully",
                data: {
                  banners: [
                    {
                      id: 31,
                      broker_id: 173,
                      name: "Autumn Gold Promo",
                      german_name: "Herbst Gold Aktion",
                      product_selected: "Landingpage",
                      url: "https://api.example.com/landingpage/maxpartner",
                      qrPosition: { x: 10, y: 10 },
                      qrSize: { width: 80, height: 80 },
                      backgroundImage: "https://api.example.com/uploads/banners/1729342567-promo.png",
                      createdAt: "2026-10-19T09:12:03.000Z",
                      updatedAt: "2026-10-19T09:12:03.000Z",
                    },
                  ],
                  total: 1,
                  currentPage: 1,
                  totalPages: 1,
                  limit: 10,
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/affiliate-banners/{id}": {
    get: {
      tags: ["Broker - Marketing & Invitations"],
      summary: "Get affiliate banner by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Banner item",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Affiliate Banner retrieved successfully",
                data: {
                  id: 31,
                  broker_id: 173,
                  name: "Autumn Gold Promo",
                  german_name: "Herbst Gold Aktion",
                  product_selected: "Landingpage",
                  url: "https://api.example.com/landingpage/maxpartner",
                  qrPosition: { x: 10, y: 10 },
                  qrSize: { width: 80, height: 80 },
                  backgroundImage: "https://api.example.com/uploads/banners/1729342567-promo.png",
                  createdAt: "2026-10-19T09:12:03.000Z",
                  updatedAt: "2026-10-19T09:12:03.000Z",
                },
              },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "Banner updated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Affiliate banner updated successfully",
                data: {
                  id: 31,
                  broker_id: 173,
                  name: "Autumn Gold Promo (updated)",
                  german_name: "Herbst Gold Aktion",
                  product_selected: "Landingpage",
                  url: "https://api.example.com/landingpage/maxpartner",
                  qrPosition: "{\"x\":10,\"y\":10}",
                  qrSize: "{\"width\":80,\"height\":80}",
                  backgroundImage: "/banners/1729342600-promo-v2.png",
                  createdAt: "2026-10-19T09:12:03.000Z",
                  updatedAt: "2026-10-19T10:03:11.000Z",
                },
              },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Broker - Marketing & Invitations"],
      summary: "Delete affiliate banner",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Banner deleted",
          content: {
            "application/json": {
              example: { success: true, message: "Affiliate banner deleted successfully" },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "Bank details saved",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Broker bank details updated successfully in user metadata.",
                data: {
                  user_id: 43530,
                  banks: {
                    sepa: [{ account_holder: "Max Partner", bank_name: "Deutsche Bank", iban: "DE89370400440532013000", bic_swift: "DEUTDEFF", bank_address: "" }],
                    swift: [],
                    ach: [],
                  },
                  ac_holder_name: "Max Partner",
                  iban: "DE89370400440532013000",
                  bic_swift_code: "DEUTDEFF",
                  bank_name: "Deutsche Bank",
                },
              },
            },
          },
        },
      },
    },
    get: {
      tags: ["Broker - Commissions & Payouts"],
      summary: "Get broker bank details and balance",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "viewUserId", in: "query", schema: { type: "string" }, description: "Admin-only: view another broker's bank details" },
      ],
      responses: {
        200: {
          description: "Bank details",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  ac_holder_name: "Max Partner",
                  iban: "DE89370400440532013000",
                  bic_swift_code: "DEUTDEFF",
                  bank_name: "Deutsche Bank",
                  banks: {
                    sepa: [{ account_holder: "Max Partner", bank_name: "Deutsche Bank", iban: "DE89370400440532013000", bic_swift: "DEUTDEFF", bank_address: "" }],
                    swift: [],
                    ach: [],
                  },
                  affiliate_bank: null,
                  commissions_totals: { EASYGOLD_TOKEN: 120.5, PRIMEINVEST: 0, GOLDFLEX: 40, B2B_DASHBOARD: 880.3 },
                  affiliate_commissions_totals: { EASYGOLD_TOKEN: 0, PRIMEINVEST: 0, GOLDFLEX: 0, B2B_DASHBOARD: 0 },
                  broker_commissions_totals: { EASYGOLD_TOKEN: 120.5, PRIMEINVEST: 0, GOLDFLEX: 40, B2B_DASHBOARD: 880.3 },
                },
              },
            },
          },
        },
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
        200: {
          description: "Payout request submitted",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Payout request created successfully.",
                data: {
                  id: 412,
                  user_id: 43530,
                  broker_id: 173,
                  amount: 250,
                  payout_for: "B2B_DASHBOARD",
                  status: "PENDING",
                  invoice: "/payouts/payout_00412.pdf",
                  createdAt: "2026-10-19T09:30:11.000Z",
                  updatedAt: "2026-10-19T09:30:11.000Z",
                },
              },
            },
          },
        },
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
        200: {
          description: "List of payout requests",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Payout requests fetched successfully.",
                data: [
                  {
                    id: 412,
                    broker_id: 173,
                    user_id: 43530,
                    amount: 250,
                    invoice: "https://api.example.com/uploads/invoice/payout_00412.pdf",
                    payout_for: "B2B_DASHBOARD",
                    status: "PENDING",
                    rejection_reason: null,
                    created_at: "2026-10-19T09:30:11.000Z",
                    updated_at: "2026-10-19T09:30:11.000Z",
                  },
                ],
                pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 10 },
              },
            },
          },
        },
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
      responses: {
        200: {
          description: "Customer created",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Target customer created successfully",
                data: {
                  id: 91,
                  broker_id: null,
                  referral_code_id: 54,
                  customer_name: "Anna Weber",
                  customer_email: "anna.weber@example.com",
                  referral_code: null,
                  interest_in: "easygold Token",
                  referred_by_code: "ESYG0916",
                  status: "INVITED",
                  children_count: 0,
                  bonus_points: 0,
                  parent_customer_id: null,
                  updatedAt: "2026-10-19T09:40:02.000Z",
                  createdAt: "2026-10-19T09:40:02.000Z",
                },
              },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "Paginated target customers",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Target customers retrieved successfully",
                data: {
                  referralPdfEnLink: "https://api.example.com/uploads/agreements/gold_bonus_for_referrals_en.pdf",
                  referralPdfDeLink: "https://api.example.com/uploads/agreements/gold_bonus_for_referrals_de.pdf",
                  easyGoldLink: "https://easygold.example.com",
                  easyGoldReferralLink: "https://app.example.com/customer-referral/RVNZRzA5MTY=/easygold",
                  easygoldPdfLink: "https://api.example.com/uploads/agreements/whitepaper_easygold_token.pdf",
                  primeInvestLink: "https://primeinvest.example.com",
                  primeInvestReferralLink: "https://app.example.com/customer-referral/RVNZRzA5MTY=/primeinvest",
                  primeInvestEnPdfLink: "https://api.example.com/uploads/agreements/hartmann_benz_inc_share.pdf",
                  primeInvestDePdfLink: "https://api.example.com/uploads/agreements/hartmann_benz_inc_share_de.pdf",
                  landingPageReferralLink: "https://easygold.example.com/landingpage/maxpartner",
                  landingPageEnPdfLink: "https://api.example.com/uploads/agreements/landing_page_en.pdf",
                  landingPageDePdfLink: "https://api.example.com/uploads/agreements/landing_page_de.pdf",
                  goldflexLink: "https://goldflex.example.com",
                  goldflexReferralLink: "https://app.example.com/customer-referral/RVNZRzA5MTY=/goldflex",
                  goldflexPdfLink: null,
                  customers: [
                    {
                      id: 91,
                      customer_name: "Anna Weber",
                      customer_email: "anna.weber@example.com",
                      interest_in: "easygold Token",
                      status: "INVITED",
                      createdAt: "2026-10-19T09:40:02.000Z",
                    },
                  ],
                  total: 1,
                  currentPage: 1,
                  totalPages: 1,
                  limit: 10,
                },
              },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "Referral lead recorded",
          content: {
            "application/json": {
              examples: {
                already_registered: {
                  summary: "Customer already registered for this product",
                  value: {
                    success: true,
                    skipped: false,
                    message: "You already submitted form for this product",
                    data: { id: 91, broker_id: null, referral_code_id: 54, status: "REGISTERED" },
                  },
                },
                already_exists_pending: {
                  summary: "Customer already exists but not yet registered",
                  value: {
                    success: true,
                    skipped: true,
                    message: "Customer already exists for this product",
                    data: { id: 91, broker_id: null, referral_code_id: 54, status: "INVITED" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/target-customers-contract": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get customer contracts list for broker",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "List of customer contracts",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "All target customers retrieved successfully",
                data: {
                  customers: [
                    {
                      id: 91,
                      customer_name: "Anna Weber",
                      customer_email: "anna.weber@example.com",
                      interest_in: "easygold Token",
                      pdf_url: "https://api.example.com/uploads/agreements/target_customer_91.pdf",
                      createdAt: "2026-10-19T09:40:02.000Z",
                    },
                  ],
                  total: 1,
                  currentPage: 1,
                  totalPages: 1,
                  limit: 10,
                },
              },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "Target customer details (success:false in body for not-found/already-registered cases)",
          content: {
            "application/json": {
              examples: {
                found: {
                  summary: "Target customer found, not yet registered",
                  value: {
                    success: true,
                    message: "Target customer retrieved successfully",
                    country: "US",
                    language: "en",
                    companyname: "Max Partner GmbH",
                    display_name: "Max Partner",
                    street_house: "5, Neue Straße",
                    postalcode_city: "70173, Stuttgart, DE",
                    email_address: "max.partner@example.com",
                    phone: "+49 711 000000",
                    english_pdf_file: "https://api.example.com/public/uploads/contracts/b2c_easygold_en.pdf",
                    german_pdf_file: "https://api.example.com/public/uploads/contracts/b2c_easygold_de.pdf",
                  },
                },
                not_found: {
                  summary: "No matching target customer",
                  value: { success: false, notfound: true, message: "Target customer not found" },
                },
                already_registered: {
                  summary: "Target customer already registered",
                  value: { success: false, message: "Target customer already registered" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/target-customers/stats": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get target customer statistics for broker dashboard",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Target customer metrics",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Target customer statistics retrieved successfully",
                data: {
                  total_customers: 12,
                  active_customers: 7,
                  inactive_customers: 5,
                  status_breakdown: [
                    { status: "INVITED", count: 5 },
                    { status: "REGISTERED", count: 7 },
                  ],
                  interest_level_breakdown: [{ interest_level: null, count: 12 }],
                  total_estimated_value: 24500,
                  customers_added_this_month: 3,
                  upcoming_followups: 1,
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/target-customers/{id}": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get target customer by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Target customer detail",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Target customer retrieved successfully",
                data: {
                  id: 91,
                  broker_id: null,
                  referral_code_id: 54,
                  customer_name: "Anna Weber",
                  customer_email: "anna.weber@example.com",
                  referral_code: null,
                  interest_in: "easygold Token",
                  referred_by_code: "ESYG0916",
                  status: "INVITED",
                  children_count: 0,
                  bonus_points: 0,
                  parent_customer_id: null,
                  createdAt: "2026-10-19T09:40:02.000Z",
                  updatedAt: "2026-10-19T09:40:02.000Z",
                },
              },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "Target customer updated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Target customer updated successfully",
                data: {
                  id: 91,
                  customer_name: "Anna Weber-Mueller",
                  customer_email: "anna.weber@example.com",
                  interest_in: "easygold Token",
                  status: "INVITED",
                  updatedAt: "2026-10-19T10:05:44.000Z",
                },
              },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Broker - Target Customers"],
      summary: "Delete target customer lead",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Target customer deleted",
          content: {
            "application/json": {
              example: { success: true, message: "Target customer deleted successfully" },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "Customer updated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Target customer register successfully",
                data: {
                  id: 91,
                  customer_name: "Anna Weber",
                  customer_email: "anna.weber@example.com",
                  interest_in: "easygold Token",
                  status: "REGISTERED",
                  address: "5, Neue Straße, Stuttgart, DE, 70173",
                  telephone: "+49 711 111111",
                  tax_id: "DE123456789",
                  pdf_url: "uploads/agreements/target_customer_91.pdf",
                },
                referral_code: "RVNZRzA5MTY=",
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/brokers": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get list of brokers in network",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "List of brokers",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "All Brokers data",
                data: {
                  brokers: [
                    {
                      broker_id: 173,
                      user_id: 43530,
                      display_name: "Max Partner",
                      user_email: "max.partner@example.com",
                      referral_code: "ESYG0916",
                      company: "Max Partner GmbH",
                      contact_person: "Max Partner",
                      street_no: "5",
                      street: "Neue Straße",
                      location: "Stuttgart",
                      postcode: "70173",
                      country: "DE",
                      vat_no: "DE123456789",
                      tax_no: "12/345/67890",
                      phone: "+49 711 000000",
                      landline_number: "+49 711 000001",
                      language: "en-US",
                      web_site: "https://maxpartner.example.com",
                      maklervertrag_doc: "https://api.example.com/uploads/agreements/maklervertrag_173.pdf",
                      untermaklervertrag_doc: null,
                      createdAt: "2026-09-01T08:00:00.000Z",
                      updatedAt: "2026-09-01T08:00:00.000Z",
                    },
                  ],
                  total: 1,
                  currentPage: 1,
                  totalPages: 1,
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/brokers-contract": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get broker contracts",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Broker contracts list",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Broker contracts fetched successfully",
                data: {
                  contracts: [
                    {
                      broker_id: 181,
                      referral_code: "ANW4521",
                      display_name: "Anna Weber",
                      user_email: "anna.weber@example.com",
                      contract_type: "Maklervertrag",
                      contract_key: "maklervertrag_doc",
                      contract_url: "https://api.example.com/uploads/agreements/maklervertrag_181.pdf",
                      createdAt: "2026-09-10T08:00:00.000Z",
                      updatedAt: "2026-09-10T08:00:00.000Z",
                    },
                  ],
                  total: 1,
                  currentPage: 1,
                  totalPages: 1,
                  limit: 10,
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/owncontracts": {
    get: {
      tags: ["Broker - Profile & Network"],
      summary: "Get authenticated broker's own agreement contract",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Own contract PDF URLs and info",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Broker contracts fetched successfully",
                data: {
                  maklervertrag_doc: "https://api.example.com/uploads/agreements/maklervertrag_173.pdf",
                  untermaklervertrag_doc: null,
                  inc_partnership_doc: null,
                  llc_partnership_doc: null,
                  goldflex_partnership_doc: null,
                  hartmann_benz_gmbh_doc: null,
                  binding_loi_doc: null,
                  partner_tax_billing_doc: null,
                  uk_company_sales_platform_doc: null,
                  ncnda_doc: null,
                  option_subscription_doc: null,
                },
              },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "Customer signed up",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Customer registered successfully",
                data: {
                  id: 91,
                  customer_name: "Anna Weber",
                  customer_email: "anna.weber@example.com",
                  broker_id: 173,
                  referral_code_id: 54,
                  interest_in: "easygold Token",
                  referred_by_code: "ESYG0916",
                  referral_code: "refA1B2C3",
                  status: "REGISTERED",
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/ordercustomer/detail": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get customer details by order ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "order_id", in: "query", schema: { type: "string" } }],
      responses: {
        200: {
          description: "Customer order detail",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  order_id: "8842",
                  order_type: "my_store",
                  order_amount: 2488.4,
                  profit_amount: 497.68,
                  createdAt: "2026-10-12T09:15:21.000Z",
                  updatedAt: "2026-10-12T09:15:21.000Z",
                  tree: "173->161->140",
                  payment_type: "Bank Transfer",
                  broker_commissions: [
                    { broker_id: 173, user_id: 43530, user_email: "max.partner@example.com", commission_percent: 10, commission_amount: 248.84, is_seller: true, is_payment_done: true, is_payment_declined: false, tree: "173->161->140" },
                  ],
                  commission_devided: false,
                  referralLog: {
                    fromCustomer: null,
                    toCustomer: { id: 91, customer_name: "Anna Weber", customer_email: "anna.weber@example.com", telephone: "+1 555 0100" },
                  },
                  customer: { id: 91, customer_name: "Anna Weber", customer_email: "anna.weber@example.com", telephone: "+1 555 0100" },
                  referrer: null,
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/target-customers-logs/investement-logs": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get investment logs for target customers",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Investment logs list",
          content: {
            "application/json": {
              example: {
                success: true,
                data: [
                  {
                    id: 61,
                    from_customer_name: "Max Partner",
                    from_customer_email: "max.partner@example.com",
                    to_customer_name: "Anna Weber",
                    to_customer_email: "anna.weber@example.com",
                    broker_name: "Max Partner",
                    broker_email: "max.partner@example.com",
                    investment_amount: 2488.4,
                    commission_amount: 248.84,
                    product: "easygold Token",
                    type: "REFERRAL_CREATED",
                    status: "APPROVED",
                    tracking_number: "",
                    tracking_link: "",
                    remark: "",
                    address: null,
                    b2bName: null,
                    commission_devided: true,
                    createdAt: "2026-10-12T09:15:21.000Z",
                  },
                ],
                pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/target-customers-logs/investnent-logs-external": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get referral logs by email externally",
      parameters: [{ name: "email", in: "query", schema: { type: "string" } }],
      responses: {
        200: {
          description: "Referral logs",
          content: {
            "application/json": {
              example: {
                success: true,
                customer: {
                  id: 91,
                  customer_name: "Anna Weber",
                  customer_email: "anna.weber@example.com",
                  interest_in: "easygold Token",
                  status: "REGISTERED",
                },
                data: [
                  {
                    id: 61,
                    type: "REFERRAL_CREATED",
                    from_customer_name: "Anna Weber",
                    from_customer_email: "anna.weber@example.com",
                    to_customer_name: "Tom Fischer",
                    to_customer_email: "tom.fischer@example.com",
                    broker_name: "Max Partner",
                    broker_email: "max.partner@example.com",
                    investment_amount: 500,
                    commission_amount: 50,
                    product: "easygold Token",
                    status: "APPROVED",
                    tracking_number: null,
                    tracking_link: null,
                    remark: null,
                    createdAt: "2026-10-14T11:02:09.000Z",
                  },
                ],
                pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/target-customers-logs/{id}": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get referral logs by target customer ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Referral logs for target customer",
          content: {
            "application/json": {
              example: {
                success: true,
                customer: {
                  id: 91,
                  customer_name: "Anna Weber",
                  customer_email: "anna.weber@example.com",
                  interest_in: "easygold Token",
                  status: "REGISTERED",
                },
                data: [
                  {
                    id: 61,
                    type: "REFERRAL_CREATED",
                    from_customer_name: "Anna Weber",
                    from_customer_email: "anna.weber@example.com",
                    to_customer_name: "Tom Fischer",
                    to_customer_email: "tom.fischer@example.com",
                    broker_name: "Max Partner",
                    broker_email: "max.partner@example.com",
                    investment_amount: 500,
                    commission_amount: 50,
                    product: "easygold Token",
                    status: "APPROVED",
                    tracking_number: null,
                    tracking_link: null,
                    remark: null,
                    address: null,
                    b2bName: null,
                    commission_devided: false,
                    createdAt: "2026-10-14T11:02:09.000Z",
                  },
                ],
                pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
              },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "Dashboard summary, commissions, customer counters",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Dashboard data fetched successfully",
                data: {
                  total_order_sale_by_month: [{ month: "2026-10", total_amount: 2488.4 }],
                  total_earnings_by_month: [{ month: "2026-10", total_earnings: 248.84 }],
                  total_commission_received_by_month: [
                    { month: "2026-10", direct_commission: 248.84, payout_amount: 0, total_commission_received: 248.84 },
                  ],
                  sub_brokers: {
                    total: 3,
                    by_level: [
                      { level: 1, count: 2 },
                      { level: 2, count: 1 },
                      { level: 3, count: 0 },
                      { level: 4, count: 0 },
                      { level: 5, count: 0 },
                    ],
                  },
                  sub_affiliates: { total: 0 },
                  has_affiliate_data: false,
                  recent_orders: {
                    records: [
                      {
                        id: 5021,
                        order_id: "8842",
                        order_type: "my_store",
                        order_amount: 2488.4,
                        commission_type: "direct",
                        commission_amount: 248.84,
                        is_seller: true,
                        createdAt: "2026-10-12T09:15:21.000Z",
                        transaction_source: "payout",
                      },
                    ],
                    pagination: { total_records: 1, current_page: 1, total_pages: 1, per_page: 5 },
                  },
                  commission_summary_by_level: [
                    { level: 1, total_commission: 248.84, count: 1 },
                    { level: 2, total_commission: 0, count: 0 },
                    { level: 3, total_commission: 0, count: 0 },
                    { level: 4, total_commission: 0, count: 0 },
                    { level: 5, total_commission: 0, count: 0 },
                  ],
                  monthly_growth_chart: [
                    {
                      month: "2026-10",
                      network: [{ level: 1, users: [{ broker_id: 181, user_id: 43612, user_email: "anna.weber@example.com", display_name: "Anna Weber", referral_code: "ANW4521" }], count: 1 }],
                      earnings: [{ level: 1, commissions: [{ id: 5021, order_id: "8842", order_type: "my_store", order_amount: 2488.4, commission_amount: 248.84, is_seller: true, createdAt: "2026-10-12T09:15:21.000Z" }], total_amount: 248.84 }],
                    },
                  ],
                  untermaklervertrag_doc: null,
                  maklervertrag_doc: "https://api.example.com/uploads/agreements/maklervertrag_173.pdf",
                  option_subscription_doc: null,
                },
              },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "Image removed",
          content: {
            "application/json": {
              example: { success: true, message: "profile image removed successfully", data: { profile_image: "" } },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "Invitation recorded",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Invitation updated successfully",
                data: {
                  id: 284,
                  email: "anna.weber@example.com",
                  invitation_status: "REGISTERED",
                  invited_by: 173,
                  last_invitation_sent: "2026-10-18T10:00:00.000Z",
                  createdAt: "2026-10-10T08:30:00.000Z",
                  updatedAt: "2026-10-19T09:00:00.000Z",
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/invitations": {
    get: {
      tags: ["Broker - Marketing & Invitations"],
      summary: "Get invitations sent by broker",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "List of invitations",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Invitations retrieved successfully",
                data: {
                  downloadlinkEnglish: "https://api.example.com/public/uploads/agreements/broker_pdf_en.pdf",
                  downloadlinkGerman: "https://api.example.com/public/uploads/agreements/broker_pdf_de.pdf",
                  invitations: [
                    {
                      id: 284,
                      email: "anna.weber@example.com",
                      invitation_status: "REGISTERED",
                      invited_by: 173,
                      last_invitation_sent: "2026-10-18T10:00:00.000Z",
                    },
                  ],
                  total: 1,
                  currentPage: 1,
                  totalPages: 1,
                  limit: 10,
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/marketing-materials": {
    get: {
      tags: ["Broker - Marketing & Invitations"],
      summary: "Get available marketing materials for broker",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Marketing materials list",
          content: {
            "application/json": {
              example: {
                success: true,
                data: [
                  {
                    id: 14,
                    title: "Gold Bar Flyer",
                    german_title: "Goldbarren Flyer",
                    type: "pdf",
                    description: "Printable flyer for retail counters",
                    german_description: "Druckbarer Flyer für den Ladentisch",
                    category: "easygold",
                    asset_url: "https://api.example.com/uploads/marketing/gold_bar_flyer.pdf",
                    german_asset_url: "https://api.example.com/uploads/marketing/gold_bar_flyer_de.pdf",
                    youtube_url: null,
                    german_youtube_url: null,
                    width: null,
                    height: null,
                    is_active: true,
                    recommend_code: "maxpartner",
                  },
                ],
                total: 1,
                page: 1,
                totalPages: 1,
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/broker/partner-referral": {
    get: {
      tags: ["Broker - Target Customers"],
      summary: "Get partner referral code",
      parameters: [{ name: "email", in: "query", schema: { type: "string" } }],
      responses: {
        200: {
          description: "Referral code found",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Parent referral code retrieved successfully",
                data: {
                  referral_code: "RVNZRzA5MTY=",
                  raw_referral_code: "ESYG0916",
                  encoded_referral_code: "RVNZRzA5MTY=",
                  customer_id: 91,
                  customer_name: "Anna Weber",
                  customer_email: "anna.weber@example.com",
                  product: "easygold Token",
                  partner_referral_url: "https://app.example.com/partner-referral/RVNZRzA5MTY=",
                  broker_registration_url: "https://app.example.com/broker-register/step1/RVNZRzA5MTY=",
                  affiliate_registration_url: "https://app.example.com/affiliate-register?referral=RVNZRzA5MTY=",
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Broker - Target Customers"],
      summary: "Get partner referral code",
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/EmailRequest" } },
        },
      },
      responses: {
        200: {
          description: "Referral code found",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Parent referral code retrieved successfully",
                data: {
                  referral_code: "RVNZRzA5MTY=",
                  raw_referral_code: "ESYG0916",
                  encoded_referral_code: "RVNZRzA5MTY=",
                  customer_id: 91,
                  customer_name: "Anna Weber",
                  customer_email: "anna.weber@example.com",
                  product: "easygold Token",
                  partner_referral_url: "https://app.example.com/partner-referral/RVNZRzA5MTY=",
                  broker_registration_url: "https://app.example.com/broker-register/step1/RVNZRzA5MTY=",
                  affiliate_registration_url: "https://app.example.com/affiliate-register?referral=RVNZRzA5MTY=",
                },
              },
            },
          },
        },
      },
    },
  },
};
