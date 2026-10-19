module.exports = {
  "/api/v1/admin/broker/referral": {
    post: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Admin invites / registers a broker with referral",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/ReferralRequest" } },
        },
      },
      responses: {
        200: {
          description: "Broker referral created",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Email has been sent with Registration details.",
              },
            },
          },
        },
      },
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
          "application/json": { schema: { "$ref": "#/components/schemas/ReferralRequest" } },
        },
      },
      responses: {
        200: {
          description: "Affiliate referral created",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Affiliate registration invitation email sent successfully.",
                data: {
                  registerUrl: "http://localhost:8080/affiliate-register?referral=RVNZR09MRDkxNg==",
                  invitation: {
                    id: 58,
                    email: "nina.koehler@example.com",
                    invitation_status: "SENT",
                    invited_by: 12,
                    last_invitation_sent: "2026-10-19T13:40:11.000Z",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/broker/fixed-commissions": {
    get: {
      tags: ["Admin - Commissions"],
      summary: "Get broker fixed commission configuration",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Fixed broker commission tiers",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Broker fixed commission levels fetched successfully",
                data: {
                  brokerCommissions: [
                    { id: 1, level: 1, percentage: 50, service_type: "GoldFlex", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-01T08:00:00.000Z" },
                    { id: 2, level: 2, percentage: 20, service_type: "GoldFlex", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-01T08:00:00.000Z" },
                  ],
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Admin - Commissions"],
      summary: "Adjust broker fixed commission configuration",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/CommissionTiersUpdateRequest" } },
        },
      },
      responses: {
        200: {
          description: "Broker fixed commissions updated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Broker fixed commissions updated successfully.",
                data: {
                  brokerCommissions: [
                    { id: 1, level: 1, percentage: 55, service_type: "GoldFlex", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-10-19T13:41:02.000Z" },
                    { id: 2, level: 2, percentage: 15, service_type: "GoldFlex", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-10-19T13:41:02.000Z" },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/broker/variable-commissions": {
    get: {
      tags: ["Admin - Commissions"],
      summary: "Get broker variable commission configuration",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Variable broker commission tiers",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Broker variable commission levels fetched successfully",
                data: {
                  brokerCommissions: [
                    { id: 5, level: 1, percentage: 50, service_type: "My Store", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-01T08:00:00.000Z" },
                    { id: 6, level: 2, percentage: 20, service_type: "My Store", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-01T08:00:00.000Z" },
                  ],
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Admin - Commissions"],
      summary: "Adjust broker variable commission configuration",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/CommissionTiersUpdateRequest" } },
        },
      },
      responses: {
        200: {
          description: "Broker variable commissions updated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Broker variable commissions updated successfully.",
                data: {
                  brokerCommissions: [
                    { id: 5, level: 1, percentage: 45, service_type: "My Store", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-10-19T13:42:18.000Z" },
                    { id: 6, level: 2, percentage: 25, service_type: "My Store", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-10-19T13:42:18.000Z" },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/customer/fixed-commissions": {
    get: {
      tags: ["Admin - Commissions"],
      summary: "Get customer fixed commission configuration",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Customer fixed commission settings",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Customer fixed commission levels fetched successfully",
                data: {
                  customerCommissions: [
                    { id: 9, level: 1, percentage: 5, service_type: "Gold Purchase", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-01T08:00:00.000Z" },
                  ],
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Admin - Commissions"],
      summary: "Adjust customer fixed commission configuration",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/CommissionTiersUpdateRequest" } },
        },
      },
      responses: {
        200: {
          description: "Customer commissions adjusted",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Customer fixed commissions updated successfully.",
                data: {
                  customerCommissions: [
                    { id: 9, level: 1, percentage: 7, service_type: "Gold Purchase", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-10-19T13:43:05.000Z" },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/affiliate/fixed-commissions": {
    get: {
      tags: ["Admin - Commissions"],
      summary: "Get affiliate fixed commission levels",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Affiliate fixed commission tiers",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  affiliateCommissions: [
                    { id: 3, level: 1, percentage: 50, service_type: "Easygold Token", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-01T08:00:00.000Z" },
                  ],
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Admin - Commissions"],
      summary: "Adjust affiliate fixed commission levels",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/CommissionTiersUpdateRequest" } },
        },
      },
      responses: {
        200: {
          description: "Affiliate fixed commissions updated",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  affiliateCommissions: [
                    { id: 3, level: 1, percentage: 60, service_type: "Easygold Token", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-10-19T13:44:00.000Z" },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/affiliate/variable-commissions": {
    get: {
      tags: ["Admin - Commissions"],
      summary: "Get affiliate variable commission levels",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Affiliate variable commission tiers",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  affiliateCommissions: [
                    { id: 11, level: 1, percentage: 50, service_type: "My Store", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-01T08:00:00.000Z" },
                    { id: 12, level: 2, percentage: 20, service_type: "My Store", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-01T08:00:00.000Z" },
                  ],
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Admin - Commissions"],
      summary: "Adjust affiliate variable commission levels",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/CommissionTiersUpdateRequest" } },
        },
      },
      responses: {
        200: {
          description: "Affiliate variable commissions updated",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  affiliateCommissions: [
                    { id: 11, level: 1, percentage: 40, service_type: "My Store", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-10-19T13:45:30.000Z" },
                    { id: 12, level: 2, percentage: 30, service_type: "My Store", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-10-19T13:45:30.000Z" },
                  ],
                },
              },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "Paginated list of brokers",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "All Brokers data",
                data: {
                  brokers: [
                    {
                      broker_id: 173,
                      user_id: 43530,
                      display_name: "Lukas Weber",
                      user_email: "lukas.weber@example.com",
                      referral_code: "LW4821",
                      logo: null,
                      company: "Weber Edelmetalle GmbH",
                      contact_person: "Lukas Weber",
                      street_no: "12",
                      street: "Bahnhofstraße",
                      location: "Munich",
                      postcode: "80331",
                      country: "Germany",
                      vat_no: "DE123456789",
                      tax_no: "143/815/08154",
                      phone: "+49 89 1234567",
                      landline_number: null,
                      language: "de",
                      date: "2026-01-15",
                      web_site: "https://weber-edelmetalle.de",
                      bank: "Deutsche Bank",
                      iban: "DE89370400440532013000",
                      bic: "DEUTDEDBFRA",
                      bank_address: "Frankfurt am Main",
                      banks: null,
                      trade_register: null,
                      bill_upload: null,
                      maklervertrag_doc: "http://localhost:3000/uploads/contracts/1234-maklervertrag.pdf",
                      untermaklervertrag_doc: null,
                      inc_partnership_doc: null,
                      llc_partnership_doc: null,
                      goldflex_partnership_doc: null,
                      hartmann_benz_gmbh_doc: null,
                      binding_loi_doc: null,
                      partner_tax_billing_doc: null,
                      uk_company_sales_platform_doc: null,
                      ncnda_doc: null,
                      option_subscription_doc: null,
                      travel_id: null,
                      signature: null,
                      createdAt: "2026-01-15T09:12:00.000Z",
                      updatedAt: "2026-10-01T10:00:00.000Z",
                    },
                  ],
                  total: 42,
                  currentPage: 1,
                  totalPages: 5,
                },
              },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "Paginated list of affiliates",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Affiliates data fetched successfully",
                data: {
                  affiliates: [
                    {
                      affiliate_id: 58,
                      user_id: 43891,
                      display_name: "Nina Koehler",
                      user_email: "nina.koehler@example.com",
                      referral_code: "NK9012",
                      referred_by_code: "LW4821",
                      person_typ: "privatperson",
                      company: "-",
                      country: "Germany",
                      steuer_id: null,
                      phone: "+49 170 9988776",
                      language: "de",
                      logo: null,
                      user_status: 0,
                      role_id: 3,
                      role: "AFFILIATE",
                      total_commission_amount: 240.5,
                      createdAt: "2026-05-02T11:20:00.000Z",
                      updatedAt: "2026-05-02T11:20:00.000Z",
                    },
                  ],
                  brokers: [
                    {
                      affiliate_id: 58,
                      user_id: 43891,
                      display_name: "Nina Koehler",
                      user_email: "nina.koehler@example.com",
                      referral_code: "NK9012",
                      referred_by_code: "LW4821",
                      person_typ: "privatperson",
                      company: "-",
                      country: "Germany",
                      steuer_id: null,
                      phone: "+49 170 9988776",
                      language: "de",
                      logo: null,
                      user_status: 0,
                      role_id: 3,
                      role: "AFFILIATE",
                      total_commission_amount: 240.5,
                      createdAt: "2026-05-02T11:20:00.000Z",
                      updatedAt: "2026-05-02T11:20:00.000Z",
                    },
                  ],
                  total: 17,
                  currentPage: 1,
                  totalPages: 2,
                },
              },
            },
          },
        },
      },
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
          "application/json": { schema: { "$ref": "#/components/schemas/UpdateUserStatusRequest" } },
        },
      },
      responses: {
        200: {
          description: "Broker status updated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "User status updated successfully",
                data: { user_id: 43530, user_status: 0 },
              },
            },
          },
        },
        400: {
          description: "status missing/invalid, or no user_id/broker_id/affiliate_id resolvable",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
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
  "/api/v1/admin/affiliate/update-status": {
    post: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Update affiliate account status",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/UpdateUserStatusRequest" } },
        },
      },
      responses: {
        200: {
          description: "Affiliate status updated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "User status updated successfully",
                data: { user_id: 43891, user_status: 1 },
              },
            },
          },
        },
        400: {
          description: "status missing/invalid, or no user_id/broker_id/affiliate_id resolvable",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
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
  "/api/v1/admin/brokers-contract": {
    get: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Get all broker agreement contracts",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Broker contracts",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Broker contracts fetched successfully",
                data: {
                  contracts: [
                    {
                      broker_id: 173,
                      referral_code: "LW4821",
                      display_name: "Lukas Weber",
                      user_email: "lukas.weber@example.com",
                      contract_type: "Maklervertrag",
                      contract_key: "maklervertrag_doc",
                      contract_url: "http://localhost:3000/uploads/contracts/1234-maklervertrag.pdf",
                      createdAt: "2026-01-15T09:12:00.000Z",
                      updatedAt: "2026-10-01T10:00:00.000Z",
                    },
                  ],
                  total: 8,
                  currentPage: 1,
                  totalPages: 1,
                  limit: 10,
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/brokers/list": {
    get: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Get simplified list of brokers for dropdown selection",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Brokers dropdown list",
          content: {
            "application/json": {
              example: {
                success: true,
                data: [
                  { broker_id: 173, user_id: 43530, display_name: "Lukas Weber", user_email: "lukas.weber@example.com" },
                  { broker_id: 174, user_id: 43531, display_name: "Anna Fischer", user_email: "anna.fischer@example.com" },
                ],
              },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "All commission records",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "All commission history fetched successfully.",
                data: [
                  {
                    order_id: "4711",
                    order_type: "my_store",
                    order_amount: 1000,
                    profit_amount: 1000,
                    notes: null,
                    createdAt: "2026-10-18T09:00:00.000Z",
                    updatedAt: "2026-10-18T09:05:00.000Z",
                    tree: "173->172",
                    commission_type: "automatic",
                    choose_payment_option: 1,
                    selected_payment_method: 1,
                    payment_type: "Bank Transfer",
                    broker_commissions: [
                      {
                        broker_id: 173,
                        affiliate_id: 173,
                        user_id: 43530,
                        user_email: "lukas.weber@example.com",
                        user_role_id: 2,
                        commission_percent: 50,
                        commission_amount: 500,
                        is_seller: 1,
                        is_payment_done: 1,
                        is_payment_declined: 0,
                        tree: "173->172",
                      },
                      {
                        broker_id: 172,
                        affiliate_id: 172,
                        user_id: 43200,
                        user_email: "anna.fischer@example.com",
                        user_role_id: 2,
                        commission_percent: 50,
                        commission_amount: 500,
                        is_seller: 0,
                        is_payment_done: 1,
                        is_payment_declined: 0,
                        tree: "173->172",
                      },
                    ],
                  },
                ],
                pagination: { currentPage: 1, totalPages: 9, totalItems: 86, itemsPerPage: 10 },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/ordercustomer/detail": {
    get: {
      tags: ["Admin - Customers"],
      summary: "Get customer details by order ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "order_id", in: "query", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Customer detail",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  order_id: "4711",
                  order_type: "my_store",
                  order_amount: 1000,
                  profit_amount: 1000,
                  createdAt: "2026-10-18T09:00:00.000Z",
                  updatedAt: "2026-10-18T09:05:00.000Z",
                  tree: "173->172",
                  payment_type: "Bank Transfer",
                  broker_commissions: [
                    {
                      broker_id: 173,
                      user_id: 43530,
                      user_email: "lukas.weber@example.com",
                      user_role_id: 2,
                      commission_percent: 50,
                      commission_amount: 500,
                      is_seller: 1,
                      is_payment_done: 1,
                      is_payment_declined: 0,
                      tree: "173->172",
                    },
                  ],
                  commission_devided: true,
                  referralLog: {
                    fromCustomer: { id: 9, customer_name: "Peter Hoffmann", customer_email: "peter.hoffmann@example.com", telephone: "+49 170 1112233" },
                    toCustomer: { id: 10, customer_name: "Sabine Lang", customer_email: "sabine.lang@example.com", telephone: "+49 170 4445566" },
                  },
                  customer: { id: 10, customer_name: "Sabine Lang", customer_email: "sabine.lang@example.com", telephone: "+49 170 4445566" },
                  referrer: { id: 9, customer_name: "Peter Hoffmann", customer_email: "peter.hoffmann@example.com", telephone: "+49 170 1112233" },
                },
              },
            },
          },
        },
      },
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
          "application/json": { schema: { "$ref": "#/components/schemas/ManualCommissionRequest" } },
        },
      },
      responses: {
        200: {
          description: "Manual commission recorded",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Manual commission distributed successfully",
                data: {
                  amount: 1000,
                  distribution: [
                    { level: 1, broker_id: 173, user_id: 43530, commission_percent: 70, commission_amount: 700, is_seller: true },
                    { level: 2, broker_id: 172, user_id: 43200, commission_percent: 30, commission_amount: 300, is_seller: false },
                  ],
                  tree: "173->172",
                },
              },
            },
          },
        },
        400: {
          description: "broker_id, user_id, amount, or order_type missing",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/admin/broker/update-payment-status": {
    post: {
      tags: ["Admin - Commissions"],
      summary: "Update payment status of commission log",
      description: "Marks matching commission rows as paid (is_payment_done is always set true server-side, not taken from the body).",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/UpdatePaymentStatusRequest" } },
        },
      },
      responses: {
        200: {
          description: "Payment status updated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Payment status updated.",
                data: { order_id: "4711", order_type: "my_store", is_payment_done: true, updated_records: 2 },
              },
            },
          },
        },
        400: {
          description: "order_id is required",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/admin/commission/send-payment-confirmation-email": {
    post: {
      tags: ["Admin - Commissions"],
      summary: "Send payment confirmation email to recipient",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/PaymentConfirmationEmailRequest" } },
        },
      },
      responses: {
        200: {
          description: "Email sent",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Payment marked successfully. Emails sent to all eligible brokers.",
                data: {
                  order_id: "4711",
                  tree: "173->172",
                  emails_sent: ["anna.fischer@example.com"],
                  total_emails_sent: 1,
                  total_brokers_in_tree: 2,
                },
              },
            },
          },
        },
        400: {
          description: "order_id or tree missing",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/admin/commission/send-payment-decline-email": {
    post: {
      tags: ["Admin - Commissions"],
      summary: "Send payment decline notice with reason",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/PaymentDeclineEmailRequest" } },
        },
      },
      responses: {
        200: {
          description: "Decline email sent",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Payment declined and emails sent to all eligible brokers.",
                data: {
                  order_id: "4711",
                  tree: "173->172",
                  emails_sent: ["anna.fischer@example.com"],
                  total_emails_sent: 1,
                  total_brokers_in_tree: 2,
                },
              },
            },
          },
        },
        400: {
          description: "order_id or tree missing",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/admin/order/detail": {
    post: {
      tags: ["Admin - Commissions"],
      summary: "Get order details",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/OrderDetailByIdRequest" } },
        },
      },
      responses: {
        200: {
          description: "Order details",
          content: {
            "application/json": {
              examples: {
                store_or_landing_page_order: {
                  summary: "orderType = my_store / landing_page / api / diamond_gemstone, etc. — shipping-meta based orders",
                  value: {
                    success: true,
                    data: {
                      products: [
                        { id: 15, name: "1oz Gold Bar", quantity: 2, price: 1850 },
                      ],
                      partner: {
                        display_name: "Lukas Weber",
                        user_nicename: "lukas-weber",
                        user_street_no: "12",
                        user_street: "Bahnhofstraße",
                        user_location: "Munich",
                        user_country: "Germany",
                      },
                      orderDetails: { order_id: "4711", order_type: "my_store", Home_Delivery: "1" },
                    },
                  },
                },
                gold_purchase_order: {
                  summary: "orderType = gold_purchase / gold_purchase_sell_orders",
                  value: {
                    success: true,
                    data: {
                      order_id: "4711",
                      order_type: "gold_purchase",
                      order_amount: 1850,
                      profit_amount: 500,
                      payment_type: "Bank Transfer",
                      tracking_number: "DHL123456789DE",
                      createdAt: "2026-10-18T09:00:00.000Z",
                      updatedAt: "2026-10-18T09:05:00.000Z",
                      broker_commissions: [
                        { broker_id: 173, user_id: 43530, user_email: "lukas.weber@example.com", commission_percent: 50, commission_amount: 250, selected_payment_method: 1, is_seller: 1, is_payment_done: 1, is_payment_declined: 0, tree: "173" },
                      ],
                      tree: "173",
                      customer: { name: "Sabine Lang", email: "sabine.lang@example.com", phone: "+49 170 4445566", address: "Hauptstraße 3", city: "Munich", country: "Germany" },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "orderId or orderType missing",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/admin/customer/detail": {
    post: {
      tags: ["Admin - Customers"],
      summary: "Get customer profile details",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/OrderDetailByIdRequest" } },
        },
      },
      responses: {
        200: {
          description: "Customer details",
          content: {
            "application/json": {
              example: {
                success: true,
                data: [
                  {
                    id: 980,
                    broker_id: 173,
                    user_id: 43530,
                    order_id: "4711",
                    order_type: "my_store",
                    order_amount: 1000,
                    profit_amount: 1000,
                    commission_percent: 50,
                    commission_amount: 500,
                    is_seller: 1,
                    is_payment_done: 1,
                    is_payment_declined: 0,
                    customer_id: 10,
                    tree: "173->172",
                    commission_type: "automatic",
                    selected_payment_method: 1,
                    notes: null,
                    is_deleted: false,
                    createdAt: "2026-10-18T09:00:00.000Z",
                    updatedAt: "2026-10-18T09:05:00.000Z",
                    customer: {
                      id: 10,
                      customer_name: "Sabine Lang",
                      customer_email: "sabine.lang@example.com",
                      telephone: "+49 170 4445566",
                      status: "converted",
                      interest_level: "high",
                      estimated_value: 1000,
                      broker_id: 173,
                      createdAt: "2026-09-20T08:30:00.000Z",
                    },
                  },
                ],
              },
            },
          },
        },
        400: {
          description: "orderId or orderType missing",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
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
        { name: "broker_id", in: "query", schema: { type: "string" } },
        { name: "email", in: "query", schema: { type: "string" } },
        { name: "user_id", in: "query", schema: { type: "string" } },
        { name: "type", in: "query", schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Payout requests list",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Broker payout requests fetched successfully.",
                data: [
                  {
                    id: 61,
                    broker_id: 173,
                    user_id: 43530,
                    amount: 500,
                    invoice: "http://localhost:3000/uploads/invoices/61-invoice.pdf",
                    payout_for: "commission",
                    status: "PENDING",
                    created_at: "2026-10-15T10:00:00.000Z",
                    updated_at: "2026-10-15T10:00:00.000Z",
                    broker: {
                      id: 173,
                      referral_code: "LW4821",
                      children_count: 2,
                      total_commission_amount: 3200.5,
                      user: { id: 43530, username: "lukas-weber", name: "Lukas Weber" },
                    },
                  },
                ],
                pagination: { currentPage: 1, totalPages: 3, totalItems: 25, itemsPerPage: 10 },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/payout/request": {
    put: {
      tags: ["Admin - Commissions"],
      summary: "Update broker payout request status (approve / reject / paid)",
      description: "The payout request id is a query parameter, not a body field.",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { "$ref": "#/components/schemas/PayoutRequestStatusUpdate" } },
        },
      },
      responses: {
        200: {
          description: "Payout request updated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Payout request updated successfully.",
                data: {
                  id: 61,
                  broker_id: 173,
                  amount: 500,
                  status: "APPROVED",
                  rejection_reason: null,
                  invoice: "61-invoice.pdf",
                  payout_for: "commission",
                  createdAt: "2026-10-15T10:00:00.000Z",
                  updatedAt: "2026-10-19T13:50:12.000Z",
                },
              },
            },
          },
        },
        401: {
          description: "Missing or invalid token",
          content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
        },
      },
    },
  },
  "/api/v1/admin/broker/{brokerId}/bank-details": {
    get: {
      tags: ["Admin - Brokers & Affiliates"],
      summary: "Get bank details for a specific broker",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "brokerId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Broker bank account details",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  ac_holder_name: "Lukas Weber",
                  iban: "DE89370400440532013000",
                  bic_swift_code: "DEUTDEDBFRA",
                  bank_name: "Deutsche Bank",
                  banks: { sepa: [{ account_holder: "Lukas Weber", iban: "DE89370400440532013000", bic_swift: "DEUTDEDBFRA", bank_name: "Deutsche Bank" }] },
                  broker: { id: 173, user_id: 43530, email: "lukas.weber@example.com", name: "Lukas Weber" },
                },
              },
            },
          },
        },
      },
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
      responses: {
        200: {
          description: "All customer leads",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "All target customers retrieved successfully",
                data: {
                  customers: [
                    {
                      id: 10,
                      customer_name: "Sabine Lang",
                      customer_email: "sabine.lang@example.com",
                      status: "converted",
                      interest_level: "high",
                      estimated_value: 1000,
                      is_active: true,
                      broker_id: 173,
                      pdf_url: null,
                      createdAt: "2026-09-20T08:30:00.000Z",
                      broker: { id: 173, user_id: 43530, referral_code: "LW4821", user: { ID: 43530, user_email: "lukas.weber@example.com", display_name: "Lukas Weber" } },
                      person_name: "Lukas Weber",
                      person_email: "lukas.weber@example.com",
                      broker_name: "Lukas Weber",
                    },
                  ],
                  total: 64,
                  currentPage: 1,
                  totalPages: 7,
                  limit: 10,
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/target-customers-contract": {
    get: {
      tags: ["Admin - Customers"],
      summary: "Get all customer contracts",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Customer contracts list",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "All target customers retrieved successfully",
                data: {
                  customers: [
                    {
                      id: 10,
                      customer_name: "Sabine Lang",
                      customer_email: "sabine.lang@example.com",
                      status: "converted",
                      interest_level: "high",
                      estimated_value: 1000,
                      is_active: true,
                      broker_id: 173,
                      pdf_url: "http://localhost:3000/uploads/contracts/10-sabine-lang.pdf",
                      createdAt: "2026-09-20T08:30:00.000Z",
                      broker: { id: 173, user_id: 43530, referral_code: "LW4821", user: { ID: 43530, user_email: "lukas.weber@example.com", display_name: "Lukas Weber" } },
                      person_name: "Lukas Weber",
                      person_email: "lukas.weber@example.com",
                      broker_name: "Lukas Weber",
                    },
                  ],
                  total: 12,
                  currentPage: 1,
                  totalPages: 2,
                  limit: 10,
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/target-customers/stats": {
    get: {
      tags: ["Admin - Customers"],
      summary: "Get overall customer metrics and statistics",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Customer stats",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Overall target customer statistics retrieved successfully",
                data: {
                  total_customers: 64,
                  active_customers: 50,
                  inactive_customers: 14,
                  status_breakdown: [
                    { status: "new", count: 20 },
                    { status: "converted", count: 30 },
                    { status: "lost", count: 14 },
                  ],
                  interest_level_breakdown: [
                    { interest_level: "high", count: 25 },
                    { interest_level: "medium", count: 29 },
                    { interest_level: "low", count: 10 },
                  ],
                  total_estimated_value: 128500.5,
                  customers_added_this_month: 9,
                  brokers_with_customers: 11,
                  top_brokers: [
                    {
                      broker_id: 173,
                      customer_count: "18",
                      broker: { id: 173, user_id: 43530, referral_code: "LW4821", user: { ID: 43530, user_email: "lukas.weber@example.com", display_name: "Lukas Weber" } },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/target-customers/broker/{broker_id}": {
    get: {
      tags: ["Admin - Customers"],
      summary: "Get target customers associated with specific broker",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "broker_id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Broker's customers",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Broker's target customers retrieved successfully",
                data: {
                  person: { name: "Lukas Weber", email: "lukas.weber@example.com", broker_id: 173, user_id: 43530, referral_code: "LW4821" },
                  broker: { id: 173, user_id: 43530, user_email: "lukas.weber@example.com", display_name: "Lukas Weber", referral_code: "LW4821" },
                  customers: [
                    {
                      id: 10,
                      customer_name: "Sabine Lang",
                      customer_email: "sabine.lang@example.com",
                      customer_phone: "+49 170 4445566",
                      broker_id: 173,
                      status: "converted",
                      interest_level: "high",
                      createdAt: "2026-09-20T08:30:00.000Z",
                      person_name: "Lukas Weber",
                      person_email: "lukas.weber@example.com",
                      broker_name: "Lukas Weber",
                      person: { name: "Lukas Weber", email: "lukas.weber@example.com", referral_code: "LW4821" },
                    },
                  ],
                  total: 18,
                  currentPage: 1,
                  totalPages: 2,
                  limit: 10,
                },
              },
            },
          },
        },
      },
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
          "application/json": { schema: { "$ref": "#/components/schemas/ReferralLogStatusUpdateRequest" } },
        },
      },
      responses: {
        200: {
          description: "Referral status updated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Commission approved successfully",
                data: {
                  id: 25,
                  status: "APPROVED",
                  type: "COMMISSION_APPROVED",
                  tracking_number: "DHL123456789DE",
                  tracking_link: "https://www.dhl.de/track/DHL123456789DE",
                  remark: null,
                  approved_at: "2026-10-19T13:55:00.000Z",
                  investment_amount: 1000,
                  commission_amount: 50,
                  product: "goldflex",
                  createdAt: "2026-10-10T09:00:00.000Z",
                  updatedAt: "2026-10-19T13:55:00.000Z",
                  fromCustomer: { id: 9, customer_name: "Peter Hoffmann", customer_email: "peter.hoffmann@example.com" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/admin-contracts": {
    get: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Get all admin contracts",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Admin contracts",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "All Admin conracts fetched successfully.",
                pagination: { currentPage: 1, totalPages: 1, totalItems: 3, itemsPerPage: 10 },
                data: [
                  {
                    english_name: "Broker Agreement",
                    german_name: "Maklervertrag",
                    id: 2,
                    english_pdf_file: "http://localhost:3000/public/uploads/contracts/broker-agreement-en.pdf",
                    german_pdf_file: "http://localhost:3000/public/uploads/contracts/broker-agreement-de.pdf",
                    showonregister: true,
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/admin-contracts/{id}": {
    get: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Get admin contract by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Admin contract details",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Admin contract fetched successfully.",
                data: {
                  id: 2,
                  english_name: "Broker Agreement",
                  german_name: "Maklervertrag",
                  english_template_text: "<p>This Broker Agreement ...</p>",
                  german_template_text: "<p>Dieser Maklervertrag ...</p>",
                  description: "Standard broker onboarding agreement",
                  showonregister: true,
                  document_key: "broker_agreement",
                  english_pdf_file: "http://localhost:3000uploads/contracts/broker-agreement-en.pdf",
                  german_pdf_file: "http://localhost:3000uploads/contracts/broker-agreement-de.pdf",
                  createdAt: "2026-01-01T08:00:00.000Z",
                  updatedAt: "2026-06-01T08:00:00.000Z",
                },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Update admin contract and upload PDF documents",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "multipart/form-data": { schema: { "$ref": "#/components/schemas/AdminContractUpdateRequest" } },
        },
      },
      responses: {
        200: {
          description: "Contract updated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Admin contract updated successfully.",
                data: {
                  id: 2,
                  english_name: "Broker Agreement",
                  german_name: "Maklervertrag",
                  english_template_text: "<p>This Broker Agreement ...</p>",
                  german_template_text: "<p>Dieser Maklervertrag ...</p>",
                  description: "Standard broker onboarding agreement",
                  showonregister: true,
                  document_key: "broker_agreement",
                  english_pdf_file: "1760879999123-882734651.pdf",
                  german_pdf_file: "1760879999456-119283746.pdf",
                  createdAt: "2026-01-01T08:00:00.000Z",
                  updatedAt: "2026-10-19T13:57:00.000Z",
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/terms-and-conditions": {
    get: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Get all terms and conditions records",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Terms and conditions list",
          content: {
            "application/json": {
              example: {
                success: true,
                data: [
                  {
                    id: 1,
                    english_name: "Terms of Service",
                    german_name: "Nutzungsbedingungen",
                    english_template_text: "<p>By using this platform ...</p>",
                    german_template_text: "<p>Durch die Nutzung dieser Plattform ...</p>",
                    english_pdf_file: "1758000000111-223344556.pdf",
                    german_pdf_file: "1758000000222-334455667.pdf",
                    showonregister: true,
                    document_key: "terms_of_service",
                    createdAt: "2026-02-01T08:00:00.000Z",
                    updatedAt: "2026-02-01T08:00:00.000Z",
                  },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Create terms and conditions document",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "multipart/form-data": { schema: { "$ref": "#/components/schemas/TermsCreateRequest" } },
        },
      },
      responses: {
        200: {
          description: "Terms created",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Terms and conditions created successfully",
                data: {
                  id: 2,
                  english_name: "Privacy Policy",
                  german_name: "Datenschutzerklärung",
                  english_template_text: "<p>We take your privacy seriously ...</p>",
                  german_template_text: "<p>Wir nehmen Ihre Privatsphäre ernst ...</p>",
                  english_pdf_file: "1760879999777-998877665.pdf",
                  german_pdf_file: "1760879999888-887766554.pdf",
                  showonregister: true,
                  document_key: "privacy_policy",
                  createdAt: "2026-10-19T13:58:00.000Z",
                  updatedAt: "2026-10-19T13:58:00.000Z",
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/terms-and-conditions/{id}": {
    get: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Get terms and conditions document by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Terms record",
          content: {
            "application/json": {
              example: {
                success: true,
                data: {
                  id: 1,
                  english_name: "Terms of Service",
                  german_name: "Nutzungsbedingungen",
                  english_template_text: "<p>By using this platform ...</p>",
                  german_template_text: "<p>Durch die Nutzung dieser Plattform ...</p>",
                  english_pdf_file: "1758000000111-223344556.pdf",
                  german_pdf_file: "1758000000222-334455667.pdf",
                  showonregister: true,
                  document_key: "terms_of_service",
                  createdAt: "2026-02-01T08:00:00.000Z",
                  updatedAt: "2026-02-01T08:00:00.000Z",
                },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ["Admin - Contracts & Terms"],
      summary: "Update terms and conditions document",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "multipart/form-data": { schema: { "$ref": "#/components/schemas/TermsUpdateRequest" } },
        },
      },
      responses: {
        200: {
          description: "Terms updated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Terms and condition updated successfully.",
                data: {
                  id: 1,
                  english_name: "Terms of Service",
                  german_name: "Nutzungsbedingungen",
                  english_template_text: "<p>By using this platform (updated) ...</p>",
                  german_template_text: "<p>Durch die Nutzung dieser Plattform (aktualisiert) ...</p>",
                  description: "Core platform terms",
                  english_pdf_file: "1760880001111-112233445.pdf",
                  german_pdf_file: "1758000000222-334455667.pdf",
                  showonregister: true,
                  document_key: "terms_of_service",
                  createdAt: "2026-02-01T08:00:00.000Z",
                  updatedAt: "2026-10-19T13:59:00.000Z",
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/admin/marketing-materials": {
    get: {
      tags: ["Admin - Marketing"],
      summary: "Get all marketing materials (banners, PDFs, videos)",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Marketing materials list",
          content: {
            "application/json": {
              example: {
                success: true,
                data: [
                  {
                    id: 7,
                    title: "Easygold Broker Flyer",
                    german_title: "Easygold Makler-Flyer",
                    type: "pdf",
                    category: "flyer",
                    asset_url: "http://localhost:3000uploads/marketing/1760800000111-556677889.pdf",
                    german_asset_url: "http://localhost:3000uploads/marketing/1760800000222-667788990.pdf",
                    youtube_url: null,
                    german_youtube_url: null,
                    width: null,
                    height: null,
                    description: "One-page flyer for broker onboarding",
                    german_description: "Einseitiger Flyer für das Makler-Onboarding",
                    is_active: true,
                    createdAt: "2026-08-01T08:00:00.000Z",
                    updatedAt: "2026-08-01T08:00:00.000Z",
                  },
                ],
                totalPages: 2,
                totalItems: 19,
                currentPage: 1,
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Admin - Marketing"],
      summary: "Create marketing material with English and German assets",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "multipart/form-data": { schema: { "$ref": "#/components/schemas/MarketingMaterialCreateRequest" } },
        },
      },
      responses: {
        200: {
          description: "Marketing material created",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Marketing material created successfully",
                data: {
                  id: 8,
                  title: "GoldFlex Explainer Video",
                  german_title: "GoldFlex Erklärvideo",
                  type: "video",
                  category: "video",
                  asset_url: "uploads/marketing/1760880002111-334455667.mp4",
                  german_asset_url: "uploads/marketing/1760880002222-445566778.mp4",
                  youtube_url: "https://youtube.com/watch?v=abc123",
                  german_youtube_url: "https://youtube.com/watch?v=def456",
                  width: 1920,
                  height: 1080,
                  description: "Short explainer video for GoldFlex",
                  german_description: "Kurzes Erklärvideo für GoldFlex",
                  is_active: true,
                  createdAt: "2026-10-19T14:00:00.000Z",
                  updatedAt: "2026-10-19T14:00:00.000Z",
                },
              },
            },
          },
        },
      },
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
          "multipart/form-data": { schema: { "$ref": "#/components/schemas/MarketingMaterialUpdateRequest" } },
        },
      },
      responses: {
        200: {
          description: "Marketing material updated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Updated successfully",
                data: {
                  id: 7,
                  title: "Easygold Broker Flyer (2026 edition)",
                  german_title: "Easygold Makler-Flyer (Ausgabe 2026)",
                  type: "pdf",
                  category: "flyer",
                  asset_url: "uploads/marketing/1760880003111-556677889.pdf",
                  german_asset_url: "uploads/marketing/1760800000222-667788990.pdf",
                  youtube_url: null,
                  german_youtube_url: null,
                  width: null,
                  height: null,
                  description: "Updated one-page flyer for broker onboarding",
                  german_description: "Aktualisierter einseitiger Flyer für das Makler-Onboarding",
                  is_active: true,
                  createdAt: "2026-08-01T08:00:00.000Z",
                  updatedAt: "2026-10-19T14:01:00.000Z",
                },
              },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Admin - Marketing"],
      summary: "Delete marketing material by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Marketing material deleted",
          content: {
            "application/json": {
              example: { success: true, message: "Deleted successfully" },
            },
          },
        },
      },
    },
  },
};
