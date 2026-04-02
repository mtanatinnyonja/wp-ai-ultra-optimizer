'use strict';
const router = require('express').Router();
const { validateLicense } = require('../services/licenseService');

// Middleware: validate license key from header or body
function requireLicense(req, res, next) {
    const key  = (req.headers['x-wpai-key'] ?? req.body?.license_key ?? '').trim();
    const site = (req.body?.site ?? req.body?.site_url ?? '').trim();

    if (!key) return res.status(401).json({ error: 'Missing x-wpai-key header.' });

    const result = validateLicense(key, site || null);
    if (!result.valid) return res.status(403).json({ error: result.message });

    req.plan       = result.plan;
    req.licenseKey = key;
    next();
}

function requirePro(req, res, next) {
    if (req.plan === 'free')
        return res.status(403).json({
            error: 'This feature requires a PRO or AGENCY license.',
            upgrade_url: 'https://wp-ai-optimizer.com/pricing',
        });
    next();
}

// POST /api/optimize/analyze
router.post('/analyze', requireLicense, async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required.' });

    // In production: call Google PageSpeed Insights API
    // GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=...&strategy=mobile
    const score  = Math.floor(Math.random() * 28) + 65;
    const lcp    = parseFloat((Math.random() * 2.5 + 0.8).toFixed(2));
    const cls    = parseFloat((Math.random() * 0.18).toFixed(3));
    const inp    = Math.floor(Math.random() * 200 + 80);
    const ttfb   = Math.floor(Math.random() * 400 + 80);
    const fcp    = parseFloat((Math.random() * 1.5 + 0.6).toFixed(2));

    const suggestions = [];
    if (lcp > 2.5) suggestions.push({ type: 'lcp',  impact: 'high',   text: 'Preload your LCP hero image with fetchpriority=high' });
    if (cls > 0.1) suggestions.push({ type: 'cls',  impact: 'high',   text: 'Set explicit width/height on images to prevent layout shifts' });
    if (inp > 200) suggestions.push({ type: 'inp',  impact: 'medium', text: 'Delay non-critical 3rd-party scripts to reduce INP' });
    if (ttfb > 300)suggestions.push({ type: 'ttfb', impact: 'medium', text: 'Enable server-side page caching to reduce TTFB' });
    suggestions.push({ type: 'css', impact: 'high', text: 'Generate Critical CSS to eliminate render-blocking stylesheets' });
    suggestions.push({ type: 'js',  impact: 'medium', text: 'Defer analytics and chat widgets until after user interaction' });

    res.json({ url, score, lcp, cls, inp, ttfb, fcp, suggestions, plan: req.plan });
});

// POST /api/optimize/critical-css  (PRO+)
router.post('/critical-css', requireLicense, requirePro, async (req, res) => {
    const { url, viewport_width = 1280, viewport_height = 800 } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required.' });

    try {
        const puppeteer = require('puppeteer');
        const browser   = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        });
        const page = await browser.newPage();
        await page.setViewport({ width: viewport_width, height: viewport_height });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        const css = await page.evaluate((h) => {
            const rules   = new Set();
            const sheets  = Array.from(document.styleSheets);
            for (const sheet of sheets) {
                try {
                    for (const rule of sheet.cssRules ?? []) {
                        if (rule.type !== CSSRule.STYLE_RULE) continue;
                        try {
                            const els = document.querySelectorAll(rule.selectorText);
                            for (const el of els) {
                                const rect = el.getBoundingClientRect();
                                if (rect.top < h) { rules.add(rule.cssText); break; }
                            }
                        } catch {}
                    }
                } catch {}
            }
            return [...rules].join('\n');
        }, viewport_height);

        await browser.close();
        res.json({ url, css, length: css.length });
    } catch (e) {
        console.error('[Critical CSS]', e.message);
        res.status(500).json({ error: `Critical CSS generation failed: ${e.message}` });
    }
});

// POST /api/optimize/bulk  (AGENCY)
router.post('/bulk', requireLicense, (req, res) => {
    if (req.plan !== 'agency')
        return res.status(403).json({ error: 'Bulk optimization requires an AGENCY license.' });

    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0)
        return res.status(400).json({ error: 'urls array is required.' });
    if (urls.length > 50)
        return res.status(400).json({ error: 'Maximum 50 URLs per bulk request.' });

    // Simulate bulk scores (replace with real PageSpeed calls)
    const results = urls.map(url => ({
        url,
        score: Math.floor(Math.random() * 30 + 60),
        lcp:   parseFloat((Math.random() * 2 + 1).toFixed(2)),
        status: 'analyzed',
    }));

    res.json({ results, count: results.length });
});

module.exports = router;
