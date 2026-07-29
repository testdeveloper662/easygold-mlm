const { Sequelize, sequelize } = require("../config/database");

const PersonType = sequelize.define(
  "person_type",
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    value: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true,
    },
    label_en: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    label_de: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
  },
  {
    timestamps: true,
    tableName: "person_types",
  }
);

module.exports = PersonType;
