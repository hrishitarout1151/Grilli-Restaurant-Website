'use strict';
const router = require('express').Router();
const Contact = require('../models/Contact');
const mail = require('../config/mail');
const auth = require('../middleware/auth');

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim();
  const message = String(b.message || '').trim();
  if (name.length < 2) return res.status(400).json({ error: 'Enter your name' });
  if (!emailRe.test(email)) return res.status(400).json({ error: 'Enter a valid email' });
  if (message.length < 5) return res.status(400).json({ error: 'Write a short message' });

  const saved = Contact.col.insert({ type: 'enquiry', name, email, message: message.slice(0, 1000), read: false, emailed: false });
  const r = await mail.sendContact({ name, email, message: saved.message });
  if (r.sent) Contact.col.update(saved.id, { emailed: true });
  res.status(201).json({ ok: true, emailed: r.sent });
});

router.post('/subscribe', (req, res) => {
  const email = String((req.body || {}).email || '').trim();
  if (!emailRe.test(email)) return res.status(400).json({ error: 'Enter a valid email' });
  if (Contact.col.findOne((c) => c.type === 'subscriber' && c.email === email)) return res.json({ ok: true });
  Contact.col.insert({ type: 'subscriber', name: '', email, message: '', read: true });
  res.status(201).json({ ok: true });
});

router.get('/', auth.admin, (req, res) => res.json({ contacts: Contact.col.all().reverse() }));

router.patch('/:id', auth.admin, (req, res) => {
  const c = Contact.col.update(req.params.id, { read: !!req.body.read });
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json({ contact: c });
});

router.delete('/:id', auth.admin, (req, res) => {
  if (!Contact.col.remove(req.params.id)) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;