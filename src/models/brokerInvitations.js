const { Sequelize, sequelize } = require("../config/database");
const Brokers = require("./brokers");

const BrokerInvitations = sequelize.define(
    "broker_invitations",
    {
        id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },

        email: {
            type: Sequelize.STRING(255),
            allowNull: false,
            validate: {
                isEmail: true,
            },
        },

        invitation_status: {
            type: Sequelize.ENUM("SENT", "REGISTERED", "APPROVED", "REJECTED"),
            allowNull: false,
            defaultValue: "SENT",
        },

        invited_by: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: "brokers",
                key: "id",
            },
            onDelete: "CASCADE",
        },

        last_invitation_sent: {
            type: Sequelize.DATE,
            allowNull: true,
        },
    },
    {
        timestamps: true, // adds created_at & updated_at automatically
        underscored: true,
    }
);

// Relations
BrokerInvitations.belongsTo(Brokers, {
    foreignKey: "invited_by",
    as: "invitedByBroker",
});

module.exports = BrokerInvitations;
