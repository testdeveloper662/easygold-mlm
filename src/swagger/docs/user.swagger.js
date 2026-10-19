module.exports = {
  "/api/v1/user/capture-order": {
    post: {
      tags: ["User & Orders"],
      summary: "Capture and process customer order commission",
      description: "Webhook / endpoint invoked upon order completion to calculate and distribute commissions across MLM network levels.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["orderId"],
              properties: {
                orderId: { type: "string", example: "ORD-99824" },
                orderType: { type: "string", example: "goldflex" },
                b2bCommissionAmount: { type: "number", example: 150.00 },
                selected_payment_method: { type: "string", example: "bank_transfer" },
                b2bEmail: { type: "string", format: "email", example: "buyer@example.com" },
                b2bName: { type: "string", example: "Max Mustermann" },
                b2bAddress: { type: "string", example: "Musterstrasse 1, 8000 Zurich" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Order captured and commissions processed" },
        400: { description: "Invalid request payload or missing orderId" },
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
          "application/json": {
            schema: {
              type: "object",
              required: ["orderId"],
              properties: {
                orderId: { type: "string", example: "ORD-99824" },
                orderType: { type: "string", example: "goldflex" },
                b2bCommissionAmount: { type: "number", example: 150.00 },
                b2bEmail: { type: "string", format: "email", example: "buyer@example.com" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Order preview calculation returned successfully" },
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
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  ip: { type: "string", example: "127.0.0.1" },
                  country_code: { type: "string", example: "CH" },
                  city: { type: "string", example: "Zurich" },
                  timezone: { type: "string", example: "Europe/Zurich" },
                },
              },
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
        200: { description: "List of public marketing videos" },
      },
    },
  },
};
