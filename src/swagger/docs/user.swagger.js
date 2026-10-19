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
        200: { description: "Order captured and commissions processed" },
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
        200: { description: "Order preview calculation returned successfully" },
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
            "application/json": { schema: { "$ref": "#/components/schemas/GeoLookupResponse" } },
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
        200: { description: "List of public marketing videos" },
      },
    },
  },
};
