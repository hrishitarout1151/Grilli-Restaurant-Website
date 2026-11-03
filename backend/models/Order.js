'use strict';
const db = require('../config/db');
const STATUSES = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
const TYPES = ['dine-in', 'takeaway', 'delivery'];
const PAYMENTS = ['cod', 'demo-online'];
module.exports = { col: db.orders, STATUSES, TYPES, PAYMENTS };
