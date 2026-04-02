'use strict';
const router = require('express').Router();
const { validateLicense, createLicense, getLicensesByUser } = require('../services/licenseService');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getDb } = require('../services/dbService');

// POST /api/license/validate  ← called by the WP plugin every 24h
router.post('/validate', (req, res) => {
    const { license_key, site_url } = req.body;
    if (!license_key)
        return res.status(400).json({ valid: false, message: 'license_key is required.' });

    const result = validateLicense(license_key.trim(), site_url ?? null);
    res.json(result);
});

// GET /api/license/info  (authenticated user)
router.get('/info', requireAuth, (req, res) => {
    const licenses = getLicensesByUser(req.user.id);
    res.json({ licenses });
});

// POST /api/license/create  (admin only)
router.post('/create', requireAdmin, (req, res) => {
    const { user_id, plan, expires_days } = req.body;
    if (!user_id || !plan)
        return res.status(400).json({ error: 'user_id and plan are required.' });

    const expiresAt = expires_days
        ? Math.floor(Date.now() / 1000) + parseInt(expires_days) * 86400
        : null;

    const key = createLicense(parseInt(user_id), plan, null, expiresAt);
    res.status(201).json({ license_key: key, plan, expires_at: expiresAt });
});

// GET /api/license/stats  (admin only)
router.get('/stats', requireAdmin, (_req, res) => {
    const { getStats } = require('../services/licenseService');
    res.json(getStats());
});

// DELETE /api/license/:key  (admin only)
router.delete('/:key', requireAdmin, (req, res) => {
    const db = getDb();
    const info = db.prepare("UPDATE licenses SET status='cancelled' WHERE license_key=?")
                   .run(req.params.key);
    if (info.changes === 0) return res.status(404).json({ error: 'License not found.' });
    res.json({ message: 'License cancelled.' });
});

module.exports = router;
