// Example response fragments are built directly from the real res.status(200).json(...)
// payloads in src/controller/user/captureOrder.js, captureOrderPreview.js,
// checkCountry.js, and getPublicVideos.js — field names and shapes match those
// controllers exactly.
const exampleDistribution = [
  { level: 1, broker_id: 173, user_id: 43530, commission_percent: 60, commission_amount: 147.3, is_seller: true, product_type: "product", target_customer_log_id: null, is_send_bonus: false },
  { level: 2, broker_id: 150, user_id: 43102, commission_percent: 40, commission_amount: 98.2, is_seller: false, product_type: "product", target_customer_log_id: null, is_send_bonus: false },
];

module.exports = {
  "/api/v1/user/capture-order": {
    post: {
      tags: ["User & Orders"],
      summary: "Capture and process customer order commission",
      description: "Webhook / endpoint invoked upon order completion to calculate and distribute commissions across MLM network levels.",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/CaptureOrderRequest" } },
        },
      },
      responses: {
        200: {
          description: "Order captured and commissions processed",
          content: {
            "application/json": {
              examples: {
                distributed: {
                  summary: "Commission distributed across the broker chain",
                  value: {
                    success: true,
                    message: "Commission distribution stored successfully",
                    data: {
                      totalCommissionPercent: 100,
                      totalProfitAmount: 245.5,
                      distribution: exampleDistribution,
                      tree: "173->150",
                      productTypeBreakdown: [
                        { productType: "product", totalCommissionPercent: 100, totalProfitAmount: 245.5, distribution: exampleDistribution, tree: "173->150" },
                      ],
                      timestamp: "2026-10-19T13:49:35.000Z",
                      duration: "128ms",
                    },
                  },
                },
                already_in_progress: {
                  summary: "Duplicate concurrent request for the same order (concurrency lock)",
                  value: {
                    success: true,
                    message: "Commission calculation is already in progress for this order",
                    data: { orderId: "ORD-99824", orderType: "goldflex" },
                  },
                },
                already_calculated: {
                  summary: "Retried — commission was already booked for this order",
                  value: {
                    success: true,
                    message: "Commission already calculated for this order",
                    data: { orderId: "ORD-99824", orderType: "goldflex" },
                  },
                },
              },
            },
          },
        },
        400: { description: "Invalid request payload or missing orderId" },
        404: {
          description: "Order, customer, or referrer/seller not found",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: { description: "Internal server error" },
      },
    },
  },
  "/api/v1/user/capture-order/preview": {
    post: {
      tags: ["User & Orders"],
      summary: "Preview order commission distribution without committing",
      description: "Calculates the commissions that will be awarded across tiers without writing to the database.",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/CaptureOrderPreviewRequest" } },
        },
      },
      responses: {
        200: {
          description: "Order preview calculation returned successfully",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Commission distribution calculated (preview only — nothing was stored)",
                data: {
                  totalCommissionPercent: 100,
                  totalProfitAmount: 245.5,
                  seller_commission: 147.3,
                  distribution: exampleDistribution,
                  tree: "173->150",
                  productTypeBreakdown: [
                    { productType: "product", totalCommissionPercent: 100, totalProfitAmount: 245.5, seller_commission: 147.3, distribution: exampleDistribution, tree: "173->150" },
                  ],
                  timestamp: "2026-10-19T13:49:35.000Z",
                  duration: "84ms",
                },
              },
            },
          },
        },
        400: {
          description: "Missing orderId, orderType, or b2bCommissionAmount",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        404: {
          description: "Order, customer, or broker not found",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/user/check-country": {
    get: {
      tags: ["User & Orders"],
      summary: "Lookup visitor geo-location and country code",
      description: "Detects user IP and returns ISO country code, city, and timezone based on geoip.",
      responses: {
        200: {
          description: "Geo information",
          content: {
            "application/json": {
              schema: { "$ref": "#/components/schemas/GeoLookupResponse" },
              example: { success: true, ip: "203.0.113.42", country_code: "CH", city: "Zurich", timezone: "Europe/Zurich" },
            },
          },
        },
      },
    },
  },
  "/api/v1/public/videos": {
    get: {
      tags: ["User & Orders"],
      summary: "Get public video marketing materials",
      description: "Public endpoint to retrieve active marketing video materials with pagination.",
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 12 } },
      ],
      responses: {
        200: {
          description: "List of public marketing videos",
          content: {
            "application/json": {
              example: {
                success: true,
                data: [
                  {
                    id: 12,
                    title: "GoldFlex Intro",
                    german_title: "GoldFlex Einführung",
                    type: "video",
                    description: "Short explainer for new brokers",
                    german_description: "Kurzerklärung für neue Broker",
                    category: "goldflex",
                    asset_url: null,
                    german_asset_url: null,
                    youtube_url: "https://www.youtube.com/watch?v=abc123",
                    german_youtube_url: "https://www.youtube.com/watch?v=def456",
                    width: 1280,
                    height: 720,
                    is_active: true,
                    createdAt: "2026-09-02T08:00:00.000Z",
                    updatedAt: "2026-09-02T08:00:00.000Z",
                  },
                ],
                pagination: { total: 1, current_page: 1, total_pages: 1, limit: 12, has_next_page: false, has_prev_page: false },
              },
            },
          },
        },
      },
    },
  },
};
