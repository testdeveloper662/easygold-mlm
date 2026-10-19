module.exports = {
  "/api/v1/commission-history-logs-external": {
    get: {
      tags: ["External APIs"],
      summary: "Get external commission history logs by email",
      description: "External partner/dashboard endpoint to query a user's commission history across products (goldflex, primeinvest, easygold).",
      parameters: [
        { name: "email", in: "query", required: true, schema: { type: "string", format: "email" }, example: "partner@example.com" },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        { name: "search", in: "query", schema: { type: "string" }, description: "Search by order_id" },
        { name: "product", in: "query", schema: { type: "string" }, description: "Filter by product type" },
        { name: "order_id", in: "query", schema: { type: "string" } },
      ],
      responses: {
        200: { description: "User commission history with pagination" },
        400: { description: "Email is required" },
      },
    },
  },
  "/api/v1/order-details-external": {
    get: {
      tags: ["External APIs"],
      summary: "Get order details and referral tree externally",
      description: "Lookup comprehensive details and referral customer information for an order.",
      parameters: [
        { name: "email", in: "query", required: true, schema: { type: "string", format: "email" }, example: "user@example.com" },
        { name: "order_id", in: "query", required: true, schema: { type: "string" }, example: "ORD-12345" },
      ],
      responses: {
        200: { description: "Order details and buyer/referral relationship" },
        400: { description: "Missing email or order_id" },
        404: { description: "Order not found" },
      },
    },
  },
  "/api/v1/balance-bank-details-external": {
    get: {
      tags: ["External APIs"],
      summary: "Get user balance and bank details externally",
      description: "Retrieves user's available commission balance, total payouts, and configured bank account info.",
      parameters: [
        { name: "email", in: "query", required: true, schema: { type: "string", format: "email" }, example: "user@example.com" },
        { name: "product", in: "query", schema: { type: "string" }, example: "goldflex" },
      ],
      responses: {
        200: { description: "User balance, payout summaries, and bank info" },
        400: { description: "Email is required" },
        404: { description: "User not found" },
      },
    },
  },
  "/api/v1/bank-details-external": {
    post: {
      tags: ["External APIs"],
      summary: "Add bank details externally",
      description: "Saves or creates bank account information for an external user by email.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
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
          },
        },
      },
      responses: {
        200: { description: "Bank details saved successfully" },
        400: { description: "Email is required" },
      },
    },
    put: {
      tags: ["External APIs"],
      summary: "Update bank details externally",
      description: "Updates existing bank details for a user by email.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: { type: "string", format: "email", example: "user@example.com" },
                ac_holder_name: { type: "string", example: "Max Mustermann" },
                iban: { type: "string", example: "CH9300000000000000000" },
                bic_swift_code: { type: "string", example: "UBSWCHZH" },
                bank_name: { type: "string", example: "UBS Switzerland AG" },
                banks: { type: "object" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Bank details updated successfully" },
      },
    },
  },
  "/api/v1/payout-request-external": {
    post: {
      tags: ["External APIs"],
      summary: "Submit external payout request",
      description: "Submits a payout request for commission balance and generates payout billing PDF.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "amount", "payout_for"],
              properties: {
                email: { type: "string", format: "email", example: "user@example.com" },
                amount: { type: "number", example: 250.00 },
                payout_for: {
                  type: "string",
                  enum: ["easygold_token", "primeinvest", "goldflex", "b2b_dashboard"],
                  example: "goldflex",
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Payout request created and invoice PDF generated" },
        400: { description: "Insufficient balance or invalid parameters" },
      },
    },
    get: {
      tags: ["External APIs"],
      summary: "Get external payout requests list",
      description: "List payout requests submitted by a user with invoice download links.",
      parameters: [
        { name: "email", in: "query", required: true, schema: { type: "string", format: "email" }, example: "user@example.com" },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        { name: "product", in: "query", schema: { type: "string" }, example: "goldflex" },
      ],
      responses: {
        200: { description: "List of payout requests with invoice URLs" },
      },
    },
  },
};
