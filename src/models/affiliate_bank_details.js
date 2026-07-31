const { Sequelize, sequelize } = require("../config/database");
const Affiliates = require("./affiliates");

const AffiliateBankDetails = sequelize.define(
    "affiliate_bank_details",
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        ac_holder_name: {
            type: Sequelize.STRING(255),
            allowNull: false,
        },
        iban: {
            type: Sequelize.STRING(50),
            allowNull: false,
        },
        bic_swift_code: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },
        bank_name: {
            type: Sequelize.STRING(255),
            allowNull: false,
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
    },
    {
        timestamps: true,
        tableName: "affiliate_bank_details",
    }
);

// Associations
AffiliateBankDetails.belongsTo(Affiliates, { foreignKey: "affiliate_id", as: "affiliate" });
Affiliates.hasOne(AffiliateBankDetails, { foreignKey: "affiliate_id", as: "bank_details" });

module.exports = AffiliateBankDetails;
