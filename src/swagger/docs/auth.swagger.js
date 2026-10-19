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
        200: { description: "Broker verified and registered" },
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
        200: { description: "Affiliate registered successfully" },
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
        200: { description: "OTP sent to email" },
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
        200: { description: "Password reset email sent" },
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
        200: { description: "OTP verified successfully" },
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
        200: { description: "Password reset successful" },
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
        200: { description: "Terms document details" },
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
        200: { description: "List of registration terms" },
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
        200: { description: "Referral code found" },
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
        200: { description: "Referral code found" },
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
        200: { description: "Referral code found" },
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
        200: { description: "Referral code found" },
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
