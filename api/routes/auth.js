'use strict';
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { getDb } = require('../services/dbService');
const { getLicensesByUser, getSitesByUser } = require('../services/licenseService');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'email and password are required.' });
    if (password.length < 8)
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const hash = await bcrypt.hash(password, 12);
    try {
        const db = getDb();
        db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hash);
        res.status(201).json({ message: 'Account created. You can now log in.' });
    } catch {
        res.status(409).json({ error: 'An account with this email already exists.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'email and password are required.' });

    const db   = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !(await bcrypt.compare(password, user.password)))
        return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, email: user.email } });
});

// GET /api/auth/me  (authenticated)
router.get('/me', requireAuth, (req, res) => {
    const licenses = getLicensesByUser(req.user.id);
    const sites    = getSitesByUser(req.user.id);
    res.json({ user: req.user, licenses, sites });
});

module.exports = router;
