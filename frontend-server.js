'use strict';

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.FRONTEND_PORT || 8080;
const root = __dirname;

app.disable('x-powered-by');

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

app.get('/', (_req, res) => {
    res.redirect('/landing');
});

app.get('/landing', (_req, res) => {
    res.sendFile(path.join(root, 'landing', 'index.html'));
});

app.get('/dashboard', (_req, res) => {
    res.sendFile(path.join(root, 'dashboard', 'index.html'));
});

app.get('/wp-ai-optimizer.zip', (_req, res) => {
    res.sendFile(path.join(root, 'wp-ai-optimizer.zip'));
});

app.use('/landing', express.static(path.join(root, 'landing'), { index: false }));
app.use('/dashboard', express.static(path.join(root, 'dashboard'), { index: false }));
app.use('/plugin', express.static(path.join(root, 'plugin'), { index: false }));

app.use('/api', (_req, res) => {
    res.status(502).json({
        error: 'Reverse proxy not configured on frontend server. Use API at http://localhost:3000/api.',
    });
});

app.use((_req, res) => {
    res.status(404).send('Not found');
});

app.listen(PORT, () => {
    console.log(`Frontend server running on http://localhost:${PORT}`);
});
