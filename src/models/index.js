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
const MyStoreSetting = require("./mystoreSetting");
const MyStoreOrder = require("./mystoreOrder");
const MyStoreOrderPivots = require("./mystoreOrderPivots");
const MyStoreOrderShippingOptions = require("./mystoreOrderShippingOptions");
const Product = require("./product");
const EmailView = require("./emailView");
const BrokerBankDetails = require("./broker_bank_details");
const BrokerPayoutRequests = require("./broker_payout_requests");
const TargetCustomers = require("./targetCustomers");

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
db.MyStoreSetting = MyStoreSetting;
db.MyStoreOrder = MyStoreOrder;
db.MyStoreOrderPivots = MyStoreOrderPivots;
db.MyStoreOrderShippingOptions = MyStoreOrderShippingOptions;
db.Product = Product;
db.EmailView = EmailView;
db.BrokerBankDetails = BrokerBankDetails;
db.BrokerPayoutRequests = BrokerPayoutRequests;
db.TargetCustomers = TargetCustomers;

// Relationships
db.TargetCustomers.belongsTo(db.Brokers, {
  foreignKey: "broker_id",
  as: "broker",
});

db.Brokers.hasMany(db.TargetCustomers, {
  foreignKey: "broker_id",
  as: "target_customers",
});

db.BrokerCommissionHistory.belongsTo(db.Users, {
  foreignKey: "user_id",
  as: "commission_from_user",
});

db.LpOrders.hasOne(db.Brokers, {
  foreignKey: "user_id",
  sourceKey: "user_id",
  as: "user_broker",
});
db.MyStoreOrder.hasOne(db.Brokers, {
  foreignKey: "user_id",
  sourceKey: "user_id",
  as: "user_broker",
});

db.Users.hasMany(db.UsersMeta, {
  foreignKey: "user_id",
  as: "user_meta",
});

db.UsersMeta.belongsTo(db.Users, {
  foreignKey: "user_id",
  as: "user",
});

module.exports = db;
