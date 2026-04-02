#!/usr/bin/env node
/**
 * Admin CLI — seed data and manage licenses manually
 * Usage:
 *   node db/seed.js create-user admin@example.com password123
 *   node db/seed.js create-license 1 pro 365
 *   node db/seed.js list-users
 *   node db/seed.js stats
 */
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { initDb, getDb }      = require('../services/dbService');
const { createLicense, getStats } = require('../services/licenseService');
const bcrypt = require('bcryptjs');

const [,, cmd, ...args] = process.argv;
initDb();
const db = getDb();

switch (cmd) {
    case 'create-user': {
        const [email, password] = args;
        if (!email || !password) { console.error('Usage: create-user <email> <password>'); process.exit(1); }
        const hash = bcrypt.hashSync(password, 12);
        try {
            db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hash);
            const u = db.prepare('SELECT id, email, created_at FROM users WHERE email = ?').get(email);
            console.log('User created:', u);
        } catch { console.error('Email already exists.'); }
        break;
    }
    case 'create-license': {
        const [userId, plan, days] = args;
        if (!userId || !plan) { console.error('Usage: create-license <user_id> <plan> [days]'); process.exit(1); }
        const expiresAt = days ? Math.floor(Date.now()/1000) + parseInt(days) * 86400 : null;
        const key = createLicense(parseInt(userId), plan, null, expiresAt);
        console.log('License created:', key);
        console.log('Expires:', expiresAt ? new Date(expiresAt*1000).toISOString() : 'never');
        break;
    }
    case 'list-users': {
        console.table(db.prepare('SELECT id, email, created_at FROM users').all());
        break;
    }
    case 'list-licenses': {
        console.table(db.prepare('SELECT * FROM licenses ORDER BY created_at DESC LIMIT 50').all());
        break;
    }
    case 'stats': {
        console.log('\n=== WP AI Ultra Optimizer — Stats ===');
        console.table(getStats());
        break;
    }
    default:
        console.log('Commands: create-user, create-license, list-users, list-licenses, stats');
}
