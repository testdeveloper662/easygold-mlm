const { Sequelize, sequelize } = require("../config/database");

const Gemstones = sequelize.define(
    "6lwup_gemstones",
    {
        id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },

        gemstone_id: {
            type: Sequelize.STRING(100),
            allowNull: true,
        },

        stock_id: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        video: {
            type: Sequelize.TEXT,
            allowNull: true,
        },

        image: {
            type: Sequelize.TEXT,
            allowNull: true,
        },

        pdf: {
            type: Sequelize.TEXT,
            allowNull: true,
        },

        mine_of_origin: {
            type: Sequelize.STRING(255),
            allowNull: true,
        },

        certificate_id: {
            type: Sequelize.STRING(100),
            allowNull: true,
        },

        gemType: {
            type: Sequelize.STRING(100),
            allowNull: true,
        },

        lab: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        shape: {
            type: Sequelize.STRING(100),
            allowNull: true,
        },

        carats: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
        },

        color: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        clarity: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        cut: {
            type: Sequelize.STRING(100),
            allowNull: true,
        },

        length: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
        },

        width: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
        },

        depth: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
        },

        certNumber: {
            type: Sequelize.STRING(100),
            allowNull: true,
        },

        treatment: {
            type: Sequelize.STRING(100),
            allowNull: true,
        },

        price: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0.0,
        },

        discount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0.0,
        },

        created_at: {
            type: Sequelize.DATE,
            allowNull: true,
        },

        updated_at: {
            type: Sequelize.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "6lwup_gemstones",
        timestamps: false,
    }
);

module.exports = Gemstones;