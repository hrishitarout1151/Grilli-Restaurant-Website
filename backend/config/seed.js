'use strict';
// Fills an empty database with the Grilli menu, an admin account and dummy customers/orders/bookings.
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('./db');
const owner = require('./owner');

function seed() {
  const hash = (p) => bcrypt.hashSync(p, 10);
  const daysAgo = (n, h = 13) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 15, 0, 0); return d.toISOString(); };
  const dateIn = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  const mk = (c, doc, createdAt) => { const r = c.insert(doc); if (createdAt) { r.createdAt = createdAt; } return r; };

  const admin = db.users.insert({ name: owner.name, email: owner.email.toLowerCase(), phone: owner.phone, role: 'admin', passwordHash: hash(owner.password) });
  const cust = [
    ['Aarav Mehta', 'aarav@example.com', '9876500001'],
    ['Priya Nair', 'priya@example.com', '9876500002'],
    ['Rohan Das', 'rohan@example.com', '9876500003'],
    ['Sneha Patel', 'sneha@example.com', '9876500004'],
    ['Karan Singh', 'karan@example.com', '9876500005'],
  ].map(([name, email, phone], i) => mk(db.users, { name, email, phone, role: 'customer', passwordHash: hash('Customer@123') }, daysAgo(20 - i * 2)));

  const menu = [
    ['Greek Salad', 25.5, 'Appetizers', 'Tomatoes, green bell pepper, sliced cucumber onion, olives, and feta cheese.', 'menu-1.png', 'Seasonal'],
    ['Lasagne', 40, 'Main Course', 'Vegetables, cheeses, ground meats, tomato sauce, seasonings and spices', 'menu-2.png', ''],
    ['Butternut Pumpkin', 10, 'Breakfast', 'Roasted butternut pumpkin with herbs, olive oil and toasted seeds.', 'menu-3.png', ''],
    ['Tokusen Wagyu', 39, 'Main Course', 'Premium wagyu beef grilled to order with seasonal vegetables and house sauce.', 'menu-4.png', 'New'],
    ['Olivas Rellenas', 25, 'Appetizers', 'Avocados with crab meat, red onion, crab salad stuffed red bell pepper and green bell pepper.', 'menu-5.png', ''],
    ['Opu Fish', 49, 'Main Course', 'Fresh catch of the day pan seared with lemon butter, capers and vegetables.', 'menu-6.png', ''],
  ].map(([name, price, category, description, image, badge]) =>
    db.menu.insert({ name, price, category, description, image: './assets/images/' + image, badge, available: true }));

  const statuses = ['delivered', 'delivered', 'delivered', 'ready', 'preparing', 'pending', 'delivered', 'cancelled'];
  const types = ['dine-in', 'takeaway', 'delivery'];
  for (let i = 0; i < 22; i++) {
    const u = cust[i % cust.length];
    const lines = [0, 1].map((k) => menu[(i * 2 + k * 3 + k) % menu.length]).filter((m, idx, a) => a.indexOf(m) === idx)
      .map((m, k) => ({ id: m.id, name: m.name, price: m.price, qty: 1 + ((i + k) % 3) }));
    const subtotal = Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100;
    const tax = Math.round(subtotal * 5) / 100;
    const online = i % 2 === 0;
    const st = i < 14 ? 'delivered' : statuses[i % statuses.length];
    mk(db.orders, {
      orderNo: 'DF' + (1000100 + i), userId: u.id, customerName: u.name, items: lines, subtotal, tax,
      total: Math.round((subtotal + tax) * 100) / 100, orderType: types[i % 3],
      address: types[i % 3] === 'delivery' ? '12 Sample Street, Bhubaneswar' : '', tableNo: types[i % 3] === 'dine-in' ? String(1 + (i % 8)) : '',
      phone: u.phone, note: '', paymentMethod: online ? 'demo-online' : 'cod',
      paymentStatus: st === 'cancelled' ? 'unpaid' : (online || st === 'delivered') ? 'paid' : 'unpaid',
      paymentRef: online ? 'DEMO-' + (100000 + i * 37) : '', status: st,
    }, daysAgo(Math.floor((21 - i) / 3), 12 + (i % 9)));
  }

  const slots = ['07:00pm', '08:00pm', '01:00pm', '09:00pm'];
  const rs = ['confirmed', 'pending', 'confirmed', 'pending', 'completed', 'cancelled'];
  for (let i = 0; i < 8; i++) {
    const u = cust[i % cust.length];
    mk(db.reservations, {
      bookingNo: 'BK' + (200100 + i), userId: u.id, name: u.name, phone: u.phone, guests: 2 + (i % 5),
      date: dateIn(i < 6 ? i - 1 : i), time: slots[i % slots.length], message: i % 3 === 0 ? 'Window table please' : '',
      status: rs[i % rs.length],
    }, daysAgo(7 - i));
  }

  db.contacts.insert({ type: 'enquiry', name: 'Meera Joshi', email: 'meera@example.com', message: 'Do you take bookings for a birthday party of 15 people next Saturday?', read: false });
  db.contacts.insert({ type: 'enquiry', name: 'Vikram Rao', email: 'vikram@example.com', message: 'Is there a vegetarian tasting menu available on weekdays?', read: true });
  db.contacts.insert({ type: 'subscriber', name: '', email: 'newsletter.fan@example.com', message: '', read: true });

  db.flush();
  console.log('Seeded: admin ' + owner.email + ', 5 demo customers (password Customer@123), 6 menu items, orders, bookings.');
}

if (require.main === module) {
  if (process.argv.includes('--reset') && fs.existsSync(db.FILE)) {
    ['users', 'menu', 'orders', 'reservations', 'contacts'].forEach((n) => db[n].clear());
  }
  seed();
}
module.exports = seed;
