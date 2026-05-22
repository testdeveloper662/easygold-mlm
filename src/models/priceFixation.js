const { Sequelize, sequelize } = require("../config/database");

const PriceFixation = sequelize.define(
    "6LWUP_price_fixation",
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

        fine_metal: {
            type: Sequelize.STRING(20),
            allowNull: false,
        },

        discount: {
            type: Sequelize.DOUBLE,
            allowNull: false,
        },

        current_compensation: {
            type: Sequelize.DOUBLE,
            allowNull: false,
        },

        quote: {
            type: Sequelize.DOUBLE,
            allowNull: false,
        },

        price_fixation_g: {
            type: Sequelize.INTEGER(50),
            allowNull: false,
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
        tableName: "6LWUP_price_fixation",
        timestamps: false,
    }
);

module.exports = PriceFixation;