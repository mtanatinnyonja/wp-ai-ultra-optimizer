'use strict';
const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createLicense, deactivateLicense, extendLicense } = require('../services/licenseService');
const { getDb } = require('../services/dbService');

const PLAN_MAP = {
    [process.env.STRIPE_PRICE_PRO]:    'pro',
    [process.env.STRIPE_PRICE_AGENCY]: 'agency',
};

const PLAN_PRICE_MAP = {
    pro: process.env.STRIPE_PRICE_PRO,
    agency: process.env.STRIPE_PRICE_AGENCY,
};

function getPaymentMethods(plan) {
    const methods = [
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
                : 'Mvola, Orange Money, Airtel Money (setup pending).',
            enabled: Boolean(process.env.MADA_MOBILE_MONEY_CHECKOUT_URL),
            setup_required: !process.env.MADA_MOBILE_MONEY_CHECKOUT_URL,
            provider: process.env.MADA_MOBILE_MONEY_PROVIDER ?? 'local-partner',
            plan,
        },
    ];

    return methods;
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
    const providerUrl = process.env.MADA_MOBILE_MONEY_CHECKOUT_URL;

    if (!providerUrl) {
        return res.status(503).json({
            error: 'Mobile money checkout is not configured yet. Set MADA_MOBILE_MONEY_CHECKOUT_URL.',
        });
    }

    const url = new URL(providerUrl);
    url.searchParams.set('plan', plan);
    url.searchParams.set('price_id', PLAN_PRICE_MAP[plan] ?? process.env.STRIPE_PRICE_PRO ?? '');
    if (req.body.success_url) url.searchParams.set('success_url', req.body.success_url);
    if (req.body.cancel_url) url.searchParams.set('cancel_url', req.body.cancel_url);

    return res.json({
        provider: process.env.MADA_MOBILE_MONEY_PROVIDER ?? 'local-partner',
        plan,
        url: url.toString(),
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
