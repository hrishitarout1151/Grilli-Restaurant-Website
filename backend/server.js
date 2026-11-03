'use strict';
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

if (!db.existed || db.users.all().length === 0) require('./config/seed')();

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/admin', require('./routes/admin'));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));

// the original Grilli website is served as-is from /grilli
app.use(express.static(path.join(__dirname, '..', 'grilli')));

app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Bad JSON' });
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log('\n  Grilli running');
  console.log('  Website : http://localhost:' + PORT);
  console.log('  Admin   : http://localhost:' + PORT + '/admin.html\n');
});
