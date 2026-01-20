const { Sequelize, sequelize } = require("../config/database");

const TaxCountry = sequelize.define(
    "6lwup_tax_country",
    {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },

        Country_name: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        Code: {
            type: Sequelize.STRING(20),
            allowNull: true,
        },

        Tax: {
            type: Sequelize.INTEGER,
            allowNull: true,
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
        timestamps: false,        // Because table already has timestamps
        tableName: "6lwup_tax_country",
    }
);

module.exports = TaxCountry;
