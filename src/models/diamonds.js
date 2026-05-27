const { Sequelize, sequelize } = require("../config/database");

const Diamonds = sequelize.define(
    "6lwup_diamonds",
    {
        id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },

        diamond_id: {
            type: Sequelize.STRING(255),
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
            type: Sequelize.STRING(255),
            allowNull: true,
        },

        lab: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        shape: {
            type: Sequelize.STRING(50),
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

        cut_grade: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        polish: {
            type: Sequelize.STRING(20),
            allowNull: true,
        },

        symmetry: {
            type: Sequelize.STRING(20),
            allowNull: true,
        },

        eyeclean: {
            type: Sequelize.STRING(20),
            allowNull: true,
        },

        length: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        width: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        depth: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        crownAngle: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        table_percentage: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        pavAngle: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        depthPercentage: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        girdle: {
            type: Sequelize.STRING(255),
            allowNull: true,
        },

        culetSize: {
            type: Sequelize.STRING(50),
            allowNull: true,
        },

        treated: {
            type: Sequelize.TINYINT,
            allowNull: true,
        },

        keyToSymbols: {
            type: Sequelize.TEXT,
            allowNull: true,
        },

        labgrown: {
            type: Sequelize.TINYINT,
            allowNull: true,
        },

        certNumber: {
            type: Sequelize.STRING(255),
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
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
    },
    {
        tableName: "6lwup_diamonds",
        timestamps: false,
    }
);

module.exports = Diamonds;