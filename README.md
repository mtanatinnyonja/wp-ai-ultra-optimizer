# ⚡ WP AI Ultra Optimizer v1.0.0

> WordPress performance SaaS — Cache + AI Critical CSS + Stripe licensing

## Structure

```
wp-ai-ultra-optimizer/
├── plugin/          # WordPress plugin (PHP 8+, WP 6.4+)
├── api/             # Node.js SaaS backend (Express + SQLite + Stripe)
├── dashboard/       # Client dashboard (HTML/JS — no build step)
└── landing/         # Marketing landing page
```

## Quick Start

### 1. WordPress Plugin
```bash
cd plugin
zip -r wp-ai-ultra-optimizer.zip .
# Upload via WP Admin > Plugins > Add New > Upload
```

### 2. API Backend
```bash
cd api
cp .env.example .env
# Edit .env with your Stripe keys and JWT secret
npm install
npm start
# OR with Docker:
docker-compose up -d
```

### 3. Dashboard
Open `dashboard/index.html` — or deploy to any static host.
- Demo login: `demo@wpai.com` / `demo`

### 4. Landing Page
Open `landing/index.html` — deploy to Netlify, Vercel, or any web host.

## Configuration

### API `.env` keys required
| Key | Description |
|-----|-------------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook dashboard |
| `STRIPE_PRICE_PRO` | Price ID for PRO plan |
| `STRIPE_PRICE_AGENCY` | Price ID for AGENCY plan |
| `MADA_MOBILE_MONEY_PROVIDER` | Mobile money provider name (ex: paydunya) |
| `MADA_MOBILE_MONEY_CHECKOUT_URL` | Hosted checkout URL for Mvola/Orange/Airtel Money |
| `FREE_PLUGIN_DOWNLOAD_URL` | Public URL for Free plugin ZIP download |
| `JWT_SECRET` | Random secret for JWT tokens |
| `ADMIN_KEY` | Admin API key for manual license creation |

### Stripe Webhook Events
Register these in your Stripe dashboard → `https://your-api.com/api/stripe/webhook`:
- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.deleted`

### WordPress Plugin Settings
1. Install plugin
2. Go to **AI Optimizer** → **License**
3. Enter your license key (obtained after Stripe checkout)
4. Go to **Settings** to configure cache TTL, JS defer, etc.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login → JWT |
| POST | `/api/license/validate` | Validate license key (called by WP plugin) |
| POST | `/api/license/create` | Create license (admin only) |
| POST | `/api/stripe/create-checkout` | Create Stripe checkout session |
| GET | `/api/stripe/payment-options` | List payment methods for a plan |
| POST | `/api/stripe/create-mobile-money-intent` | Create mobile money checkout redirect |
| POST | `/api/stripe/webhook` | Stripe webhook handler |
| POST | `/api/optimize/analyze` | Analyze URL performance |
| POST | `/api/optimize/critical-css` | Generate Critical CSS via Puppeteer |

## Free + Paid Rollout Before WordPress Validation

- Keep Free distribution available directly from your website with `wp-ai-optimizer.zip`.
- Keep PRO/AGENCY sales active via Stripe card checkout.
- Enable Madagascar-friendly mobile money checkout with your provider URL (`MADA_MOBILE_MONEY_CHECKOUT_URL`).
- Landing page now shows both tracks (Free and Paid) and lets users choose payment method.

## Plans

| Feature | FREE | PRO (€10/mo) | AGENCY (€29/mo) |
|---------|------|-----------|--------------|
| HTML Cache | ✓ | ✓ | ✓ |
| Lazy Load | ✓ | ✓ | ✓ |
| JS Defer | ✓ | ✓ | ✓ |
| Critical CSS | ✗ | ✓ | ✓ |
| LCP Preload | ✗ | ✓ | ✓ |
| AI Optimization | ✗ | ✓ | ✓ |
| Multi-site | ✗ | 1 site | Unlimited |
| SaaS Dashboard | ✗ | ✓ | ✓ |
| White Label | ✗ | ✗ | ✓ |

## Production Deployment

### API (Docker)
```bash
docker-compose up -d
# Expose port 3000 via nginx/Caddy with SSL
```

### WordPress Plugin Update URL
Edit `wp-ai-ultra-optimizer.php`:
```php
define('WPAI_API', 'https://your-production-api.com/api');
```

## License
GPL-2.0+ (plugin) / Proprietary (SaaS backend)
