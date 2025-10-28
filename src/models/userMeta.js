const { Sequelize, sequelize } = require("../config/database");

const UserMeta = sequelize.define(
  "6LWUP_usermeta",
  {
    umeta_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "6LWUP_users", // ✅ correctly references the Users table
        key: "ID",
      },
      onDelete: "CASCADE",
    },
    meta_key: {
      type: Sequelize.STRING(255), // ✅ add reasonable limit (WordPress uses varchar(255))
      allowNull: true,
    },
    meta_value: {
      type: Sequelize.TEXT("long"), // ✅ better type, WP stores long serialized data
      allowNull: true,
    },
  },
  {
    tableName: "6LWUP_usermeta",
    timestamps: false,
  }
);

module.exports = UserMeta;
