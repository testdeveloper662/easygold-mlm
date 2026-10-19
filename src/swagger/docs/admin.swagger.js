module.exports = {
  "/api/v1/admin/broker/referral": {
    post: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Admin invites / registers a broker with referral",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: { type: "string", format: "email" },
                name: { type: "string" },
                phone: { type: "string" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Broker referral created" } },
    },
  },
  "/api/v1/admin/affiliate/referral": {
    post: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Admin invites / registers an affiliate with referral",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: { type: "string", format: "email" },
                name: { type: "string" },
                phone: { type: "string" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Affiliate referral created" } },
    },
  },
  "/api/v1/admin/broker/fixed-commissions": {
    get: {
      tags: ["Admin - Commissions"],
      summary: "Get broker fixed commission configuration",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Fixed broker commission tiers" } },
    },
    post: {
      tags: ["Admin - Commissions"],
      summary: "Adjust broker fixed commission configuration",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                commissions: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Broker fixed commissions updated" } },
    },
  },
  "/api/v1/admin/broker/variable-commissions": {
    get: {
      tags: ["Admin - Commissions"],
      summary: "Get broker variable commission configuration",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Variable broker commission tiers" } },
    },
    post: {
      tags: ["Admin - Commissions"],
      summary: "Adjust broker variable commission configuration",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                commissions: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Broker variable commissions updated" } },
    },
  },
  "/api/v1/admin/customer/fixed-commissions": {
    get: {
      tags: ["Admin - Commissions"],
      summary: "Get customer fixed commission configuration",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Customer fixed commission settings" } },
    },
    post: {
      tags: ["Admin - Commissions"],
      summary: "Adjust customer fixed commission configuration",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                commissions: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Customer commissions adjusted" } },
    },
  },
  "/api/v1/admin/affiliate/fixed-commissions": {
    get: {
      tags: ["Admin - Commissions"],
      summary: "Get affiliate fixed commission levels",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Affiliate fixed commission tiers" } },
    },
    post: {
      tags: ["Admin - Commissions"],
      summary: "Adjust affiliate fixed commission levels",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      },
      responses: { 200: { description: "Affiliate fixed commissions updated" } },
    },
  },
  "/api/v1/admin/affiliate/variable-commissions": {
    get: {
      tags: ["Admin - Commissions"],
      summary: "Get affiliate variable commission levels",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Affiliate variable commission tiers" } },
    },
    post: {
      tags: ["Admin - Commissions"],
      summary: "Adjust affiliate variable commission levels",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      },
      responses: { 200: { description: "Affiliate variable commissions updated" } },
    },
  },
  "/api/v1/admin/brokers": {
    get: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Get all registered brokers with status filter",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "status", in: "query", schema: { type: "string" } },
      ],
      responses: { 200: { description: "Paginated list of brokers" } },
    },
  },
  "/api/v1/admin/affiliates": {
    get: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Get all registered affiliates with status filter",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        { name: "search", in: "query", schema: { type: "string" } },
      ],
      responses: { 200: { description: "Paginated list of affiliates" } },
    },
  },
  "/api/v1/admin/broker/update-status": {
    post: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Update broker user account status (approve / deactivate)",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["userId", "status"],
              properties: {
                userId: { type: "integer", example: 10 },
                status: { type: "integer", example: 0, description: "0: Active, 1: Inactive/Deactivated, 2: Review" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Broker status updated" } },
    },
  },
  "/api/v1/admin/affiliate/update-status": {
    post: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Update affiliate account status",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["userId", "status"],
              properties: {
                userId: { type: "integer" },
                status: { type: "integer" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Affiliate status updated" } },
    },
  },
  "/api/v1/admin/brokers-contract": {
    get: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Get all broker agreement contracts",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Broker contracts" } },
    },
  },
  "/api/v1/admin/brokers/list": {
    get: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Get simplified list of brokers for dropdown selection",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Brokers dropdown list" } },
    },
  },
  "/api/v1/admin/commission-history": {
    get: {
      tags: ["Admin - Commissions"],
      summary: "Get overall MLM commission history logs",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "product", in: "query", schema: { type: "string" } },
      ],
      responses: { 200: { description: "All commission records" } },
    },
  },
  "/api/v1/admin/ordercustomer/detail": {
    get: {
      tags: ["Admin - Customers"],
      summary: "Get customer details by order ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "order_id", in: "query", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Customer detail" } },
    },
  },
  "/api/v1/admin/commission/manual": {
    post: {
      tags: ["Admin - Commissions"],
      summary: "Submit manual commission entry",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["user_id", "commission_amount", "order_id"],
              properties: {
                user_id: { type: "integer" },
                commission_amount: { type: "number" },
                order_id: { type: "string" },
                product: { type: "string" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Manual commission recorded" } },
    },
  },
  "/api/v1/admin/broker/update-payment-status": {
    post: {
      tags: ["Admin - Commissions"],
      summary: "Update payment status of commission log",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["id", "is_payment_done"],
              properties: {
                id: { type: "integer" },
                is_payment_done: { type: "boolean" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Payment status updated" } },
    },
  },
  "/api/v1/admin/commission/send-payment-confirmation-email": {
    post: {
      tags: ["Admin - Commissions"],
      summary: "Send payment confirmation email to recipient",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                payout_id: { type: "integer" },
                email: { type: "string" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Email sent" } },
    },
  },
  "/api/v1/admin/commission/send-payment-decline-email": {
    post: {
      tags: ["Admin - Commissions"],
      summary: "Send payment decline notice with reason",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                payout_id: { type: "integer" },
                reason: { type: "string" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Decline email sent" } },
    },
  },
  "/api/v1/admin/order/detail": {
    post: {
      tags: ["Admin - Commissions"],
      summary: "Get order details",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["order_id"],
              properties: { order_id: { type: "string" } },
            },
          },
        },
      },
      responses: { 200: { description: "Order details" } },
    },
  },
  "/api/v1/admin/customer/detail": {
    post: {
      tags: ["Admin - Customers"],
      summary: "Get customer profile details",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { order_id: { type: "string" } },
            },
          },
        },
      },
      responses: { 200: { description: "Customer details" } },
    },
  },
  "/api/v1/admin/payout/requests": {
    get: {
      tags: ["Admin - Commissions"],
      summary: "Get all broker payout requests",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        { name: "status", in: "query", schema: { type: "string" } },
      ],
      responses: { 200: { description: "Payout requests list" } },
    },
  },
  "/api/v1/admin/payout/request": {
    put: {
      tags: ["Admin - Commissions"],
      summary: "Update broker payout request status (approve / reject / paid)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["payout_id", "status"],
              properties: {
                payout_id: { type: "integer" },
                status: { type: "string", enum: ["pending", "completed", "rejected"] },
                decline_reason: { type: "string" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Payout request updated" } },
    },
  },
  "/api/v1/admin/broker/{brokerId}/bank-details": {
    get: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Get bank details for a specific broker",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "brokerId", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Broker bank account details" } },
    },
  },
  "/api/v1/admin/target-customers": {
    get: {
      tags: ["Admin - Customers"],
      summary: "Get all target customers across all brokers",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        { name: "search", in: "query", schema: { type: "string" } },
      ],
      responses: { 200: { description: "All customer leads" } },
    },
  },
  "/api/v1/admin/target-customers-contract": {
    get: {
      tags: ["Admin - Customers"],
      summary: "Get all customer contracts",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Customer contracts list" } },
    },
  },
  "/api/v1/admin/target-customers/stats": {
    get: {
      tags: ["Admin - Customers"],
      summary: "Get overall customer metrics and statistics",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Customer stats" } },
    },
  },
  "/api/v1/admin/target-customers/broker/{broker_id}": {
    get: {
      tags: ["Admin - Customers"],
      summary: "Get target customers associated with specific broker",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "broker_id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Broker's customers" } },
    },
  },
  "/api/v1/admin/target-customers/referral-log/{id}/status": {
    put: {
      tags: ["Admin - Customers"],
      summary: "Update referral log status for customer lead",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { status: { type: "string" } },
            },
          },
        },
      },
      responses: { 200: { description: "Referral status updated" } },
    },
  },
  "/api/v1/admin/admin-contracts": {
    get: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Get all admin contracts",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Admin contracts" } },
    },
  },
  "/api/v1/admin/admin-contracts/{id}": {
    get: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Get admin contract by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Admin contract details" } },
    },
    put: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Update admin contract and upload PDF documents",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                english_pdf_file: { type: "string", format: "binary" },
                german_pdf_file: { type: "string", format: "binary" },
                name: { type: "string" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Contract updated" } },
    },
  },
  "/api/v1/admin/terms-and-conditions": {
    get: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Get all terms and conditions records",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Terms and conditions list" } },
    },
    post: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Create terms and conditions document",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                document_key: { type: "string" },
                english_name: { type: "string" },
                german_name: { type: "string" },
                english_pdf_file: { type: "string", format: "binary" },
                german_pdf_file: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Terms created" } },
    },
  },
  "/api/v1/admin/terms-and-conditions/{id}": {
    get: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Get terms and conditions document by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Terms record" } },
    },
    put: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Update terms and conditions document",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                english_pdf_file: { type: "string", format: "binary" },
                german_pdf_file: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Terms updated" } },
    },
  },
  "/api/v1/admin/marketing-materials": {
    get: {
      tags: ["Admin - Marketing"],
      summary: "Get all marketing materials (banners, PDFs, videos)",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Marketing materials list" } },
    },
    post: {
      tags: ["Admin - Marketing"],
      summary: "Create marketing material with English and German assets",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                asset: { type: "string", format: "binary" },
                german_asset: { type: "string", format: "binary" },
                title: { type: "string" },
                type: { type: "string", enum: ["banner", "video", "pdf", "brochure"] },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Marketing material created" } },
    },
  },
  "/api/v1/admin/marketing-materials/{id}": {
    put: {
      tags: ["Admin - Marketing"],
      summary: "Update marketing material by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                asset: { type: "string", format: "binary" },
                german_asset: { type: "string", format: "binary" },
                title: { type: "string" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Marketing material updated" } },
    },
    delete: {
      tags: ["Admin - Marketing"],
      summary: "Delete marketing material by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Marketing material deleted" } },
    },
  },
};
