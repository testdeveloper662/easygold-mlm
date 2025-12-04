const { Sequelize, sequelize } = require("../config/database");

const GoldPurchaseSellOrders = sequelize.define(
    "6lwup_sell_orders",
    {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },

        user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },

        tracking_number: {
            type: Sequelize.STRING(11),
            allowNull: false,
        },

        categories: {
            type: Sequelize.TEXT("long"),
            allowNull: true,
        },

        description: {
            type: Sequelize.TEXT,
            allowNull: true,
        },

        first_name: {
            type: Sequelize.STRING(100),
            allowNull: true,
        },

        last_name: {
            type: Sequelize.STRING(100),
            allowNull: true,
        },

        email: {
            type: Sequelize.STRING(150),
            allowNull: true,
        },

        phone: {
            type: Sequelize.STRING(20),
            allowNull: true,
        },

        address: {
            type: Sequelize.TEXT,
            allowNull: true,
        },

        zip_code: {
            type: Sequelize.STRING(20),
            allowNull: true,
        },

        city: {
            type: Sequelize.STRING(100),
            allowNull: true,
        },

        account_holder: {
            type: Sequelize.STRING(150),
            allowNull: true,
        },

        bank_name: {
            type: Sequelize.STRING(150),
            allowNull: true,
        },

        iban: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        bic: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        estimated_value: {
            type: Sequelize.DECIMAL(15, 2),
            allowNull: true,
        },

        valuation_basis: {
            type: Sequelize.STRING(100),
            allowNull: true,
        },

        pickup: {
            type: Sequelize.TEXT("long"),
            allowNull: true,
        },

        signature: {
            type: Sequelize.STRING(100),
            allowNull: false,
        },

        offer_send: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        offer_price_1: {
            type: Sequelize.FLOAT,
            allowNull: true,
        },

        offer_price_2: {
            type: Sequelize.FLOAT,
            allowNull: true,
        },

        confirmed_price: {
            type: Sequelize.FLOAT,
            allowNull: true,
        },

        confirm_email: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        b2b_email_send: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        status: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        color_status: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },

        updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },

        deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
        },
    },
    {
        timestamps: false,
        paranoid: true,
        deletedAt: "deleted_at",
        tableName: "6lwup_sell_orders",
    }
);

module.exports = GoldPurchaseSellOrders;
