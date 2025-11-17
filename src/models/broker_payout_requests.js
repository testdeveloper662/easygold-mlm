const { Sequelize, sequelize } = require("../config/database");
const Brokers = require("./brokers");

const BrokerPayoutRequests = sequelize.define(
    "broker_payout_requests",
    {
        id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        broker_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: "brokers",
                key: "id",
            },
            onDelete: "CASCADE",
        },
        amount: {
            type: Sequelize.FLOAT,
            allowNull: false,
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
    },
    {
        timestamps: true, // created_at, updated_at
    }
);

// Associations
BrokerPayoutRequests.belongsTo(Brokers, { foreignKey: "broker_id", as: "broker" });

module.exports = BrokerPayoutRequests;
