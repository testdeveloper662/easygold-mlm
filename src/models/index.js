const { Sequelize, sequelize } = require("../config/database");

const Users = require("./users");
const Brokers = require("./brokers");
const AdminFixedBrokerCommission = require("./adminFixedBrokerCommission");

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.Users = Users;
db.Brokers = Brokers;
db.AdminFixedBrokerCommission = AdminFixedBrokerCommission;

module.exports = db;
