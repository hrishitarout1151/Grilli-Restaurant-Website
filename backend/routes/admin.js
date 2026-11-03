'use strict';
const router = require('express').Router();
const db = require('../config/db');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.use(auth.admin);

const day = (d) => new Date(d).toISOString().slice(0, 10);
const r2 = (n) => Math.round(n * 100) / 100;

router.get('/stats', (req, res) => {
  const orders = db.orders.all();
  const live = orders.filter((o) => o.status !== 'cancelled');
  const revenue = live.reduce((s, o) => s + o.total, 0);
  const todayStr = day(new Date());

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(day(d));
  }
  const revenueByDay = days.map((d) => {
    const of = live.filter((o) => day(o.createdAt) === d);
    return { date: d, revenue: r2(of.reduce((s, o) => s + o.total, 0)), orders: of.length };
  });

  const sold = {};
  live.forEach((o) => o.items.forEach((i) => { sold[i.name] = (sold[i.name] || 0) + i.qty; }));
  const topItems = Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));

  const byStatus = {};
  orders.forEach((o) => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });

  res.json({
    totalOrders: orders.length,
    revenue: r2(revenue),
    paidRevenue: r2(live.filter((o) => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0)),
    avgOrder: live.length ? r2(revenue / live.length) : 0,
    pendingOrders: orders.filter((o) => o.status === 'pending').length,
    totalReservations: db.reservations.all().length,
    pendingReservations: db.reservations.find((r) => r.status === 'pending').length,
    todayReservations: db.reservations.find((r) => r.date === todayStr && r.status !== 'cancelled').length,
    customers: db.users.find((u) => u.role === 'customer').length,
    menuItems: db.menu.all().length,
    unreadMessages: db.contacts.find((c) => c.type === 'enquiry' && !c.read).length,
    revenueByDay, topItems, byStatus,
  });
});

router.get('/customers', (req, res) => {
  const orders = db.orders.all();
  const list = db.users.find((u) => u.role === 'customer').map((u) => {
    const mine = orders.filter((o) => o.userId === u.id && o.status !== 'cancelled');
    return { ...User.publicView(u), orders: mine.length, spent: r2(mine.reduce((s, o) => s + o.total, 0)) };
  });
  res.json({ customers: list.reverse() });
});

module.exports = router;
