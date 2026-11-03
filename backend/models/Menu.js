'use strict';
const db = require('../config/db');

const CATEGORIES = ['Breakfast', 'Appetizers', 'Drinks', 'Main Course', 'Desserts'];

function clean(b, partial) {
  const out = {};
  const err = [];
  if (!partial || b.name !== undefined) {
    const v = String(b.name || '').trim();
    if (!v) err.push('Name is required');
    out.name = v;
  }
  if (!partial || b.price !== undefined) {
    const v = Number(b.price);
    if (!isFinite(v) || v < 0) err.push('Price must be a positive number');
    out.price = Math.round(v * 100) / 100;
  }
  if (!partial || b.category !== undefined) {
    const v = String(b.category || '').trim();
    if (!v) err.push('Category is required');
    out.category = v;
  }
  if (b.description !== undefined) out.description = String(b.description).trim();
  if (b.image !== undefined) out.image = String(b.image).trim();
  if (b.badge !== undefined) out.badge = String(b.badge).trim();
  if (b.available !== undefined) out.available = !!b.available;
  return { out, err };
}

module.exports = { col: db.menu, CATEGORIES, clean };
