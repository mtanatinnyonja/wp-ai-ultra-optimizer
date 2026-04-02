'use strict';
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const header = req.headers['authorization'] ?? '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) return res.status(401).json({ error: 'Authorization header missing.' });

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

function requireAdmin(req, res, next) {
    const key = req.headers['x-admin-key'];
    if (!key || key !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: 'Forbidden.' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin };
