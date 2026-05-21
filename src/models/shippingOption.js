const { Sequelize, sequelize } = require("../config/database");

const ShippingOption = sequelize.define(
    "6LWUP_shipping_option",
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

        meta_key: {
            type: Sequelize.STRING(255),
            allowNull: true,
        },

        meta_value: {
            type: Sequelize.STRING(255),
            allowNull: true,
        },

        order_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
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
    },
    {
        tableName: "6LWUP_shipping_option",
        timestamps: false,
    }
);

module.exports = ShippingOption;