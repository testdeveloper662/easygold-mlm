const db = require("../../models");
require("dotenv").config();

const GetBrokerOwnContract = async (req, res) => {
    try {
        const { user } = req.user;

        const broker = await db.Brokers.findOne({
            where: {
                user_id: user.ID,
            },
            include: [
                {
                    model: db.Users,
                    as: "user",
                    attributes: ["ID", "display_name", "user_email"],
                },
            ],
        });

        if (!broker) {
            return res.status(404).json({
                success: false,
                message: "Broker not found",
            });
        }

        const contracts = {
            maklervertrag_doc: broker.maklervertrag_doc
                ? `${process.env.NODE_URL}${broker.maklervertrag_doc}`
                : null,
            untermaklervertrag_doc: broker.untermaklervertrag_doc
                ? `${process.env.NODE_URL}${broker.untermaklervertrag_doc}`
                : null,
            inc_partnership_doc: broker.inc_partnership_doc
                ? `${process.env.NODE_URL}${broker.inc_partnership_doc}`
                : null,
            llc_partnership_doc: broker.llc_partnership_doc
                ? `${process.env.NODE_URL}${broker.llc_partnership_doc}`
                : null,
            goldflex_partnership_doc: broker.goldflex_partnership_doc
                ? `${process.env.NODE_URL}${broker.goldflex_partnership_doc}`
                : null,
            hartmann_benz_gmbh_doc: broker.hartmann_benz_gmbh_doc
                ? `${process.env.NODE_URL}${broker.hartmann_benz_gmbh_doc}`
                : null,
            binding_loi_doc: broker.binding_loi_doc
                ? `${process.env.NODE_URL}${broker.binding_loi_doc}`
                : null,
        };

        return res.status(200).json({
            success: true,
            message: "Broker contracts fetched successfully",
            data: contracts,
        });
    } catch (error) {
        console.error("Error fetching own contracts:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = GetBrokerOwnContract;