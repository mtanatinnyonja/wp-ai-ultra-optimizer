'use strict';
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const { initDb } = require('./services/dbService');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : '*',
}));

// Stripe webhook needs the raw body – register BEFORE json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Global rate limit
app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 min
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
}));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/license',  require('./routes/license'));
app.use('/api/stripe',   require('./routes/stripe'));
app.use('/api/optimize', require('./routes/optimize'));

// Health check
app.get('/health', (_, res) => res.json({
    status: 'ok',
    version: '1.0.0',
    ts: Date.now(),
}));

// 404
app.use((_, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
    console.error('[ERROR]', err.message);
    res.status(err.status ?? 500).json({ error: err.message ?? 'Internal server error' });
});

// ── Boot ─────────────────────────────────────────────────────────────────────
initDb();
app.listen(PORT, () => {
    console.log(`🚀 WP AI Ultra Optimizer API  — port ${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV ?? 'development'}`);
});
