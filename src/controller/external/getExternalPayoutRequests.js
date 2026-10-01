const db = require("../../models");

const GetExternalPayoutRequests = async (req, res) => {
    try {
        const { email, page = 1, limit = 10, product } = req.query;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const user = await db.Users.findOne({
            where: { user_email: email },
            attributes: ["ID", "role_id"]
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        const B2B_TYPES = ["my_store", "api", "landing_page", "gold_purchase", "gold_purchase_sell_orders", "goldprice_fixing", "dealer_purchasing", "dealer_purchasing_diamond"];
        const TYPE_MAPPING = {
            easygoldtoken: "EASYGOLD_TOKEN",
            primeinvest: "PRIMEINVEST",
            goldflex: "GOLDFLEX",
        };
        
        const whereClause = { user_id: user.ID };
        
        if (product) {
            const prodLower = String(product).toLowerCase();
            if (B2B_TYPES.includes(prodLower)) {
                whereClause.payout_for = "B2B_DASHBOARD";
            } else {
                whereClause.payout_for = TYPE_MAPPING[prodLower] || prodLower.toUpperCase();
            }
        }

        const { count, rows } = await db.BrokerPayoutRequests.findAndCountAll({
            where: whereClause,
            limit: limitNum,
            offset: offset,
            order: [["createdAt", "DESC"]]
        });

        const baseUrl = process.env.NODE_URL || "http://localhost:4000";
        const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";

        const formattedRows = rows.map(row => {
            const rowData = row.toJSON ? row.toJSON() : row;
            if (rowData.invoice) {
                const normalizedInvoice = rowData.invoice.replace(/\\/g, '/').replace(/^\/+/, '');
                if (normalizedInvoice.startsWith("uploads/")) {
                    rowData.invoice_path = normalizedBaseUrl + normalizedInvoice;
                } else if (normalizedInvoice.startsWith("http")) {
                    rowData.invoice_path = normalizedInvoice;
                } else {
                    rowData.invoice_path = normalizedBaseUrl + "uploads/" + normalizedInvoice;
                }
            } else {
                rowData.invoice_path = null;
            }
            return rowData;
        });

        let roleValue = "";
        if (user.role_id === 2) roleValue = "BROKER";
        else if (user.role_id === 3) roleValue = "AFFILIATE";
        else if (user.role_id === 4) roleValue = "PRIVATE INDIVIDUAL";
        else if (user.role_id === 5) roleValue = "CUSTOMER";

        return res.status(200).json({
            success: true,
            role_id: user.role_id,
            role: roleValue,
            data: formattedRows,
            pagination: {
                total: count,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(count / limitNum)
            }
        });

    } catch (error) {
        console.error("Error in GetExternalPayoutRequests:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = GetExternalPayoutRequests;
