// Example response fragments are built directly from the real res.status(200).json(...)
// payloads in the controllers under src/controller/external/ — field names and shapes
// (including the "email not found still returns 200" branches) match those controllers
// exactly, not guessed from the schema refs used elsewhere in this file.
const exampleCommissionHistoryRow = {
  id: 881,
  broker_id: 173,
  user_id: 43530,
  order_id: "ORD-99824",
  order_type: "goldflex",
  order_amount: 1000,
  profit_amount: 245.5,
  commission_percent: 60,
  commission_amount: 147.3,
  tree: "173->150",
  is_seller: true,
  is_payment_done: true,
  is_payment_declined: false,
  selected_payment_method: 1,
  choose_payment_option: 1,
  target_customer_log_id: null,
  is_send_bonus: false,
  is_deleted: false,
  commission_type: null,
  notes: null,
  product_type: "product",
  source: null,
  kontor_acknowledged_at: null,
  kontor_entry_id: null,
  occurred_at: null,
  kontor_mode: null,
  kontor_idempotency_key: null,
  createdAt: "2026-10-06T10:14:03.000Z",
  updatedAt: "2026-10-06T10:14:03.000Z",
};

const examplePayoutRequest = {
  id: 42,
  broker_id: 173,
  user_id: 43530,
  amount: 250,
  invoice: "/payouts/payout_00042.pdf",
  payout_for: "GOLDFLEX",
  status: "PENDING",
  rejection_reason: null,
  createdAt: "2026-10-19T13:49:35.000Z",
  updatedAt: "2026-10-19T13:49:35.000Z",
};

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
        200: {
          description: "User commission history with pagination",
          content: {
            "application/json": {
              examples: {
                found: {
                  summary: "Email matches an existing user",
                  value: {
                    success: true,
                    role_id: 2,
                    role: "BROKER",
                    isbroker: true,
                    isaffiliate: true,
                    iscustomer: false,
                    data: [exampleCommissionHistoryRow],
                    pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
                  },
                },
                email_not_found: {
                  summary: "No user with this email — still a 200, empty data",
                  value: {
                    success: true,
                    role_id: null,
                    role: null,
                    isbroker: false,
                    isaffiliate: false,
                    data: [],
                    pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
                  },
                },
              },
            },
          },
        },
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
        200: {
          description: "Order details and buyer/referral relationship",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  order_id: "ORD-99824",
                  order_type: "goldflex",
                  order_amount: 1000,
                  profit_amount: 245.5,
                  createdAt: "2026-10-06T10:14:03.000Z",
                  updatedAt: "2026-10-06T10:14:03.000Z",
                  tree: "173->150",
                  payment_type: "Bank Transfer",
                  broker_commissions: [
                    {
                      broker_id: 173,
                      user_id: 43530,
                      user_email: "max@example.com",
                      commission_percent: 60,
                      commission_amount: 147.3,
                      is_seller: true,
                      is_payment_done: true,
                      is_payment_declined: false,
                      tree: "173->150",
                    },
                  ],
                  commission_devided: false,
                  referralLog: {
                    fromCustomer: null,
                    toCustomer: { id: 58, customer_name: "Lena Beispiel", customer_email: "lena@example.com", telephone: "+49 711 1234567" },
                  },
                  customer: { id: 58, customer_name: "Lena Beispiel", customer_email: "lena@example.com", telephone: "+49 711 1234567" },
                  referrer: null,
                },
              },
            },
          },
        },
        400: { description: "Missing email or order_id" },
        404: { description: "Order not found" },
      },
    },
  },
  "/api/v1/balance-bank-details-external": {
    get: {
      tags: ["External APIs"],
      summary: "Get user balance and bank details externally",
      description: "Retrieves user's available commission balance, total payouts, and configured bank account info. An unknown email returns 200 with data: null, not a 404.",
      parameters: [
        { name: "email", in: "query", required: true, schema: { type: "string", format: "email" }, example: "user@example.com" },
        { name: "product", in: "query", schema: { type: "string" }, example: "goldflex" },
      ],
      responses: {
        200: {
          description: "User balance, payout summaries, and bank info (data: null if the email isn't found)",
          content: {
            "application/json": {
              examples: {
                found: {
                  summary: "Email matches an existing user",
                  value: {
                    success: true,
                    role_id: 2,
                    role: "BROKER",
                    isbroker: true,
                    isaffiliate: true,
                    iscustomer: false,
                    data: {
                      bank_details: {
                        sepa: [{ account_holder: "Max Mustermann", bank_name: "UBS Switzerland AG", iban: "CH9300000000000000000", bic_swift: "UBSWCHZH", bank_address: "" }],
                        swift: [],
                        ach: [],
                      },
                      balance: 532.8,
                    },
                  },
                },
                email_not_found: {
                  summary: "No user with this email — data is null, not a 404",
                  value: {
                    success: true,
                    role_id: null,
                    role: null,
                    isbroker: false,
                    isaffiliate: false,
                    data: null,
                  },
                },
              },
            },
          },
        },
        400: { description: "Email is required" },
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
          "application/json": { schema: { "$ref": "#/components/schemas/ExternalBankDetailRequest" } },
        },
      },
      responses: {
        200: {
          description: "Bank details saved successfully",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Bank details updated successfully.",
                data: { user_id: 43530, ac_holder_name: "Max Mustermann", iban: "CH9300000000000000000", bic_swift_code: "UBSWCHZH", bank_name: "UBS Switzerland AG" },
              },
            },
          },
        },
        400: { description: "Email is required" },
        404: {
          description: "User not found with this email",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
    put: {
      tags: ["External APIs"],
      summary: "Update bank details externally",
      description: "Updates existing bank details for a user by email.",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/ExternalBankDetailRequest" } },
        },
      },
      responses: {
        200: {
          description: "Bank details updated successfully",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Bank details updated successfully.",
                data: { user_id: 43530, ac_holder_name: "Max Mustermann", iban: "CH9300000000000000000", bic_swift_code: "UBSWCHZH", bank_name: "UBS Switzerland AG" },
              },
            },
          },
        },
        400: {
          description: "Email is required",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        404: {
          description: "User not found",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
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
          "application/json": { schema: { "$ref": "#/components/schemas/ExternalPayoutRequestCreate" } },
        },
      },
      responses: {
        200: {
          description: "Payout request created and invoice PDF generated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Payout request created successfully.",
                data: examplePayoutRequest,
              },
            },
          },
        },
        400: { description: "Insufficient balance or invalid parameters" },
        404: {
          description: "User not found",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
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
        200: {
          description: "List of payout requests with invoice URLs",
          content: {
            "application/json": {
              example: {
                success: true,
                role_id: 2,
                role: "BROKER",
                data: [{ ...examplePayoutRequest, invoice_path: "http://localhost:4000/payouts/payout_00042.pdf" }],
                pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
              },
            },
          },
        },
        400: {
          description: "Email is required",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        404: {
          description: "User not found",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
};
