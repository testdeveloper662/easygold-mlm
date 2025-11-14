const { Sequelize, sequelize } = require("../config/database");
const Brokers = require("./brokers");

const BrokerBankDetails = sequelize.define(
    "broker_bank_details",
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
        broker_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: "brokers",
                key: "id",
            },
            onDelete: "CASCADE",
        },
    },
    {
        timestamps: true, // created_at, updated_at
        tableName: "broker_bank_details",
    }
);

// Associations
BrokerBankDetails.belongsTo(Brokers, { foreignKey: "broker_id", as: "broker" });
Brokers.hasOne(BrokerBankDetails, { foreignKey: "broker_id", as: "bank_details" });

module.exports = BrokerBankDetails;
