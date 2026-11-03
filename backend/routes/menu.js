'use strict';
const router = require('express').Router();
const Menu = require('../models/Menu');
const auth = require('../middleware/auth');

router.get('/', (req, res) => {
  const { category, q, all } = req.query;
  let items = Menu.col.all();
  if (all !== '1') items = items.filter((i) => i.available !== false);
  if (category && category !== 'All') items = items.filter((i) => i.category === category);
  if (q) {
    const s = String(q).toLowerCase();
    items = items.filter((i) => (i.name + ' ' + (i.description || '')).toLowerCase().includes(s));
  }
  res.json({ items, categories: Menu.CATEGORIES });
});

router.post('/', auth.admin, (req, res) => {
  const { out, err } = Menu.clean(req.body || {}, false);
  if (err.length) return res.status(400).json({ error: err.join(', ') });
  res.status(201).json({ item: Menu.col.insert({ description: '', image: '', badge: '', available: true, ...out }) });
});

router.put('/:id', auth.admin, (req, res) => {
  const { out, err } = Menu.clean(req.body || {}, true);
  if (err.length) return res.status(400).json({ error: err.join(', ') });
  const item = Menu.col.update(req.params.id, out);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ item });
});

router.delete('/:id', auth.admin, (req, res) => {
  if (!Menu.col.remove(req.params.id)) return res.status(404).json({ error: 'Item not found' });
  res.json({ ok: true });
});

module.exports = router;
