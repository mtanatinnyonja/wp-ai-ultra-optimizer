'use strict';
const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const { getDb } = require('../services/dbService');

router.get('/overview', requireAdmin, (_req, res) => {
    const db = getDb();

    const totalUsers = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
    const activeLicenses = db.prepare("SELECT COUNT(*) as n FROM licenses WHERE status='active'").get().n;
    const totalSites = db.prepare('SELECT COUNT(*) as n FROM sites').get().n;
    const apiCallsToday = db.prepare("SELECT COUNT(*) as n FROM api_logs WHERE ts >= unixepoch('now','start of day')").get().n;
    const pendingMobileMoney = db.prepare("SELECT COUNT(*) as n FROM payment_intents WHERE status IN ('pending','submitted')").get().n;

    res.json({
        total_users: totalUsers,
        active_licenses: activeLicenses,
        registered_sites: totalSites,
        api_calls_today: apiCallsToday,
        pending_mobile_money: pendingMobileMoney,
    });
});

module.exports = router;
