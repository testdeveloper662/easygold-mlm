module.exports = {
  "/api/v1/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "User / Admin / Broker / Affiliate Login",
      description: "Authenticate a user with email and password, returning a JWT token and user profile details.",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/LoginRequest" } },
        },
      },
      responses: {
        200: {
          description: "Login successful",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { "$ref": "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      message: { type: "string", example: "Logged in successfully" },
                      data: {
                        type: "object",
                        properties: {
                          user: { "$ref": "#/components/schemas/User" },
                          token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                        },
                      },
                    },
                  },
                ],
              },
              examples: {
                broker_or_affiliate_login: {
                  summary: "Broker / Affiliate / Private individual login",
                  value: {
                    success: true,
                    message: "Logged in successfully",
                    data: {
                      user: {
                        ID: 1001,
                        user_login: "broker18@example.com",
                        user_nicename: "broker18@example.com",
                        user_email: "broker18@example.com",
                        user_url: "",
                        user_registered: "2026-03-14T09:21:00.000Z",
                        user_activation_key: "",
                        user_status: 0,
                        display_name: "broker18",
                        user_type: 0,
                        wallet_amount: 125.5,
                        wallet_payment: 0,
                        logo: "http://localhost:4000/uploads/logo/1779099635240.jpeg",
                        menulogo: null,
                        commission_percentage: 10,
                        api_commission_percentage: 10,
                        shipping_costs_setting: 0,
                        temp_pass: null,
                        mystorekey: "demo123",
                        self_service: 1,
                        landing_page: true,
                        deleted_at: null,
                        role_id: 2,
                        role: "BROKER",
                        referral_code: "DEMO12",
                        broker_id: 42,
                        profile_image: "http://localhost:4000/public/default/default_org.png",
                        landing_pageurl: "https://easygold.example.com/landingpage/demo123",
                        goldbuying_page: "https://easygold.example.com/Goldankauf/demo123",
                        silverpurchase_page: "https://easygold.example.com/Silberankauf/demo123",
                        platinumpurchase_page: "https://easygold.example.com/Platinankauf/demo123",
                        palladiumpurchase_page: "https://easygold.example.com/Palladiumankauf/demo123",
                        preciousmetalsale_page: "https://easygold.example.com/Edelmetallverkauf/demo123",
                        cointrade_page: "https://easygold.example.com/Muenzhandel/demo123",
                        jewelryappraisal_page: "https://easygold.example.com/schmuckbewertung/demo123",
                        consultingexpertise_page: "https://easygold.example.com/BeratungUndExpertise/demo123",
                        previousmetaldealers_page: "https://easygold.example.com/zoomLanding/demo123",
                        selfservice_page: "https://easygold.example.com/mystore/demo123",
                        goldflexurl: "https://app.easygold.example.com/customer-referral/REVNTzEy/goldflex",
                        easygoldurl: "https://app.easygold.example.com/customer-referral/REVNTzEy/easygold",
                        primeinvesturl: "https://app.easygold.example.com/customer-referral/REVNTzEy/primeinvest",
                      },
                      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7IklEIjo0MzQxNn19.fakeSignatureForDocsOnly",
                    },
                  },
                },
                admin_login: {
                  summary: "Super admin login (reduced user shape, no broker/affiliate fields)",
                  value: {
                    success: true,
                    message: "Admin logged in successfully",
                    data: {
                      user: {
                        ID: 1,
                        user_login: "admin@easygold.example.com",
                        user_nicename: "admin",
                        user_email: "admin@easygold.example.com",
                        user_url: "",
                        user_registered: "2024-01-01T00:00:00.000Z",
                        user_activation_key: "",
                        user_status: 0,
                        display_name: "Admin",
                        user_type: 1,
                        wallet_amount: 0,
                        wallet_payment: 0,
                        logo: "http://localhost:4000/public/default/default_org.png",
                        menulogo: null,
                        commission_percentage: 0,
                        api_commission_percentage: 0,
                        shipping_costs_setting: 0,
                        temp_pass: null,
                        mystorekey: null,
                        self_service: 0,
                        landing_page: 0,
                        deleted_at: null,
                        role_id: null,
                        role: "SUPER_ADMIN",
                      },
                      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7IklEIjoxfX0.fakeSignatureForDocsOnly",
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Invalid credentials, invalid referral code, or profile under review",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        401: {
          description: "Incorrect password or unauthorized",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        403: {
          description: "Account deactivated or access denied",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        404: {
          description: "Email/password missing, or user/broker not found",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/auth/person-types": {
    get: {
      tags: ["Auth"],
      summary: "Get person types",
      description: "Retrieve available person types (business, affiliate, private individual).",
      responses: {
        200: {
          description: "List of person types",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { "$ref": "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { "$ref": "#/components/schemas/PersonType" } },
                    },
                  },
                ],
              },
              example: {
                success: true,
                data: [
                  { id: 1, value: "business", label_en: "Business", label_de: "Unternehmen" },
                  { id: 2, value: "affiliate", label_en: "Affiliate", label_de: "Partner" },
                  { id: 3, value: "private_individual", label_en: "Private Individual", label_de: "Privatperson" },
                ],
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/auth/broker-register": {
    post: {
      tags: ["Auth"],
      summary: "Verify broker registration with parent referral",
      description: "Verifies broker credentials and associates with parent referral code.",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/BrokerRegisterVerifyRequest" } },
        },
      },
      responses: {
        200: {
          description: "Broker verified and registered",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                message: "Registered successfully",
                data: {
                  user: {
                    ID: 1001,
                    user_login: "broker18@example.com",
                    user_nicename: "broker18@example.com",
                    user_email: "broker18@example.com",
                    user_url: "",
                    user_registered: "2026-03-14T09:21:00.000Z",
                    user_activation_key: "",
                    user_status: 0,
                    display_name: "broker18",
                    user_type: 0,
                    wallet_amount: 0,
                    wallet_payment: 0,
                    logo: null,
                    menulogo: null,
                    commission_percentage: 0,
                    api_commission_percentage: 0,
                    shipping_costs_setting: 0,
                    temp_pass: null,
                    mystorekey: null,
                    self_service: 0,
                    landing_page: 0,
                    deleted_at: null,
                    role_id: 2,
                  },
                  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7IklEIjo0MzQxNn19.fakeSignatureForDocsOnly",
                },
              },
            },
          },
        },
        400: { description: "Invalid input or referral code" },
        401: {
          description: "Incorrect password",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/auth/affiliate-register": {
    post: {
      tags: ["Auth"],
      summary: "Register a new affiliate / private individual",
      description: "Registers an affiliate under an existing broker or parent code.",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/AffiliateRegisterRequest" } },
        },
      },
      responses: {
        200: {
          description: "Affiliate registered successfully",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                message: "Affiliate registered successfully",
                data: {
                  user: {
                    ID: 43531,
                    fullName: "Max Muster",
                    email: "max.muster@example.com",
                    referral_code: "K7QJ2P",
                    role: "AFFILIATE",
                    user_status: 2,
                  },
                  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7IklEIjo0MzUzMX19.fakeSignatureForDocsOnly",
                },
              },
            },
          },
        },
        400: { description: "Validation error or existing user" },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/auth/change-password": {
    post: {
      tags: ["Auth"],
      summary: "Request OTP for password change",
      description: "Sends a 6-digit OTP to the registered user email.",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/EmailRequest" } },
        },
      },
      responses: {
        200: {
          description: "OTP sent to email",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: { success: true, message: "OTP has been sent to this email", data: {} },
            },
          },
        },
        400: {
          description: "Email is required",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        404: { description: "User not found" },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/auth/forgot-password": {
    post: {
      tags: ["Auth"],
      summary: "Send password reset link",
      description: "Sends a password reset link valid for 15 minutes to user's email.",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/EmailRequest" } },
        },
      },
      responses: {
        200: {
          description: "Password reset email sent",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: { success: true, message: "A password reset link has been sent to your email", data: {} },
            },
          },
        },
        400: {
          description: "Email is required",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        404: { description: "User not found" },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/auth/otp": {
    post: {
      tags: ["Auth"],
      summary: "Validate OTP",
      description: "Validates the one-time passcode sent to email.",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/OtpValidateRequest" } },
        },
      },
      responses: {
        200: {
          description: "OTP verified successfully",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: { success: true, message: "Correct OTP", data: {} },
            },
          },
        },
        400: { description: "Invalid or expired OTP" },
        404: {
          description: "User not found",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/auth/reset-password": {
    post: {
      tags: ["Auth"],
      summary: "Reset password with token",
      description: "Resets the user's password using the token sent in email reset link.",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/ResetPasswordRequest" } },
        },
      },
      responses: {
        200: {
          description: "Password reset successful",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: { success: true, message: "Password reset successful", data: {} },
            },
          },
        },
        400: { description: "Invalid or expired reset token" },
        404: {
          description: "User not found",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/auth/terms-and-conditions/{document_key}": {
    get: {
      tags: ["Auth"],
      summary: "Get public terms & conditions document by key",
      description: "Fetch terms and conditions document details by document key.",
      parameters: [
        {
          name: "document_key",
          in: "path",
          required: true,
          schema: { type: "string" },
          example: "broker_contract_terms",
        },
      ],
      responses: {
        200: {
          description: "Terms document details",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                data: {
                  id: 4,
                  english_name: "Broker Contract Terms",
                  german_name: "Vermittlervertragsbedingungen",
                  english_template_text: "<p>These terms govern the broker partnership agreement...</p>",
                  german_template_text: "<p>Diese Bedingungen regeln die Vermittler-Partnerschaftsvereinbarung...</p>",
                  english_pdf_file: "/uploads/terms/broker_contract_terms_en.pdf",
                  german_pdf_file: "/uploads/terms/broker_contract_terms_de.pdf",
                  description: "Contract terms shown to brokers during registration",
                  showonregister: true,
                  document_key: "broker_contract_terms",
                  createdAt: "2026-01-10T08:00:00.000Z",
                  updatedAt: "2026-03-02T11:15:00.000Z",
                },
              },
            },
          },
        },
        404: { description: "Terms not found" },
      },
    },
  },
  "/api/v1/auth/register-terms": {
    get: {
      tags: ["Auth"],
      summary: "Get registration terms & conditions",
      description: "List all terms and conditions documents required for user registration.",
      responses: {
        200: {
          description: "List of registration terms",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                data: [
                  { id: 4, document_key: "broker_contract_terms", english_name: "Broker Contract Terms", german_name: "Vermittlervertragsbedingungen" },
                  { id: 5, document_key: "privacy_policy", english_name: "Privacy Policy", german_name: "Datenschutzerklärung" },
                ],
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/partner-referral": {
    get: {
      tags: ["Auth"],
      summary: "Get partner referral code by email & product (GET)",
      parameters: [
        { name: "email", in: "query", required: true, schema: { type: "string", format: "email" }, example: "customer@example.com" },
        { name: "product", in: "query", schema: { type: "string" }, example: "goldflex" },
      ],
      responses: {
        200: {
          description: "Referral code found",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                message: "Parent referral code retrieved successfully",
                data: {
                  referral_code: "UkVGMTIzNDU=",
                  raw_referral_code: "REF12345",
                  encoded_referral_code: "UkVGMTIzNDU=",
                  customer_id: 912,
                  customer_name: "Jane Customer",
                  customer_email: "customer@example.com",
                  product: "goldflex",
                  partner_referral_url: "https://app.easygold.example.com/partner-referral/UkVGMTIzNDU=",
                  broker_registration_url: "https://app.easygold.example.com/broker-register/step1/UkVGMTIzNDU=",
                  affiliate_registration_url: "https://app.easygold.example.com/affiliate-register?referral=UkVGMTIzNDU=",
                },
              },
            },
          },
        },
        400: {
          description: "Email is required",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        404: { description: "No customer found" },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
    post: {
      tags: ["Auth"],
      summary: "Get partner referral code by email & product (POST)",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/PartnerReferralRequest" } },
        },
      },
      responses: {
        200: {
          description: "Referral code found",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                message: "Parent referral code retrieved successfully",
                data: {
                  referral_code: "UkVGMTIzNDU=",
                  raw_referral_code: "REF12345",
                  encoded_referral_code: "UkVGMTIzNDU=",
                  customer_id: 912,
                  customer_name: "Jane Customer",
                  customer_email: "customer@example.com",
                  product: "goldflex",
                  partner_referral_url: "https://app.easygold.example.com/partner-referral/UkVGMTIzNDU=",
                  broker_registration_url: "https://app.easygold.example.com/broker-register/step1/UkVGMTIzNDU=",
                  affiliate_registration_url: "https://app.easygold.example.com/affiliate-register?referral=UkVGMTIzNDU=",
                },
              },
            },
          },
        },
        400: {
          description: "Email is required",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        404: { description: "No customer found" },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/customer/partner-referral": {
    get: {
      tags: ["Auth"],
      summary: "Get customer partner referral code (Alias GET)",
      parameters: [
        { name: "email", in: "query", required: true, schema: { type: "string" } },
        { name: "product", in: "query", schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Referral code found",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                message: "Parent referral code retrieved successfully",
                data: {
                  referral_code: "UkVGMTIzNDU=",
                  raw_referral_code: "REF12345",
                  encoded_referral_code: "UkVGMTIzNDU=",
                  customer_id: 912,
                  customer_name: "Jane Customer",
                  customer_email: "customer@example.com",
                  product: "goldflex",
                  partner_referral_url: "https://app.easygold.example.com/partner-referral/UkVGMTIzNDU=",
                  broker_registration_url: "https://app.easygold.example.com/broker-register/step1/UkVGMTIzNDU=",
                  affiliate_registration_url: "https://app.easygold.example.com/affiliate-register?referral=UkVGMTIzNDU=",
                },
              },
            },
          },
        },
        400: {
          description: "Email is required",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        404: { description: "No customer found" },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
    post: {
      tags: ["Auth"],
      summary: "Get customer partner referral code (Alias POST)",
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/PartnerReferralRequest" } },
        },
      },
      responses: {
        200: {
          description: "Referral code found",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                message: "Parent referral code retrieved successfully",
                data: {
                  referral_code: "UkVGMTIzNDU=",
                  raw_referral_code: "REF12345",
                  encoded_referral_code: "UkVGMTIzNDU=",
                  customer_id: 912,
                  customer_name: "Jane Customer",
                  customer_email: "customer@example.com",
                  product: "goldflex",
                  partner_referral_url: "https://app.easygold.example.com/partner-referral/UkVGMTIzNDU=",
                  broker_registration_url: "https://app.easygold.example.com/broker-register/step1/UkVGMTIzNDU=",
                  affiliate_registration_url: "https://app.easygold.example.com/affiliate-register?referral=UkVGMTIzNDU=",
                },
              },
            },
          },
        },
        400: {
          description: "Email is required",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        404: { description: "No customer found" },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
};
