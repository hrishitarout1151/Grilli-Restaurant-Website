'use strict';
const router = require('express').Router();
const Res = require('../models/Reservation');
const auth = require('../middleware/auth');

router.post('/', auth.optional, (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  const phone = String(b.phone || '').trim();
  const guests = Math.floor(Number(b.guests));
  const date = String(b.date || '');
  const time = String(b.time || '').trim();
  if (name.length < 2) return res.status(400).json({ error: 'Enter your name' });
  if (phone.length < 7) return res.status(400).json({ error: 'Enter a valid phone number' });
  if (!(guests >= 1 && guests <= 20)) return res.status(400).json({ error: 'Guests must be between 1 and 20' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) return res.status(400).json({ error: 'Pick a valid date' });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (new Date(date + 'T00:00:00') < today) return res.status(400).json({ error: 'Date cannot be in the past' });
  if (!time) return res.status(400).json({ error: 'Pick a time' });

  const clash = Res.col.find((r) => r.date === date && r.time === time && r.status !== 'cancelled').length;
  if (clash >= 10) return res.status(409).json({ error: 'That slot is fully booked, please pick another time' });

  const r = Res.col.insert({
    bookingNo: 'BK' + Date.now().toString().slice(-6),
    userId: req.user ? req.user.id : null,
    name, phone, guests, date, time,
    message: String(b.message || '').trim().slice(0, 500),
    status: 'pending',
  });
  res.status(201).json({ reservation: r });
});

router.get('/mine', auth.required, (req, res) => {
  res.json({ reservations: Res.col.find((r) => r.userId === req.user.id).reverse() });
});

router.get('/', auth.admin, (req, res) => {
  res.json({ reservations: Res.col.all().sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)) });
});

router.patch('/:id', auth.admin, (req, res) => {
  if (!Res.STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
  const r = Res.col.update(req.params.id, { status: req.body.status });
  if (!r) return res.status(404).json({ error: 'Reservation not found' });
  res.json({ reservation: r });
});

router.delete('/:id', auth.admin, (req, res) => {
  if (!Res.col.remove(req.params.id)) return res.status(404).json({ error: 'Reservation not found' });
  res.json({ ok: true });
});

module.exports = router;
