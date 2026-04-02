'use strict';
const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('./dbService');

// Generate WPAI-XXXX-XXXX-XXXX-XXXX
function generateKey() {
    const seg = () => uuidv4().replace(/-/g, '').toUpperCase().slice(0, 4);
    return `WPAI-${seg()}-${seg()}-${seg()}-${seg()}`;
}

function createLicense(userId, plan = 'pro', stripeSubId = null, expiresAt = null) {
    const db  = getDb();
    const key = generateKey();
    db.prepare(`
        INSERT INTO licenses (user_id, license_key, plan, stripe_sub_id, expires_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(userId, key, plan, stripeSubId, expiresAt);
    return key;
}

function validateLicense(licenseKey, siteUrl = null) {
    const db  = getDb();
    const lic = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(licenseKey);

    if (!lic)                    return { valid: false, message: 'Unknown license key.' };
    if (lic.status !== 'active') return { valid: false, message: `License is ${lic.status}.` };

    const now = Math.floor(Date.now() / 1000);
    if (lic.expires_at && lic.expires_at < now) {
        db.prepare("UPDATE licenses SET status = 'expired' WHERE id = ?").run(lic.id);
        return { valid: false, message: 'License has expired.' };
    }

    // Upsert site registration
    if (siteUrl) {
        db.prepare(`
            INSERT INTO sites (user_id, site_url, license_key, last_seen)
            VALUES (?, ?, ?, unixepoch())
            ON CONFLICT(user_id, site_url) DO UPDATE SET last_seen = unixepoch()
        `).run(lic.user_id, siteUrl, licenseKey);
    }

    // Log the call (fire-and-forget, don't block response)
    db.prepare('INSERT INTO api_logs (license_key, endpoint, site_url) VALUES (?,?,?)')
      .run(licenseKey, 'validate', siteUrl ?? '');

    const expires = lic.expires_at
        ? new Date(lic.expires_at * 1000).toISOString().slice(0, 10)
        : null;

    return { valid: true, plan: lic.plan, expires };
}

function deactivateLicense(stripeSubId) {
    getDb()
        .prepare("UPDATE licenses SET status = 'cancelled' WHERE stripe_sub_id = ?")
        .run(stripeSubId);
}

function extendLicense(stripeSubId, plan) {
    const expiresAt = Math.floor(Date.now() / 1000) + 32 * 24 * 3600; // +32 days
    getDb()
        .prepare("UPDATE licenses SET status = 'active', plan = ?, expires_at = ? WHERE stripe_sub_id = ?")
        .run(plan, expiresAt, stripeSubId);
}

function getLicensesByUser(userId) {
    return getDb()
        .prepare('SELECT * FROM licenses WHERE user_id = ? ORDER BY created_at DESC')
        .all(userId);
}

function getSitesByUser(userId) {
    return getDb()
        .prepare('SELECT * FROM sites WHERE user_id = ? ORDER BY last_seen DESC')
        .all(userId);
}

function getStats() {
    const db = getDb();
    return {
        total_licenses: db.prepare('SELECT COUNT(*) as c FROM licenses').get().c,
        active_licenses: db.prepare("SELECT COUNT(*) as c FROM licenses WHERE status='active'").get().c,
        total_sites: db.prepare('SELECT COUNT(*) as c FROM sites').get().c,
        total_users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
        api_calls_today: db.prepare("SELECT COUNT(*) as c FROM api_logs WHERE ts > unixepoch('now','-1 day')").get().c,
    };
}

module.exports = {
    createLicense, validateLicense, deactivateLicense,
    extendLicense, getLicensesByUser, getSitesByUser, getStats,
};
