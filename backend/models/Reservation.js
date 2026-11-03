'use strict';
const db = require('../config/db');
const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
module.exports = { col: db.reservations, STATUSES };
