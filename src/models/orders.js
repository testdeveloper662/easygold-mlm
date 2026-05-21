const { Sequelize, sequelize } = require("../config/database");

const Order = sequelize.define(
    "6LWUP_order",
    {
        id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },

        user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },

        status: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment:
                "0=PriceFixation, 1=ConsignmentSlip, 2=ShippingOption",
        },

        trackingnumber: {
            type: Sequelize.STRING(225),
            allowNull: true,
        },

        transport: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "0=own_transport, 1=enter_pickup",
        },

        date: {
            type: Sequelize.DATEONLY,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },

        action_status: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment:
                "0=all steps empty, 1=Tracking Number, 2=Confirmation Of Receipt, 3=Metal & Recycling",
        },

        color_status: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "0=red, 1=green",
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
        tableName: "6LWUP_order",
        timestamps: false,
    }
);

module.exports = Order;