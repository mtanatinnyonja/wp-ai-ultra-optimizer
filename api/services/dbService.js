'use strict';
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

let db;

function initDb() {
    const dbPath = process.env.DB_PATH ?? path.join(__dirname, '../db/wpai.db');
    const dir    = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            email      TEXT    UNIQUE NOT NULL,
            password   TEXT    NOT NULL,
            created_at INTEGER DEFAULT (unixepoch())
        );
        CREATE TABLE IF NOT EXISTS licenses (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            license_key   TEXT    UNIQUE NOT NULL,
            plan          TEXT    NOT NULL DEFAULT 'free',
            stripe_sub_id TEXT,
            status        TEXT    NOT NULL DEFAULT 'active',
            expires_at    INTEGER,
            created_at    INTEGER DEFAULT (unixepoch())
        );
        CREATE TABLE IF NOT EXISTS sites (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            site_url    TEXT    NOT NULL,
            license_key TEXT    NOT NULL,
            last_seen   INTEGER DEFAULT (unixepoch()),
            UNIQUE(user_id, site_url)
        );
        CREATE TABLE IF NOT EXISTS api_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            license_key TEXT,
            endpoint    TEXT,
            site_url    TEXT,
            ts          INTEGER DEFAULT (unixepoch())
        );
        CREATE TABLE IF NOT EXISTS payment_intents (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            reference      TEXT    UNIQUE NOT NULL,
            email          TEXT,
            plan           TEXT    NOT NULL,
            method         TEXT    NOT NULL,
            provider       TEXT,
            amount_label   TEXT,
            status         TEXT    NOT NULL DEFAULT 'pending',
            external_ref   TEXT,
            success_url    TEXT,
            cancel_url     TEXT,
            created_at     INTEGER DEFAULT (unixepoch()),
            updated_at     INTEGER DEFAULT (unixepoch())
        );
        CREATE INDEX IF NOT EXISTS idx_lic_key ON licenses(license_key);
        CREATE INDEX IF NOT EXISTS idx_lic_sub ON licenses(stripe_sub_id);
        CREATE INDEX IF NOT EXISTS idx_log_ts  ON api_logs(ts);
        CREATE INDEX IF NOT EXISTS idx_pi_ref  ON payment_intents(reference);
        CREATE INDEX IF NOT EXISTS idx_pi_stat ON payment_intents(status);
    `);

    console.log('[DB] SQLite ready:', dbPath);
    return db;
}

function getDb() {
    if (!db) throw new Error('DB not initialized — call initDb() first');
    return db;
}

module.exports = { initDb, getDb };
