'use strict';
const router = require('express').Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || String(name).trim().length < 2) return res.status(400).json({ error: 'Enter your name' });
  if (!emailRe.test(String(email || ''))) return res.status(400).json({ error: 'Enter a valid email' });
  if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password needs at least 6 characters' });
  if (User.findByEmail(email)) return res.status(409).json({ error: 'This email is already registered' });
  const user = await User.create({ name, email, phone, password });
  res.status(201).json({ token: auth.sign(user), user: User.publicView(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = User.findByEmail(email);
  if (!user || !(await User.check(user, String(password || '')))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  res.json({ token: auth.sign(user), user: User.publicView(user) });
});

router.get('/me', auth.required, (req, res) => res.json({ user: User.publicView(req.user) }));

module.exports = router;
