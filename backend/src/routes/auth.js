const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'missing fields' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const r = await db.query(
      'INSERT INTO users (username, password_hash) VALUES ($1,$2) RETURNING id, username',
      [username, hash]
    );
    const user = r.rows[0];
    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'user exists' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const r = await db.query('SELECT * FROM users WHERE username=$1', [username]);
  if (r.rowCount === 0) return res.status(401).json({ error: 'invalid credentials' });
  const user = r.rows[0];

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
  res.json({ token });
});

module.exports = router;
