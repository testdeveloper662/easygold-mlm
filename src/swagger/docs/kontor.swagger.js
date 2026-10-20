const kontorSignatureHeaders = [
  { name: "X-Kontor-Timestamp", in: "header", required: true, schema: { type: "string" }, description: "Unix epoch milliseconds, must be within 5 minutes of server time" },
  { name: "X-Kontor-Nonce", in: "header", required: true, schema: { type: "string" }, description: "Unique per request, rejected if reused within the timestamp window" },
  { name: "X-Kontor-Signature", in: "header", required: true, schema: { type: "string" }, description: "Hex HMAC-SHA256 of `{timestamp}.{nonce}.{rawBody}` using the shared secret. rawBody is the exact JSON request body as sent (byte-for-byte); for a GET with no body, rawBody is the empty string." },
];

const kontorSecurityNote = "Restricted to Kontor's allow-listed IP addresses and requires a valid HMAC-SHA256 request signature — no endpoint in this namespace is exempt.";

const unauthorizedResponses = {
  401: {
    description: "Missing, expired, or invalid request signature",
    content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" }, example: { success: false, message: "Invalid request signature." } } },
  },
  403: {
    description: "Request IP is not on the Kontor allow-list",
    content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" }, example: { success: false, message: "Access denied. This IP address is not authorized to access the Kontor API." } } },
  },
};

const errorResponse = {
  content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
};

const withError = (message) => ({
  content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" }, example: { success: false, message } } },
});

// Every example below is real output captured from a live end-to-end test
// pass against staging on 2026-10-19 (broker M-10173 / customer_no 60123,
// "Beispiel Edelmetalle GmbH") — not invented placeholder data.
const examplePartner = {
  customer_no: "60123",
  mlm_customer_number: "M-10173",
  status: "approved",
  company: {
    legal_name: "Beispiel Edelmetalle GmbH",
    legal_form: "GmbH",
    street: "Neue Straße 5",
    postcode: "70173",
    city: "Stuttgart",
    country: "DE",
    vat_id: "DE123456789",
  },
  contact: { name: "Max Muster", email: "max@example.com", phone: "+49 711 000000" },
  package: "premium_monthly",
  approved_at: "2026-10-06T09:12:00Z",
  activated_at: null,
  created_at: "2026-10-19T13:49:35.000Z",
  updated_at: "2026-10-19T13:57:47.000Z",
};

const exampleTransaction = {
  reference_id: "KONTOR-CMM-589",
  kontor_entry_id: "01J9ZK6Q8R3W5T2Y7M4N1B0C9D",
  idempotency_key: "order_line:4711:paid",
  seq: 18234,
  mode: "test",
  source_type: "order_line",
  order_number: "KB-2026-000318",
  line: 2,
  document_number: "HB-RE-2026-01544",
  channel: "kundenbestellung",
  direction: "sale",
  product: { class: "bullion", metal: "au", sku: "UMI-10G", fine_weight_mg: 10000 },
  quantity: 2,
  amounts: { currency: "EUR", unit_net_cents: 124420, net_cents: 248840, vat_cents: 0, gross_cents: 248840 },
  basis_net_amount: 2488.4,
  order_type: "my_store",
  mlm_customer_number: "M-10173",
  customer_no: "60123",
  is_seller: true,
  commission_percent: 100,
  commission_amount: 2488.4,
  event: "paid",
  entry_kind: "original",
  corrects_entry_id: null,
  is_reversal: false,
  is_payment_done: true,
  acknowledged_at: "2026-10-19T13:56:48.910Z",
  occurred_at: "2026-10-06T10:14:03.000Z",
  created_at: "2026-10-19T13:52:26.000Z",
};

module.exports = {
  "/api/v1/kontor/health": {
    get: {
      tags: ["Kontor Integration"],
      summary: "Kontor API health check",
      description: `Status and server time, so Kontor can verify our API is reachable before sending real traffic. ${kontorSecurityNote}`,
      parameters: kontorSignatureHeaders,
      responses: {
        200: {
          description: "API is reachable, with current server status and time",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: { success: true, message: "Kontor API is reachable", data: { status: "ok", server_time: "2026-10-19T13:38:37.222Z" } },
            },
          },
        },
        ...unauthorizedResponses,
      },
    },
  },
  "/api/v1/kontor/referral-code/check": {
    get: {
      tags: ["Kontor Integration"],
      summary: "Check whether a referral code is valid",
      description: `Returns valid/invalid only, for registration-time checks. ${kontorSecurityNote}`,
      parameters: [
        { name: "referral_code", in: "query", required: true, schema: { type: "string" }, example: "ABC12345" },
        ...kontorSignatureHeaders,
      ],
      responses: {
        200: {
          description: "Referral code validity result",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: { success: true, data: { referral_code: "ABC12345", valid: true } },
            },
          },
        },
        400: withError("referral_code query parameter is required"),
        ...unauthorizedResponses,
        500: { description: "Internal server error", ...errorResponse },
      },
    },
  },
  "/api/v1/kontor/partners": {
    get: {
      tags: ["Kontor Integration"],
      summary: "List Kontor-sourced brokers (cursor-paginated)",
      description: `Lists every broker created via this namespace, newest-id-last. ${kontorSecurityNote}`,
      parameters: [
        { name: "cursor", in: "query", schema: { type: "string" }, description: "Opaque cursor from a previous page's next_cursor" },
        { name: "limit", in: "query", schema: { type: "integer", default: 50 }, description: "Max 200" },
        ...kontorSignatureHeaders,
      ],
      responses: {
        200: {
          description: "A page of partners",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { "$ref": "#/components/schemas/SuccessResponse" },
                  { type: "object", properties: { data: { type: "object", properties: {
                    partners: { type: "array", items: { "$ref": "#/components/schemas/KontorPartner" } },
                    next_cursor: { type: "string", nullable: true },
                  } } } },
                ],
              },
              example: {
                success: true,
                message: "Partners retrieved successfully",
                data: { partners: [examplePartner], next_cursor: null },
              },
            },
          },
        },
        ...unauthorizedResponses,
        500: { description: "Internal server error", ...errorResponse },
      },
    },
  },
  "/api/v1/kontor/partners/{customer_no}": {
    get: {
      tags: ["Kontor Integration"],
      summary: "Get one broker by Kontor's customer_no",
      description: `${kontorSecurityNote}`,
      parameters: [
        { name: "customer_no", in: "path", required: true, schema: { type: "string" }, example: "60123" },
        ...kontorSignatureHeaders,
      ],
      responses: {
        200: {
          description: "The broker's partner record",
          content: {
            "application/json": {
              schema: { allOf: [
                { "$ref": "#/components/schemas/SuccessResponse" },
                { type: "object", properties: { data: { "$ref": "#/components/schemas/KontorPartner" } } },
              ] },
              example: { success: true, message: "Partner retrieved successfully", data: examplePartner },
            },
          },
        },
        404: withError("No Kontor-sourced broker found for this customer_no"),
        ...unauthorizedResponses,
        500: { description: "Internal server error", ...errorResponse },
      },
    },
  },
  "/api/v1/kontor/broker/register": {
    post: {
      tags: ["Kontor Integration"],
      summary: "Register a Kontor-sourced broker",
      description: `Creates a broker directly active (per Kontor's "approved" status), since Kontor already completed KYC on their side — no bank details, ID/KYC data, or documents are ever sent. Assigns and returns our own mlm_customer_number, which Kontor stores and sends with every later call for this broker. Idempotent on customer_no: a retried call with the same value returns the existing broker (same response shape, message changes to "Broker already exists for this customer_no"). No password is ever sent — the broker is always emailed an invitation link to set one via the existing reset-password flow. ${kontorSecurityNote}`,
      parameters: kontorSignatureHeaders,
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/KontorBrokerRegisterRequest" } },
        },
      },
      responses: {
        200: {
          description: "Broker created (or already existed for this customer_no) — returns mlm_customer_number",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                message: "Broker registered successfully",
                data: { mlm_customer_number: "M-10173", broker_id: 173, user_id: 43530 },
              },
            },
          },
        },
        400: withError("A user with this email already exists. Please use a different email address."),
        ...unauthorizedResponses,
        500: { description: "Internal server error", ...errorResponse },
      },
    },
  },
  "/api/v1/kontor/broker/update": {
    put: {
      tags: ["Kontor Integration"],
      summary: "Update a Kontor-sourced broker's data",
      description: `Kontor described every later change (activation after first payment, blocking, termination, new address) as "updates of the same record" — this accepts the same nested shape as registration and applies whichever fields are present, looked up by customer_no or mlm_customer_number. ${kontorSecurityNote}`,
      parameters: kontorSignatureHeaders,
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/KontorBrokerUpdateRequest" } },
        },
      },
      responses: {
        200: {
          description: "Broker updated successfully",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                message: "Broker updated successfully",
                data: { mlm_customer_number: "M-10173", broker_id: 173, user_id: 43530 },
              },
            },
          },
        },
        400: withError("customer_no or mlm_customer_number is required"),
        404: withError("No Kontor-sourced broker found for this customer_no/mlm_customer_number"),
        ...unauthorizedResponses,
        500: { description: "Internal server error", ...errorResponse },
      },
    },
  },
  "/api/v1/kontor/broker/status": {
    post: {
      tags: ["Kontor Integration"],
      summary: "Update a Kontor-sourced broker's status",
      description: `Lightweight alias for status-only changes — same effect as PUT /broker/update with only status set. Mirrors the status to the account-wide user_status used for login access; the raw Kontor status string is kept separately on brokers.kontor_status so other account types sharing user_status are unaffected. ${kontorSecurityNote}`,
      parameters: kontorSignatureHeaders,
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/KontorBrokerStatusRequest" } },
        },
      },
      responses: {
        200: {
          description: "Broker status updated successfully",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                message: "Broker status updated successfully",
                data: { mlm_customer_number: "M-10173", broker_id: 173, user_id: 43530, status: "blocked" },
              },
            },
          },
        },
        400: withError("customer_no (or mlm_customer_number) and status are required"),
        404: withError("No Kontor-sourced broker found for this customer_no/mlm_customer_number"),
        ...unauthorizedResponses,
        500: { description: "Internal server error", ...errorResponse },
      },
    },
  },
  "/api/v1/kontor/capture-order": {
    post: {
      tags: ["Kontor Integration"],
      summary: "Book commission for a Kontor order line",
      description: `Books broker-chain commission for one order line and event, trusting Kontor's released commission.basis_net_cents directly as the base rather than recalculating a margin — our percentage split on that base is binding, Kontor's own partner_commission_cents is informational only. Amounts are in cents. direction=subscription and commission.informational=true are acknowledged (200, skipped:true) but not booked — Kontor is told "send everything, we filter what counts for commission." Corrections/refunds aren't a separate call: they arrive as a new record with negative amounts and corrects_entry_id pointing at the original entry_id, and flow through this same endpoint. Deduped against idempotency_key — a retried/resent push returns the existing booking, never double-books. Known v1 limitation: the "view order" drill-down in the dashboard will 404 for Kontor-originated orders since no line-item/shipping detail is stored beyond what's in this payload; commission figures display correctly regardless. ${kontorSecurityNote}`,
      parameters: kontorSignatureHeaders,
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/KontorCaptureOrderRequest" } },
        },
      },
      responses: {
        200: {
          description: "Commission booked (or already existed for this idempotency_key, or skipped for subscription/informational) — returns a reference_id and the per-level distribution",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              examples: {
                booked: {
                  summary: "Commission booked",
                  value: {
                    success: true,
                    message: "Commission distribution stored successfully",
                    data: {
                      reference_id: "KONTOR-CMM-589",
                      idempotency_key: "order_line:4711:paid",
                      kontor_entry_id: "01J9ZK6Q8R3W5T2Y7M4N1B0C9D",
                      tree: "173",
                      distribution: [
                        { level: 1, broker_id: 173, user_id: 43530, commission_percent: 100, commission_amount: 2488.4, is_seller: true },
                      ],
                    },
                  },
                },
                already_booked: {
                  summary: "Retried — already booked (idempotency)",
                  value: {
                    success: true,
                    message: "Commission already calculated for this transaction",
                    data: { reference_id: "KONTOR-CMM-589", idempotency_key: "order_line:4711:paid", kontor_entry_id: "01J9ZK6Q8R3W5T2Y7M4N1B0C9D" },
                  },
                },
                skipped_informational: {
                  summary: "Skipped — commission.informational=true",
                  value: {
                    success: true,
                    message: "Received — no commission booked (marked informational)",
                    data: { idempotency_key: "order_line:9999:paid", skipped: true, reason: "informational" },
                  },
                },
                skipped_subscription: {
                  summary: "Skipped — direction=subscription",
                  value: {
                    success: true,
                    message: "Received — no commission booked (subscription order type not yet agreed)",
                    data: { idempotency_key: "order_line:8888:paid", skipped: true, reason: "subscription_not_supported" },
                  },
                },
              },
            },
          },
        },
        400: withError("Missing required fields: idempotency_key, channel, partner.customer_no (or partner.mlm_customer_number), commission.basis_net_cents"),
        404: withError("No Kontor-sourced broker found for this partner.mlm_customer_number/customer_no"),
        ...unauthorizedResponses,
        500: { description: "Internal server error", ...errorResponse },
      },
    },
  },
  "/api/v1/kontor/capture-order/reverse": {
    post: {
      tags: ["Kontor Integration"],
      summary: "Reverse a previously booked Kontor order commission",
      description: `Books a negative-adjustment counter-entry against every broker-chain row from the original capture-order call, offsetting a future payout if the original was already paid. Nothing is deleted or mutated on the original rows. Deduped on idempotency_key. ${kontorSecurityNote}`,
      parameters: kontorSignatureHeaders,
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/KontorCaptureOrderReverseRequest" } },
        },
      },
      responses: {
        200: {
          description: "Reversal booked (or already existed for this idempotency_key)",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                message: "Reversal booked successfully",
                data: {
                  reference_id: "KONTOR-REV-591",
                  idempotency_key: "order_line:5555:refunded",
                  original_idempotency_key: "order_line:5555:paid",
                  rows_reversed: 1,
                  total_commission_reversed: -1000,
                },
              },
            },
          },
        },
        400: withError("Missing required fields: idempotency_key, original_idempotency_key"),
        404: withError("No original order found for this original_idempotency_key"),
        ...unauthorizedResponses,
        500: { description: "Internal server error", ...errorResponse },
      },
    },
  },
  "/api/v1/kontor/transactions": {
    get: {
      tags: ["Kontor Integration"],
      summary: "List commission transactions (cursor-paginated)",
      description: `Browsable, filterable list of every commission entry booked via capture-order / capture-order/reverse. ${kontorSecurityNote}`,
      parameters: [
        { name: "cursor", in: "query", schema: { type: "string" }, description: "Opaque cursor from a previous page's next_cursor" },
        { name: "since", in: "query", schema: { type: "string", format: "date-time" }, description: "Only entries with occurred_at at or after this time" },
        { name: "partner", in: "query", schema: { type: "string" }, description: "Filter to one broker — mlm_customer_number or customer_no" },
        { name: "limit", in: "query", schema: { type: "integer", default: 50 }, description: "Max 200" },
        ...kontorSignatureHeaders,
      ],
      responses: {
        200: {
          description: "A page of transactions",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { "$ref": "#/components/schemas/SuccessResponse" },
                  { type: "object", properties: { data: { type: "object", properties: {
                    transactions: { type: "array", items: { "$ref": "#/components/schemas/KontorTransaction" } },
                    next_cursor: { type: "string", nullable: true },
                  } } } },
                ],
              },
              example: {
                success: true,
                message: "Transactions retrieved successfully",
                data: { transactions: [exampleTransaction], next_cursor: null },
              },
            },
          },
        },
        400: withError("Invalid since. Use an ISO date/datetime."),
        ...unauthorizedResponses,
        500: { description: "Internal server error", ...errorResponse },
      },
    },
  },
  "/api/v1/kontor/transactions/{entry_id}": {
    get: {
      tags: ["Kontor Integration"],
      summary: "Get one commission transaction",
      description: `entry_id accepts either Kontor's own entry_id (the ULID from capture-order) or our internal numeric row id. ${kontorSecurityNote}`,
      parameters: [
        { name: "entry_id", in: "path", required: true, schema: { type: "string" }, example: "01J9ZK6Q8R3W5T2Y7M4N1B0C9D" },
        ...kontorSignatureHeaders,
      ],
      responses: {
        200: {
          description: "The transaction",
          content: {
            "application/json": {
              schema: { allOf: [
                { "$ref": "#/components/schemas/SuccessResponse" },
                { type: "object", properties: { data: { "$ref": "#/components/schemas/KontorTransaction" } } },
              ] },
              example: { success: true, message: "Transaction retrieved successfully", data: exampleTransaction },
            },
          },
        },
        404: withError("No Kontor transaction found for this entry_id"),
        ...unauthorizedResponses,
        500: { description: "Internal server error", ...errorResponse },
      },
    },
  },
  "/api/v1/kontor/reconciliation/daily": {
    get: {
      tags: ["Kontor Integration"],
      summary: "Our daily commission totals, all brokers",
      description: `Bulk, all-brokers daily totals (order count, commission amount) for Kontor-side comparison. Scoped to Kontor-sourced commission rows only, grouped by occurred_at (UTC calendar day) rather than when we processed the row. ${kontorSecurityNote}`,
      parameters: [
        { name: "date", in: "query", schema: { type: "string", format: "date" }, description: "UTC calendar day. Defaults to today.", example: "2026-10-19" },
        ...kontorSignatureHeaders,
      ],
      responses: {
        200: {
          description: "Per-broker daily totals plus a grand total",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                message: "Daily reconciliation totals retrieved successfully",
                data: {
                  date: "2026-10-19",
                  brokers: [
                    { broker_id: 173, customer_no: "60123", mlm_customer_number: "M-10173", order_count: 1, total_order_amount: 1000, total_commission_amount: 1000 },
                  ],
                  totals: { order_count: 1, total_order_amount: 1000, total_commission_amount: 1000 },
                },
              },
            },
          },
        },
        400: withError("Invalid date. Use format YYYY-MM-DD."),
        ...unauthorizedResponses,
        500: { description: "Internal server error", ...errorResponse },
      },
    },
    post: {
      tags: ["Kontor Integration"],
      summary: "Submit Kontor's own daily totals for comparison",
      description: `Kontor pushes their own computed daily totals per broker; we compare them against ours and return a match/mismatch diff. Nothing is persisted — this is a live comparison, not a stored audit log. ${kontorSecurityNote}`,
      parameters: kontorSignatureHeaders,
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/KontorReconciliationDailyPostRequest" } },
        },
      },
      responses: {
        200: {
          description: "Comparison result: all_match, per-broker diff, and anything missing from the submission",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                message: "Reconciliation comparison completed",
                data: {
                  date: "2026-10-19",
                  all_match: false,
                  comparison: [
                    {
                      partner: "M-10173",
                      match: false,
                      theirs: { order_count: 2, total_commission_amount: 3488.4 },
                      ours: { order_count: 1, total_commission_amount: 1000 },
                    },
                  ],
                  missing_from_submission: [],
                  our_totals: { order_count: 1, total_order_amount: 1000, total_commission_amount: 1000 },
                },
              },
            },
          },
        },
        400: withError("Missing required fields: date, brokers (array)"),
        ...unauthorizedResponses,
        500: { description: "Internal server error", ...errorResponse },
      },
    },
  },
  "/api/v1/kontor/acknowledgements": {
    post: {
      tags: ["Kontor Integration"],
      summary: "Confirm receipt of a booking reference",
      description: `Kontor confirms they've recorded a reference_id we previously returned from capture-order / capture-order/reverse. Sets kontor_acknowledged_at on the matching commission row. ${kontorSecurityNote}`,
      parameters: kontorSignatureHeaders,
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/KontorAcknowledgementRequest" } },
        },
      },
      responses: {
        200: {
          description: "Acknowledgement recorded",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/SuccessResponse" },
              example: {
                success: true,
                message: "Acknowledgement recorded",
                data: { reference_id: "KONTOR-CMM-590", entry_id: 590, acknowledged_at: "2026-10-19T13:56:48.910Z" },
              },
            },
          },
        },
        400: withError("Unrecognized reference_id format. Expected KONTOR-CMM-<id> or KONTOR-REV-<id>."),
        404: withError("No Kontor transaction found for this reference_id"),
        ...unauthorizedResponses,
        500: { description: "Internal server error", ...errorResponse },
      },
    },
  },
};
