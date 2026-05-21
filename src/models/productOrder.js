const { Sequelize, sequelize } = require("../config/database");

const ProductOrder = sequelize.define(
    "6lwup_product_order",
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

        trackingnumber: {
            type: Sequelize.STRING(11),
            allowNull: true,
        },

        tracking_link: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        action_status: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "0 = all steps empty, 1 = Tracking Number",
        },

        remaining_price: {
            type: Sequelize.FLOAT,
            allowNull: false,
            defaultValue: 0,
        },

        payment_type: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0,
            comment: "0 = swap, 1 = remaining, 2 = buy now",
        },

        payment_status: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "0 = payment pending, 1 = payment done",
        },

        order_status: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "0 = pending, 1 = done / mystore connection",
        },

        my_store_order_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        color_status: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "0 = red, 1 = green",
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
        tableName: "6lwup_product_order",
        timestamps: false,
    }
);

module.exports = ProductOrder;