const { Sequelize, sequelize } = require("../config/database");

const Users = require("./users");
const UsersMeta = require("./userMeta");
const LpOrders = require("./lpOrders");
const LpOrderCarts = require("./lpOrderCarts");
const LpOrderPivots = require("./lpOrderPivots");
const LpOrderShippingOptions = require("./lpOrderShippingOptions");
const Brokers = require("./brokers");
const BrokerCommissionHistory = require("./brokerCommissionHistory");
const AdminFixedBrokerCommission = require("./adminFixedBrokerCommission");

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.Users = Users;
db.UsersMeta = UsersMeta;
db.LpOrders = LpOrders;
db.LpOrderCarts = LpOrderCarts;
db.LpOrderPivots = LpOrderPivots;
db.LpOrderShippingOptions = LpOrderShippingOptions;
db.Brokers = Brokers;
db.BrokerCommissionHistory = BrokerCommissionHistory;
db.AdminFixedBrokerCommission = AdminFixedBrokerCommission;

module.exports = db;
