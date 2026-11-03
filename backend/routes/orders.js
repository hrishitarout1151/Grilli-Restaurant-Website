'use strict';
const router = require('express').Router();
const Order = require('../models/Order');
const Menu = require('../models/Menu');
const auth = require('../middleware/auth');

// place an order - prices always come from the menu, never from the browser
router.post('/', auth.required, (req, res) => {
  const b = req.body || {};
  if (!Array.isArray(b.items) || !b.items.length) return res.status(400).json({ error: 'Your cart is empty' });
  if (!Order.TYPES.includes(b.orderType)) return res.status(400).json({ error: 'Choose dine-in, takeaway or delivery' });
  if (!Order.PAYMENTS.includes(b.paymentMethod)) return res.status(400).json({ error: 'Choose a payment method' });
  const phone = String(b.phone || '').trim();
  if (phone.length < 7) return res.status(400).json({ error: 'Enter a valid phone number' });
  if (b.orderType === 'delivery' && !String(b.address || '').trim()) return res.status(400).json({ error: 'Delivery address is required' });

  const lines = [];
  for (const it of b.items.slice(0, 50)) {
    const m = Menu.col.byId(it.id);
    const qty = Math.floor(Number(it.qty));
    if (!m || m.available === false) return res.status(400).json({ error: 'An item in your cart is no longer available' });
    if (!(qty >= 1 && qty <= 20)) return res.status(400).json({ error: 'Quantity must be between 1 and 20' });
    lines.push({ id: m.id, name: m.name, price: m.price, qty });
  }
  const subtotal = Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100;
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const paid = b.paymentMethod === 'demo-online';

  const order = Order.col.insert({
    orderNo: 'DF' + Date.now().toString().slice(-7),
    userId: req.user.id,
    customerName: req.user.name,
    items: lines,
    subtotal, tax, total,
    orderType: b.orderType,
    address: String(b.address || '').trim(),
    tableNo: String(b.tableNo || '').trim(),
    phone,
    note: String(b.note || '').trim().slice(0, 300),
    paymentMethod: b.paymentMethod,
    paymentStatus: paid ? 'paid' : 'unpaid',
    paymentRef: paid ? 'DEMO-' + Math.random().toString(36).slice(2, 10).toUpperCase() : '',
    status: 'pending',
  });
  res.status(201).json({ order });
});

router.get('/mine', auth.required, (req, res) => {
  res.json({ orders: Order.col.find((o) => o.userId === req.user.id).reverse() });
});

router.get('/', auth.admin, (req, res) => {
  res.json({ orders: Order.col.all().reverse() });
});

router.patch('/:id', auth.admin, (req, res) => {
  const patch = {};
  if (req.body.status !== undefined) {
    if (!Order.STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
    patch.status = req.body.status;
  }
  if (req.body.paymentStatus !== undefined) {
    if (!['paid', 'unpaid', 'refunded'].includes(req.body.paymentStatus)) return res.status(400).json({ error: 'Invalid payment status' });
    patch.paymentStatus = req.body.paymentStatus;
  }
  const o = Order.col.update(req.params.id, patch);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  res.json({ order: o });
});

router.delete('/:id', auth.admin, (req, res) => {
  if (!Order.col.remove(req.params.id)) return res.status(404).json({ error: 'Order not found' });
  res.json({ ok: true });
});

module.exports = router;
