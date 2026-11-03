'use strict';
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const SECRET = process.env.JWT_SECRET || 'dineflow-dev-secret-change-me';

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
}

function read(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    const p = jwt.verify(h.slice(7), SECRET);
    return db.users.byId(p.id);
  } catch (e) { return null; }
}

// attaches req.user when a valid token is present, never blocks
function optional(req, res, next) { req.user = read(req); next(); }

function required(req, res, next) {
  const u = read(req);
  if (!u) return res.status(401).json({ error: 'Please log in first' });
  req.user = u;
  next();
}

function admin(req, res, next) {
  required(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access only' });
    next();
  });
}

module.exports = { sign, optional, required, admin };
