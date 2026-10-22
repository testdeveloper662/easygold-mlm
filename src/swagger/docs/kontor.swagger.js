const kontorSignatureHeaders = [
  { name: "X-Kontor-Timestamp", in: "header", required: true, schema: { type: "string" }, description: "Unix epoch milliseconds, must be within 5 minutes of server time" },
  { name: "X-Kontor-Nonce", in: "header", required: true, schema: { type: "string" }, description: "Unique per request, rejected if reused within the timestamp window" },
  { name: "X-Kontor-Signature", in: "header", required: true, schema: { type: "string" }, description: "Hex HMAC-SHA256 of `{timestamp}.{nonce}.{rawBody}` using the shared secret. rawBody is the exact JSON request body as sent (byte-for-byte); for a GET with no body, rawBody is the empty string." },
];

const idempotencyKeyHeader = {
  name: "Idempotency-Key",
  in: "header",
  required: false,
  schema: { type: "string" },
  description: "Same value as the body's idempotency_key, per convention — the body field is authoritative if both are sent.",
};

const kontorSecurityNote = "Restricted to Kontor's allow-listed IP addresses and requires a valid HMAC-SHA256 request signature — no endpoint in this namespace is exempt.";

const unauthorizedResponses = {
  401: {
    description: "Missing, expired, or invalid request signature",
    content: { "application/json": { schema: { "$ref": "#/components/schemas/KontorErrorResponse" }, example: { success: false, code: "UNAUTHORIZED", message: "Invalid request signature." } } },
  },
  403: {
    description: "Request IP is not on the Kontor allow-list",
    content: { "application/json": { schema: { "$ref": "#/components/schemas/KontorErrorResponse" }, example: { success: false, code: "FORBIDDEN", message: "Access denied. Your IP address (203.0.113.42) is not whitelisted for the Kontor API. Please share this exact IP with the EasyGold team to get it added." } } },
  },
};

const withKontorError = (description, code, message) => ({
  description,
  content: { "application/json": { schema: { "$ref": "#/components/schemas/KontorErrorResponse" }, example: { success: false, code, message } } },
});

const internalErrorResponse = withKontorError("Internal server error", "INTERNAL_ERROR", "Internal server error");

// Every example below is real output captured from a live end-to-end test
// pass against staging on 2026-10-20 (broker_id 174 / external_ref 70001,
// "Chris Test GmbH 70001") — not invented placeholder data.
const examplePartner = {
  broker_id: 174,
  external_ref: "70001",
  mlm_customer_number: "M-10174",
  status: "activated",
  company: {
    legal_name: "Chris Test GmbH 70001",
    legal_form: "GmbH",
    street: "Teststrasse 5",
    postcode: "70174",
    city: "Stuttgart",
    country: "DE",
    vat_id: "DE999999999",
    vat_id_verified_at: "2026-10-05T14:00:00Z",
    tax_number: "TX-12345",
  },
  contact: { name: "Test Contact", email: "test70001@example.com", phone: "+49 711 111111" },
  bank_on_file: true,
  package: "premium_monthly",
  approved_at: "2026-10-06T09:12:00Z",
  created_at: "2026-10-20T10:50:56.000Z",
  updated_at: "2026-10-20T10:53:27.000Z",
};

const exampleTransaction = {
  reference: "MLM-TX-000594",
  entry_id: "01TEST0000FRESH0000000002",
  idempotency_key: "order_line:9002:1:paid",
  broker_id: 174,
  external_ref: "70001",
  orderType: "my_store",
  event: "paid",
  order: { number: "KB-2026-TEST2", line: 1, document_number: "HB-RE-TEST2", channel: "kundenbestellung", direction: "sale", seller: "house", customer_type: "b2c", customer_country: "DE" },
  product: { name: "Test Goldbarren 10 g", sku: "UMI-10G", class: "bullion", metal: "au", fine_weight_mg: 10000, quantity: 2 },
  amounts: { currency: "EUR", unit_net_cents: 124420, net_cents: 248840, vat_cents: 0, gross_cents: 248840, vat_rate_bp: 0, tax_case: "domestic_exempt_gold" },
  basis_net_amount: 2488.4,
  is_seller: true,
  commission_percent: 100,
  commission_amount: 2488.4,
  corrects_entry_id: null,
  corrects_reference: null,
  is_reversal: false,
  is_payment_done: true,
  acknowledged_at: null,
  occurred_at: "2026-10-20T10:14:03.000Z",
  created_at: "2026-10-20T10:54:51.000Z",
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
              example: { success: true, message: "Kontor API is reachable", data: { status: "ok", server_time: "2026-10-20T10:50:00.000Z" } },
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
      description: `Returns valid/invalid only, for registration-time checks. Checks our own referral code system (used by referralCode on /broker/register), not a Kontor-side code. ${kontorSecurityNote}`,
      parameters: [
        { name: "referral_code", in: "query", required: true, schema: { type: "string" }, example: "GS-4F7K" },
        ...kontorSignatureHeaders,
      ],
      responses: {
        200: {
          description: "Referral code validity result",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/SuccessResponse" }, example: { success: true, data: { referral_code: "GS-4F7K", valid: true } } } },
        },
        400: withKontorError("referral_code query parameter is required", "VALIDATION_ERROR", "referral_code query parameter is required"),
        ...unauthorizedResponses,
        500: internalErrorResponse,
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
              example: { success: true, data: { partners: [examplePartner], next_cursor: null } },
            },
          },
        },
        ...unauthorizedResponses,
        500: internalErrorResponse,
      },
    },
  },
  "/api/v1/kontor/partners/{external_ref}": {
    get: {
      tags: ["Kontor Integration"],
      summary: "Get one broker by broker_id or external_ref",
      description: `Accepts our own broker_id or Kontor's external_ref in the same path segment (external_ref can itself be numeric-looking, e.g. "70001" — both are tried). ${kontorSecurityNote}`,
      parameters: [
        { name: "external_ref", in: "path", required: true, schema: { type: "string" }, description: "broker_id or external_ref", example: "174" },
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
              example: { success: true, data: examplePartner },
            },
          },
        },
        404: withKontorError("No Kontor-sourced broker found for this broker_id/external_ref", "NOT_FOUND", "No Kontor-sourced broker found for this broker_id/external_ref"),
        ...unauthorizedResponses,
        500: internalErrorResponse,
      },
    },
  },
  "/api/v1/kontor/broker/register": {
    post: {
      tags: ["Kontor Integration"],
      summary: "Register a Kontor-sourced broker",
      description: `Creates a broker directly active (per Kontor's "activated" status), since Kontor already completed KYC on their side. Returns our own broker_id, which Kontor uses to reference this broker on every later call (capture-order, status, etc.) — external_ref is accepted as a fallback. Idempotent on external_ref: a retried call with the same value returns the existing broker with created:false. No password is ever sent — the broker is always emailed an invitation link to set one via the existing reset-password flow. Bank details, when sent, are stored AES-256-GCM encrypted and never returned in any read response. ${kontorSecurityNote}`,
      parameters: kontorSignatureHeaders,
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/KontorBrokerRegisterRequest" } },
        },
      },
      responses: {
        200: {
          description: "Broker created (or already existed for this external_ref, created:false)",
          content: {
            "application/json": {
              schema: { type: "object", properties: { success: { type: "boolean" }, broker_id: { type: "integer" }, user_id: { type: "integer" }, created: { type: "boolean" } } },
              example: { success: true, broker_id: 174, user_id: 43531, created: true },
            },
          },
        },
        400: withKontorError("Missing required fields, invalid referralCode, or email/company already taken", "VALIDATION_ERROR", "Missing required fields: external_ref, status, company.legal_name, company.postcode, company.city, company.country, contact.name, contact.email"),
        ...unauthorizedResponses,
        500: internalErrorResponse,
      },
    },
  },
  "/api/v1/kontor/broker/update": {
    put: {
      tags: ["Kontor Integration"],
      summary: "Update a Kontor-sourced broker's data",
      description: `Kontor described every later change (activation after first payment, blocking, termination, new address, bank details) as "updates of the same record" — this accepts the same nested shape as registration and applies whichever fields are present, looked up by broker_id or external_ref. ${kontorSecurityNote}`,
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
          content: { "application/json": { example: { success: true, broker_id: 174, user_id: 43531 } } },
        },
        400: withKontorError("broker_id or external_ref is required", "VALIDATION_ERROR", "broker_id or external_ref is required"),
        404: withKontorError("No Kontor-sourced broker found for this broker_id/external_ref", "NOT_FOUND", "No Kontor-sourced broker found for this broker_id/external_ref"),
        ...unauthorizedResponses,
        500: internalErrorResponse,
      },
    },
  },
  "/api/v1/kontor/broker/status": {
    post: {
      tags: ["Kontor Integration"],
      summary: "Update a Kontor-sourced broker's status",
      description: `Lightweight alias for status-only changes — same effect as PUT /broker/update with only status (+ effective_at/reason_key/lang) set. Mirrors the status to the account-wide user_status used for login access; the raw Kontor status string is kept separately on brokers.kontor_status so other account types sharing user_status are unaffected. ${kontorSecurityNote}`,
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
          content: { "application/json": { example: { success: true, broker_id: 174, user_id: 43531, status: "blocked" } } },
        },
        400: withKontorError("broker_id (or external_ref) and status are required", "VALIDATION_ERROR", "broker_id (or external_ref) and status are required"),
        404: withKontorError("No Kontor-sourced broker found for this broker_id/external_ref", "NOT_FOUND", "No Kontor-sourced broker found for this broker_id/external_ref"),
        ...unauthorizedResponses,
        500: internalErrorResponse,
      },
    },
  },
  "/api/v1/kontor/capture-order": {
    post: {
      tags: ["Kontor Integration"],
      summary: "Book commission for a Kontor order line",
      description: `Books broker-chain commission for one order line and event, trusting Kontor's released commission.basis_net_cents directly as the base rather than recalculating a margin — our percentage split on that base is binding, Kontor's own partner_commission_cents (and commission_rate_bp for subscriptions) is informational only. Amounts are in cents; orderType is sent directly by Kontor (no channel mapping on our side). Every pushed event is booked, including subscriptions (commission-eligible from day one — the parent partner always earns on them) — commission.informational:true describes partner_commission_cents specifically, it is not a skip signal. Corrections/refunds aren't a separate call: they arrive as a new record with negative amounts and corrects_entry_id pointing at the original entry_id, and flow through this same endpoint — the reversal's own commission.basis_net_cents is what gets distributed (handles a partial reversal correctly, not a blanket negation). Deduped against idempotency_key — a retried/resent push returns the existing booking, never double-books. Known v1 limitation: the "view order" drill-down in the dashboard will 404 for Kontor-originated orders since no line-item/shipping detail is stored beyond what's in this payload; commission figures display correctly regardless. ${kontorSecurityNote}`,
      parameters: [...kontorSignatureHeaders, idempotencyKeyHeader],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/KontorCaptureOrderRequest" } },
        },
      },
      responses: {
        200: {
          description: "Commission booked (or already existed for this idempotency_key) — returns a reference and the per-level distribution",
          content: {
            "application/json": {
              example: {
                success: true,
                reference: "MLM-TX-000594",
                distribution: [
                  { level: 1, broker_id: 174, user_id: 43531, commission_percent: 100, commission_amount: 2488.4, is_seller: true },
                ],
              },
            },
          },
        },
        400: withKontorError("Missing required fields or non-numeric commission.basis_net_cents", "VALIDATION_ERROR", "Missing required fields: idempotency_key, orderType, broker_id (or external_ref), commission.basis_net_cents"),
        404: withKontorError("No Kontor-sourced broker found for this broker_id/external_ref", "NOT_FOUND", "No Kontor-sourced broker found for this broker_id/external_ref"),
        409: withKontorError("entry_id collides with an existing, unrelated booking (should not happen with real ULIDs)", "ALREADY_EXISTS", "entry_id conflicts with an existing, unrelated booking."),
        ...unauthorizedResponses,
        500: internalErrorResponse,
      },
    },
  },
  "/api/v1/kontor/capture-order/reverse": {
    post: {
      tags: ["Kontor Integration"],
      summary: "Reverse a previously booked Kontor order commission",
      description: `Books a negative-adjustment counter-entry against every broker-chain row from the original capture-order call, offsetting a future payout. Looked up via corrects_entry_id (Kontor's ULID) or corrects_reference (our MLM-TX-<id>) — either works. Nothing is deleted or mutated on the original rows. Deduped on idempotency_key. ${kontorSecurityNote}`,
      parameters: [...kontorSignatureHeaders, idempotencyKeyHeader],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/KontorCaptureOrderReverseRequest" } },
        },
      },
      responses: {
        200: {
          description: "Reversal booked (or already existed for this idempotency_key)",
          content: { "application/json": { example: { success: true, reference: "MLM-TX-000595", offset_against_payout: true } } },
        },
        400: withKontorError("Missing required fields", "VALIDATION_ERROR", "Missing required fields: idempotency_key, corrects_entry_id (or corrects_reference)"),
        404: withKontorError("No original booking found for this corrects_entry_id/corrects_reference", "NOT_FOUND", "No original booking found for this corrects_entry_id/corrects_reference"),
        409: withKontorError("entry_id collides with an existing, unrelated booking", "ALREADY_EXISTS", "entry_id conflicts with an existing, unrelated booking."),
        ...unauthorizedResponses,
        500: internalErrorResponse,
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
        { name: "partner", in: "query", schema: { type: "string" }, description: "Filter to one broker — broker_id or external_ref" },
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
              example: { success: true, data: { transactions: [exampleTransaction], next_cursor: null } },
            },
          },
        },
        400: withKontorError("Invalid since", "VALIDATION_ERROR", "Invalid since. Use an ISO date/datetime."),
        ...unauthorizedResponses,
        500: internalErrorResponse,
      },
    },
  },
  "/api/v1/kontor/transactions/{entry_id}": {
    get: {
      tags: ["Kontor Integration"],
      summary: "Get one commission transaction",
      description: `entry_id accepts Kontor's own entry_id (ULID), our MLM-TX-<id> reference, or our internal numeric row id. ${kontorSecurityNote}`,
      parameters: [
        { name: "entry_id", in: "path", required: true, schema: { type: "string" }, example: "MLM-TX-000594" },
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
              example: { success: true, data: exampleTransaction },
            },
          },
        },
        404: withKontorError("No Kontor transaction found for this entry_id", "NOT_FOUND", "No Kontor transaction found for this entry_id"),
        ...unauthorizedResponses,
        500: internalErrorResponse,
      },
    },
  },
  "/api/v1/kontor/reconciliation/daily": {
    get: {
      tags: ["Kontor Integration"],
      summary: "Our daily commission totals, all brokers",
      description: `Bulk, all-brokers daily totals (order count, commission amount) for Kontor-side comparison. Scoped to Kontor-sourced commission rows only, grouped by occurred_at (UTC calendar day) rather than when we processed the row. ${kontorSecurityNote}`,
      parameters: [
        { name: "date", in: "query", schema: { type: "string", format: "date" }, description: "UTC calendar day. Defaults to today.", example: "2026-10-20" },
        ...kontorSignatureHeaders,
      ],
      responses: {
        200: {
          description: "Per-broker daily totals plus a grand total",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  date: "2026-10-20",
                  brokers: [{ broker_id: 174, external_ref: "70001", mlm_customer_number: "M-10174", order_count: 3, total_order_amount: 2488.4, total_commission_amount: 2488.4 }],
                  totals: { order_count: 3, total_order_amount: 2488.4, total_commission_amount: 2488.4 },
                },
              },
            },
          },
        },
        400: withKontorError("Invalid date. Use format YYYY-MM-DD.", "VALIDATION_ERROR", "Invalid date. Use format YYYY-MM-DD."),
        ...unauthorizedResponses,
        500: internalErrorResponse,
      },
    },
    post: {
      tags: ["Kontor Integration"],
      summary: "Submit Kontor's own daily totals for comparison",
      description: `Kontor pushes their own computed daily totals per broker (keyed by broker_id or external_ref); we compare them against ours and return a match/mismatch diff. Nothing is persisted — this is a live comparison, not a stored audit log. ${kontorSecurityNote}`,
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
              example: {
                success: true,
                date: "2026-10-20",
                all_match: true,
                comparison: [{ partner: 174, match: true, theirs: { order_count: 3, total_commission_amount: 2488.4 }, ours: { order_count: 3, total_commission_amount: 2488.4 } }],
                missing_from_submission: [],
                our_totals: { order_count: 3, total_order_amount: 2488.4, total_commission_amount: 2488.4 },
              },
            },
          },
        },
        400: withKontorError("Missing required fields: date, brokers (array)", "VALIDATION_ERROR", "Missing required fields: date, brokers (array)"),
        ...unauthorizedResponses,
        500: internalErrorResponse,
      },
    },
  },
  "/api/v1/kontor/acknowledgements": {
    post: {
      tags: ["Kontor Integration"],
      summary: "Confirm receipt of a booking reference",
      description: `Kontor confirms they've recorded a reference we previously returned from capture-order / capture-order/reverse (format MLM-TX-<id>, same for both). Sets kontor_acknowledged_at on the matching commission row. ${kontorSecurityNote}`,
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
          content: { "application/json": { example: { success: true, reference: "MLM-TX-000594", acknowledged_at: "2026-10-20T10:55:35.009Z" } } },
        },
        400: withKontorError("Missing or unrecognized reference format", "VALIDATION_ERROR", "Unrecognized reference format. Expected MLM-TX-<id>."),
        404: withKontorError("No Kontor transaction found for this reference", "NOT_FOUND", "No Kontor transaction found for this reference"),
        ...unauthorizedResponses,
        500: internalErrorResponse,
      },
    },
  },
};
