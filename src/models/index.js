const { Sequelize, sequelize } = require("../config/database");

const Users = require("./users");
const Brokers = require("./brokers");

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.Users = Users;
db.Brokers = Brokers;

module.exports = db;
