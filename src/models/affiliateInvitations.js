const { Sequelize, sequelize } = require("../config/database");
const Brokers = require("./brokers");

const AffiliateInvitations = sequelize.define(
  "affiliate_invitations",
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
      allowNull: true,
      references: {
        model: "brokers",
        key: "id",
      },
      onDelete: "SET NULL",
    },
    last_invitation_sent: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "affiliate_invitations",
    underscored: true,
  }
);

AffiliateInvitations.belongsTo(Brokers, {
  foreignKey: "invited_by",
  as: "invitedByBroker",
});

module.exports = AffiliateInvitations;
