// index.js
const express = require('express');
const cors = require('cors');
const { validate } = require('./validator');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.post('/api/validate', (req, res) => {
  try {
    const source = req.body && typeof req.body.source === 'string' ? req.body.source : '';
    const result = validate(source);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`JCL validation API listening on http://localhost:${PORT}`);
});

module.exports = app;
