'use strict';
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const User = {
  col: db.users,
  findByEmail(email) {
    const e = String(email || '').trim().toLowerCase();
    return db.users.findOne((u) => u.email === e);
  },
  async create({ name, email, phone, password, role = 'customer' }) {
    return db.users.insert({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : '',
      role,
      passwordHash: await bcrypt.hash(password, 10),
    });
  },
  check(user, password) { return bcrypt.compare(password, user.passwordHash); },
  publicView(u) {
    if (!u) return null;
    const { passwordHash, ...rest } = u;
    return rest;
  },
};
module.exports = User;
