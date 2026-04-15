const { Sequelize, sequelize } = require("../config/database");

const TargetCustomerReferralLogs = sequelize.define(
    "referral_logs",
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        /** 🔗 Broker */
        broker_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: "brokers",
                key: "id",
            },
            onDelete: "CASCADE",
        },

        /** 👤 Who referred */
        from_customer_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            comment: "Referrer customer",
        },

        /** 👤 Who got referred */
        to_customer_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            comment: "Referred customer",
        },

        /** 📌 Type of log */
        type: {
            type: Sequelize.ENUM(
                "REFERRAL_CREATED",     // when referral happens
                "INVESTMENT_DONE",      // when referred customer invests
                "COMMISSION_EARNED",    // when commission calculated
                "COMMISSION_APPROVED",  // admin approved
                "COMMISSION_REJECTED"   // admin rejected
            ),
            allowNull: false,
        },

        /** 💰 Investment Amount */
        investment_amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: true,
        },

        /** 💸 Commission */
        commission_amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: true,
        },

        /** 🎯 Product */
        product: {
            type: Sequelize.ENUM(
                "easygold Token",
                "Primeinvest",
                "goldflex"
            ),
            allowNull: true,
        },

        /** ⚙️ Status */
        status: {
            type: Sequelize.ENUM(
                "PENDING",
                "APPROVED",
                "REJECTED"
            ),
            defaultValue: "PENDING",
        },
        approved_at: {
            type: Sequelize.DATE,
            allowNull: true,
        },

        /** 📝 Extra info */
        remark: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        address: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        tracking_number: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        tracking_link: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
    },
    {
        tableName: "target_customers_referral_logs",
        timestamps: true,
        indexes: [
            { fields: ["broker_id"] },
            { fields: ["from_customer_id"] },
            { fields: ["to_customer_id"] },
            { fields: ["type"] },
            { fields: ["status"] },
        ],
    }
);

module.exports = TargetCustomerReferralLogs;