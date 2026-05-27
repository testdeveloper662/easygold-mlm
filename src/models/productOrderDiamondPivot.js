const { Sequelize, sequelize } = require("../config/database");

const ProductOrderPivotDiamond = sequelize.define(
    "6lwup_product_order_pivot_diamond",
    {
        id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },

        order_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },

        product_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },

        product_type: {
            type: Sequelize.STRING(50),
            allowNull: false,
        },

        quantity: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },

        price: {
            type: Sequelize.FLOAT,
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
        tableName: "6lwup_product_order_pivot_diamond",
        timestamps: false,
    }
);

module.exports = ProductOrderPivotDiamond;