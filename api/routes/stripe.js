'use strict';
const router = require('express').Router();
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createLicense, deactivateLicense, extendLicense } = require('../services/licenseService');
const { getDb } = require('../services/dbService');
const { requireAdmin } = require('../middleware/auth');

const PLAN_MAP = {
    [process.env.STRIPE_PRICE_PRO]:    'pro',
    [process.env.STRIPE_PRICE_AGENCY]: 'agency',
};

const PLAN_PRICE_MAP = {
    pro: process.env.STRIPE_PRICE_PRO,
    agency: process.env.STRIPE_PRICE_AGENCY,
};

function getPaymentMethods(plan) {
    return [
        {
            id: 'stripe_card',
            label: 'Card (Stripe)',
            badge: 'INSTANT',
            description: 'Visa / Mastercard via Stripe Checkout.',
            enabled: Boolean(process.env.STRIPE_SECRET_KEY),
        },
        {
            id: 'mada_mobile_money',
            label: 'Mobile Money Madagascar',
            badge: 'MADA',
            description: process.env.MADA_MOBILE_MONEY_CHECKOUT_URL
                ? 'Mvola, Orange Money, Airtel Money via local payment partner.'
                : 'Mvola, Orange Money, Airtel Money with manual confirmation fallback.',
            enabled: true,
            setup_required: !process.env.MADA_MOBILE_MONEY_CHECKOUT_URL,
            provider: process.env.MADA_MOBILE_MONEY_PROVIDER ?? 'local-partner',
            plan,
        },
    ];
}

function createPaymentIntent({ email, plan, method, provider, success_url, cancel_url }) {
    const reference = `MM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const amountLabel = plan === 'agency' ? 'EUR 29 / month' : 'EUR 10 / month';
    const db = getDb();
    db.prepare(`
        INSERT INTO payment_intents
        (reference, email, plan, method, provider, amount_label, status, success_url, cancel_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, unixepoch(), unixepoch())
    `).run(reference, email ?? null, plan, method, provider, amountLabel, success_url ?? null, cancel_url ?? null);
    return { reference, amountLabel };
}

// Helper: find or create a user by email
function upsertUser(email) {
    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
        db.prepare("INSERT INTO users (email, password) VALUES (?, 'stripe-managed')").run(email);
        user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    }
    return user;
}

// POST /api/stripe/create-checkout
router.post('/create-checkout', async (req, res) => {
    const { email, price_id, success_url, cancel_url } = req.body;
    if (!price_id) return res.status(400).json({ error: 'price_id is required.' });

    try {
        const params = {
            mode: 'subscription',
            line_items: [{ price: price_id, quantity: 1 }],
            success_url: success_url ?? `${req.headers.origin}/success`,
            cancel_url:  cancel_url  ?? `${req.headers.origin}/cancel`,
            metadata:    { plan: PLAN_MAP[price_id] ?? 'pro' },
            allow_promotion_codes: true,
        };
        if (email) params.customer_email = email;

        const session = await stripe.checkout.sessions.create(params);
        res.json({ url: session.url, session_id: session.id });
    } catch (e) {
        console.error('[Stripe checkout]', e.message);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/stripe/payment-options
router.get('/payment-options', (req, res) => {
    const plan = ['pro', 'agency'].includes(req.query.plan) ? req.query.plan : 'pro';
    res.json({
        plan,
        methods: getPaymentMethods(plan),
        free_download_url: process.env.FREE_PLUGIN_DOWNLOAD_URL ?? '/wp-ai-optimizer.zip',
        note: 'WordPress.org validation pending: Free and Paid are available directly on your website.',
    });
});

// POST /api/stripe/create-mobile-money-intent
router.post('/create-mobile-money-intent', (req, res) => {
    const plan = ['pro', 'agency'].includes(req.body.plan) ? req.body.plan : 'pro';
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : null;
    const providerUrl = process.env.MADA_MOBILE_MONEY_CHECKOUT_URL;
    const providerName = process.env.MADA_MOBILE_MONEY_PROVIDER ?? 'local-partner';

    const intent = createPaymentIntent({
        email,
        plan,
        method: 'mada_mobile_money',
        provider: providerName,
        success_url: req.body.success_url,
        cancel_url: req.body.cancel_url,
    });

    if (!providerUrl) {
        const origin = req.headers.origin ?? `${req.protocol}://${req.get('host')}`;
        return res.json({
            provider: providerName,
            plan,
            reference: intent.reference,
            mode: 'manual-fallback',
            url: `${origin}/api/stripe/mobile-money/checkout/${intent.reference}`,
        });
    }

    const url = new URL(providerUrl);
    url.searchParams.set('plan', plan);
    url.searchParams.set('price_id', PLAN_PRICE_MAP[plan] ?? process.env.STRIPE_PRICE_PRO ?? '');
    url.searchParams.set('reference', intent.reference);
    if (email) url.searchParams.set('email', email);
    if (req.body.success_url) url.searchParams.set('success_url', req.body.success_url);
    if (req.body.cancel_url) url.searchParams.set('cancel_url', req.body.cancel_url);

    return res.json({
        provider: providerName,
        plan,
        reference: intent.reference,
        mode: 'provider-hosted',
        url: url.toString(),
    });
});

// GET /api/stripe/mobile-money/checkout/:reference
router.get('/mobile-money/checkout/:reference', (req, res) => {
    const db = getDb();
    const intent = db.prepare('SELECT * FROM payment_intents WHERE reference = ?').get(req.params.reference);
    if (!intent) return res.status(404).send('Payment reference not found.');

    const supportEmail = process.env.MADA_SUPPORT_EMAIL ?? 'billing@wpai.com';
    const provider = intent.provider ?? 'local-partner';

    return res.send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mobile Money Checkout</title>
<style>
body{font-family:Arial,sans-serif;background:#06101a;color:#dff0fb;padding:24px}
.card{max-width:680px;margin:0 auto;background:#0f1e2d;border:1px solid #1e3347;border-radius:12px;padding:20px}
h1{margin:0 0 10px;font-size:22px}.muted{color:#8caec8}.row{margin:8px 0}
input,select{width:100%;padding:10px;border-radius:8px;border:1px solid #29445f;background:#071424;color:#dff0fb}
button{margin-top:12px;padding:10px 16px;border:none;border-radius:8px;background:#00d4ff;color:#032030;font-weight:700;cursor:pointer}
.ref{font-family:monospace;background:#081726;padding:4px 8px;border-radius:6px}
</style></head><body>
<div class="card">
<h1>Mobile Money Checkout</h1>
<p class="muted">Provider: ${provider} | Plan: ${intent.plan.toUpperCase()} | Amount: ${intent.amount_label}</p>
<p>Reference: <span class="ref">${intent.reference}</span></p>
<p class="muted">Pay with Mvola, Orange Money, or Airtel Money, then submit your transaction details below for instant admin validation.</p>
<form method="post" action="/api/stripe/mobile-money/confirm/${intent.reference}">
<div class="row"><label>Payer name</label><input name="payer_name" required></div>
<div class="row"><label>Phone number</label><input name="payer_phone" required placeholder="034 / 032 / 033..."></div>
<div class="row"><label>Network</label><select name="network"><option>Mvola</option><option>Orange Money</option><option>Airtel Money</option></select></div>
<div class="row"><label>Transaction reference</label><input name="external_ref" required></div>
<button type="submit">Submit payment proof</button>
</form>
<p class="muted" style="margin-top:14px">Need help: ${supportEmail}</p>
</div></body></html>`);
});

// POST /api/stripe/mobile-money/confirm/:reference
router.post('/mobile-money/confirm/:reference', (req, res) => {
    const db = getDb();
    const intent = db.prepare('SELECT * FROM payment_intents WHERE reference = ?').get(req.params.reference);
    if (!intent) return res.status(404).send('Payment reference not found.');

    const extRef = String(req.body.external_ref ?? '').trim();
    if (!extRef) return res.status(400).send('Transaction reference is required.');

    const note = [
        String(req.body.payer_name ?? '').trim(),
        String(req.body.payer_phone ?? '').trim(),
        String(req.body.network ?? '').trim(),
    ].filter(Boolean).join(' | ');

    db.prepare(`
        UPDATE payment_intents
        SET status='submitted', external_ref=?, provider=?, updated_at=unixepoch()
        WHERE reference=?
    `).run(`${extRef}${note ? ` | ${note}` : ''}`, intent.provider, req.params.reference);

    return res.send('Payment proof submitted. Admin will validate and activate your license soon.');
});

// GET /api/stripe/mobile-money/intents (admin)
router.get('/mobile-money/intents', requireAdmin, (req, res) => {
    const db = getDb();
    const intents = db.prepare(`
        SELECT reference, email, plan, method, provider, amount_label, status, external_ref, created_at, updated_at
        FROM payment_intents
        ORDER BY created_at DESC
        LIMIT 200
    `).all();
    res.json({ intents });
});

// POST /api/stripe/mobile-money/intents/:reference/mark-paid (admin)
router.post('/mobile-money/intents/:reference/mark-paid', requireAdmin, (req, res) => {
    const db = getDb();
    const intent = db.prepare('SELECT * FROM payment_intents WHERE reference = ?').get(req.params.reference);
    if (!intent) return res.status(404).json({ error: 'Payment intent not found.' });

    db.prepare("UPDATE payment_intents SET status='paid', updated_at=unixepoch() WHERE reference=?")
      .run(req.params.reference);

    let license = null;
    if (intent.email) {
        const user = upsertUser(intent.email);
        const expiresAt = Math.floor(Date.now() / 1000) + 32 * 86400;
        license = createLicense(user.id, intent.plan, `manual-${intent.reference}`, expiresAt);
    }

    res.json({
        ok: true,
        reference: intent.reference,
        status: 'paid',
        license_key: license,
    });
});

// POST /api/stripe/webhook  — raw body (set in server.js)
router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body, sig, process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (e) {
        console.error('[Stripe webhook] Signature verification failed:', e.message);
        return res.status(400).send(`Webhook Error: ${e.message}`);
    }

    console.log('[Stripe webhook]', event.type);

    try {
        switch (event.type) {

            case 'checkout.session.completed': {
                const session = event.data.object;
                const email   = session.customer_email
                             ?? session.customer_details?.email;
                const plan    = session.metadata?.plan ?? PLAN_MAP[
                    session.line_items?.data?.[0]?.price?.id
                ] ?? 'pro';
                const subId   = session.subscription;

                if (!email) { console.warn('[Stripe] No email in session'); break; }

                const user      = upsertUser(email);
                const expiresAt = Math.floor(Date.now() / 1000) + 32 * 86400;
                const key       = createLicense(user.id, plan, subId, expiresAt);

                console.log(`[Stripe] License created: ${key}  user=${email}  plan=${plan}`);
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object;
                const subId   = invoice.subscription;
                const priceId = invoice.lines?.data?.[0]?.price?.id;
                const plan    = PLAN_MAP[priceId] ?? 'pro';
                extendLicense(subId, plan);
                console.log(`[Stripe] License extended  sub=${subId}  plan=${plan}`);
                break;
            }

            case 'customer.subscription.deleted': {
                const subId = event.data.object.id;
                deactivateLicense(subId);
                console.log(`[Stripe] License deactivated  sub=${subId}`);
                break;
            }

            case 'customer.subscription.paused': {
                const subId = event.data.object.id;
                deactivateLicense(subId);
                console.log(`[Stripe] License paused  sub=${subId}`);
                break;
            }
        }
    } catch (e) {
        console.error('[Stripe webhook handler error]', e.message);
    }

    res.sendStatus(200);
});

// GET /api/stripe/portal  (customer portal redirect)
router.post('/portal', async (req, res) => {
    const { customer_id, return_url } = req.body;
    if (!customer_id) return res.status(400).json({ error: 'customer_id required.' });
    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: customer_id,
            return_url: return_url ?? `${req.headers.origin}/billing`,
        });
        res.json({ url: session.url });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
