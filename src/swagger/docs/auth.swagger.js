module.exports = {
  "/api/v1/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "User / Admin / Broker / Affiliate Login",
      description: "Authenticate a user with email and password, returning a JWT token and user profile details.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  example: "admin@easygold.ch",
                },
                password: {
                  type: "string",
                  format: "password",
                  example: "admin123",
                },
                referral_code: {
                  type: "string",
                  example: "REF12345",
                  description: "Optional referral code for new users",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Login successful",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Logged in successfully" },
                  data: {
                    type: "object",
                    properties: {
                      user: { type: "object" },
                      token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: "Invalid credentials, invalid referral code, or profile under review" },
        401: { description: "Incorrect password or unauthorized" },
        403: { description: "Account deactivated or access denied" },
        404: { description: "User or broker not found" },
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
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        value: { type: "string", example: "business" },
                        label_en: { type: "string", example: "Business" },
                        label_de: { type: "string", example: "Unternehmen" },
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
  },
  "/api/v1/auth/broker-register": {
    post: {
      tags: ["Auth"],
      summary: "Verify broker registration with parent referral",
      description: "Verifies broker credentials and associates with parent referral code.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password", "referral_code"],
              properties: {
                email: { type: "string", format: "email", example: "broker@example.com" },
                password: { type: "string", example: "password123" },
                referral_code: { type: "string", example: "REF123" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Broker verified and registered" },
        400: { description: "Invalid input or referral code" },
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
          "application/json": {
            schema: {
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
          },
        },
      },
      responses: {
        200: { description: "Affiliate registered successfully" },
        400: { description: "Validation error or existing user" },
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
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: { type: "string", format: "email", example: "user@example.com" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "OTP sent to email" },
        404: { description: "User not found" },
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
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: { type: "string", format: "email", example: "user@example.com" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Password reset email sent" },
        404: { description: "User not found" },
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
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "otp"],
              properties: {
                email: { type: "string", format: "email", example: "user@example.com" },
                otp: { type: "string", example: "123456" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "OTP verified successfully" },
        400: { description: "Invalid or expired OTP" },
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
          "application/json": {
            schema: {
              type: "object",
              required: ["token", "newPassword"],
              properties: {
                token: { type: "string", example: "jwt-reset-token-here" },
                newPassword: { type: "string", format: "password", example: "NewSecurePassword123!" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Password reset successful" },
        400: { description: "Invalid or expired reset token" },
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
        404: { description: "No customer found" },
      },
    },
    post: {
      tags: ["Auth"],
      summary: "Get partner referral code by email & product (POST)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: { type: "string", format: "email", example: "customer@example.com" },
                product: { type: "string", example: "goldflex" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Referral code found" },
        404: { description: "No customer found" },
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
      },
    },
    post: {
      tags: ["Auth"],
      summary: "Get customer partner referral code (Alias POST)",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: { type: "string", format: "email" },
                product: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Referral code found" },
      },
    },
  },
};
