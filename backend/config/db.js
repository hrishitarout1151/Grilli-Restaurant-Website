'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json');
const NAMES = ['users', 'menu', 'orders', 'reservations', 'contacts'];

let data = {};
NAMES.forEach((n) => (data[n] = []));
let existed = false;

if (fs.existsSync(FILE)) {
  try {
    data = Object.assign(data, JSON.parse(fs.readFileSync(FILE, 'utf8')));
    existed = true;
  } catch (e) {
    console.error('db.json is corrupted, starting empty:', e.message);
  }
}

function flush() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

class Collection {
  constructor(name) { this.name = name; }
  get rows() { return data[this.name]; }
  all() { return this.rows.slice(); }
  find(fn) { return this.rows.filter(fn); }
  findOne(fn) { return this.rows.find(fn) || null; }
  byId(id) { return this.rows.find((r) => r.id === id) || null; }
  insert(doc) {
    const row = Object.assign({ id: crypto.randomUUID(), createdAt: new Date().toISOString() }, doc);
    this.rows.push(row);
    flush();
    return row;
  }
  update(id, patch) {
    const row = this.byId(id);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: new Date().toISOString() });
    flush();
    return row;
  }
  remove(id) {
    const i = this.rows.findIndex((r) => r.id === id);
    if (i === -1) return false;
    this.rows.splice(i, 1);
    flush();
    return true;
  }
  clear() { data[this.name] = []; }
}

const db = { existed, flush, FILE };
NAMES.forEach((n) => (db[n] = new Collection(n)));
module.exports = db;
