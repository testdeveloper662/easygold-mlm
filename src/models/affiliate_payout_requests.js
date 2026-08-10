const { Sequelize, sequelize } = require("../config/database");
const Affiliates = require("./affiliates");

const AffiliatePayoutRequests = sequelize.define(
    "affiliate_payout_requests",
    {
        id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        affiliate_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: "affiliates",
                key: "id",
            },
            onDelete: "CASCADE",
        },
        amount: {
            type: Sequelize.FLOAT,
            allowNull: false,
        },
        invoice: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        payout_for: {
            type: Sequelize.ENUM("EASYGOLD_TOKEN", "PRIMEINVEST", "GOLDFLEX", "B2B_DASHBOARD"),
            allowNull: false,
        },
        status: {
            type: Sequelize.ENUM("PENDING", "APPROVED", "REJECTED"),
            allowNull: false,
            defaultValue: "PENDING",
        },
        rejection_reason: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
    },
    {
        timestamps: true,
        tableName: "affiliate_payout_requests",
    }
);

// Associations
AffiliatePayoutRequests.belongsTo(Affiliates, { foreignKey: "affiliate_id", as: "affiliate" });
Affiliates.hasMany(AffiliatePayoutRequests, { foreignKey: "affiliate_id", as: "payout_requests" });

module.exports = AffiliatePayoutRequests;
