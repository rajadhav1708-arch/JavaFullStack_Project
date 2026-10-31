# Hindavi Traders (PashuFeed Pro)

Cattle feed shop and farm management platform for dairy farmers and shop
owners in Chinchpur district. Covers the storefront, POS counter billing,
inventory view, the farmer credit ledger (Khata), a rule-based ration
calculator, and an AI feed assistant (Gemini).

Storefront branding, contact details and WhatsApp deep links come from a
single source of truth: `frontend/src/data/store.ts`.

Live site: https://hindavitraders.vercel.app

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`, no PostCSS config) |
| Icons | lucide-react |
| Animations | framer-motion |
| Routing | react-router-dom 7 |
| API | Express 4, run with `tsx` |
| Database | PostgreSQL via `pg` (plain SQL, no ORM) |
| Auth | scrypt password hashing + JWT in an httpOnly cookie |
| AI | Google Gemini via `@google/genai` |

## Setup guide for a fresh machine

1. Install Node.js 20+, Docker Desktop (running), and Git.
2. Clone the repo, then:

   ```bash
   npm install
   cp .env.example .env   # Windows: Copy-Item .env.example .env
   ```

3. Open `.env` and fill in: `DATABASE_URL` (already set for Docker), any long
   `SESSION_SECRET`, and `GEMINI_API_KEY` (from Google AI Studio) if you want
   live chat replies.
4. Start the database and load schema + demo data:

   ```bash
   docker compose up -d
   npm run db:init
   npm run db:seed
   ```

5. Run everything:

   ```bash
   npm run dev
   ```

   Vite on http://localhost:3000 , API on http://localhost:3001 .

Demo logins (created by `npm run db:seed`; re-running the seed resets these
passwords):

| Role | Email | Password |
| --- | --- | --- |
| Shop admin | `admin@pashufeed.test` | `Admin@12345` |
| Dairy farmer (customer) | `farmer@pashufeed.test` | `Farmer@12345` |

## Requirements

- Node.js 20 or newer
- npm
- A PostgreSQL database. Easiest option is Docker:

  ```bash
  docker compose up -d
  ```

  A hosted Postgres works just as well (Neon, Supabase, Render). The connection
  string is the only thing that changes.

## Running

```bash
npm run dev
```

This starts both processes:

- Vite dev server on <http://localhost:3000> (opens in your browser)
- Express API on <http://localhost:3001>

To run them separately:

```bash
npm run server   # API only
vite             # web only
```

The Vite dev server proxies `/api` to the API port, so the browser only ever
talks to port 3000.

### Without an API key

The server still boots. `POST /api/chat` returns `503 AI_DISABLED` and the chat
widget falls back to general husbandry tips, labelled **Demo tips mode** in the
UI so it is never mistaken for a live model response.

### Without a database

The server still boots and the whole storefront works: browsing, the ration
calculator and the chatbot need no account. Only `/api/auth` returns
`503 DB_DISABLED`, because there is nowhere to store an account.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes, for accounts | - | PostgreSQL connection string |
| `SESSION_SECRET` | yes, for accounts | - | Signs the session cookie; 32+ random bytes |
| `GEMINI_API_KEY` | yes, for live AI | - | Gemini credential, kept server-side only |
| `GEMINI_MODEL` | no | `gemini-2.5-flash` | Model for chat replies |
| `PORT` | no | `3001` | API port |
| `APP_URL` | no | - | Absolute origin used in password-reset links |
| `NODE_ENV` | no | - | Set to `production` so cookies are HTTPS-only |

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Accounts and roles

Browsing is public. An account is required only where data is written: placing
an order, khata, order tracking, and the staff dashboard.

- Passwords are hashed with **scrypt** and a per-user random salt. The hash is
  never returned by any endpoint.
- Sessions are a **JWT in an httpOnly, sameSite=lax cookie**, so the token is
  unreachable from JavaScript.
- **Role comes from the database, never from the browser.** `POST /api/auth/register`
  hard-codes `role = 'customer'` and ignores a `role` field in the request body.
- Login compares against a dummy hash when the email is unknown, so response
  timing does not reveal whether an account exists.
- Staff can be revoked via `session_version` (bumped on password change or
  forced logout).

Admin roles: `admin` (full dashboard) and `employee` (counter staff — Overview,
Inventory, POS, Delivery; no Revenue/Khata/settings).

## Product catalogue

Categories and products are read from the database at runtime.
`backend/server/seed/catalogue.ts` holds the one-time seed; the running app
never imports it.

- Tables: `categories`, `products`, `product_variants`.
- Pack sizes (e.g. 25 kg / 50 kg) are their own rows with their own price and
  stock, because they are not the same line item.
- Money is `NUMERIC`, never a float, so totals cannot drift.
- Category `productCount` is counted in SQL, so a category can never advertise
  products it does not have.
- `inStock` and the default pack size are derived from the variant rows at read
  time, so they cannot go stale.
- Product images are optimised WebP files in `frontend/public/images/products/`
  (`product-XX-800.webp` etc.). Regenerate with
  `node scripts/optimise_catalogue_images.mjs` after adding source PNGs.
- There is **no product-edit API** by design: inventory in the admin app is
  read-only plus a CSV export. Catalogue changes go through the seed + re-run.

To edit the catalogue, change the rows in `backend/server/seed/catalogue.ts`
and re-run `npm run db:seed` (safe to re-run — upserts).

## Other commands

```bash
npm run lint     # tsc --noEmit
npm run build    # production bundle to frontend/dist/
npm run preview  # serve the production bundle
npm run db:init  # apply backend/server/schema.sql (safe to re-run)
npm run db:seed  # upsert the demo accounts and catalogue
node scripts/optimise_catalogue_images.mjs  # rebuild WebP product images
```

## What is real vs. demo

Everything shown in the UI against an account is backed by PostgreSQL:

| Feature | Backing |
| --- | --- |
| Catalogue, pack sizes, stock | `products` + `product_variants` |
| Orders (online + POS counter sales) | `orders` + `order_items`; server-side pricing, GST 5%, bulk delivery ₹500/5%, express ₹250, stock decrement |
| Order status / payment | `PATCH /api/orders/:id/status`, `.../payment` |
| Khata (credit ledger) | `khata_accounts` + `khata_entries` |
| Chat assistant | Gemini when `GEMINI_API_KEY` is set; labelled demo tips otherwise |
| Ration calculator | Local rule-based estimator over live catalogue SKUs; framed as an estimate with a disclaimer, not veterinary advice |
| Wishlist | Browser `localStorage` only (no server account data) |

There are no mock orders, mock khata rows, fake loyalty points, subscriptions
or invented analytics. Empty states are shown until real rows exist.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness plus whether AI is enabled |
| `GET` | `/api/health/db` | Whether the database is ok, erroring, or unset |
| `POST` | `/api/auth/register` | Create a customer account |
| `POST` | `/api/auth/login` | Sign in, sets the session cookie |
| `POST` | `/api/auth/logout` | Clears the session cookie |
| `GET` | `/api/auth/me` | The signed-in user, or 401 |
| `POST` | `/api/auth/password-reset` | Request reset; email logged without SMTP |
| `POST` | `/api/auth/password-reset/confirm` | Set a new password with a valid token |
| `GET` | `/api/products` | Catalogue; `?category=`, `?brand=`, `?q=` filters |
| `GET` | `/api/products/:id` | One product by id or SKU |
| `GET` | `/api/categories` | Categories with live product counts |
| `GET` | `/api/orders` | Current user's orders (staff see all) |
| `POST` | `/api/orders` | Place an order: server-side pricing, GST, stock decrement |
| `PATCH` | `/api/orders/:id/status` | Update status (staff only) |
| `PATCH` | `/api/orders/:id/payment` | Mark payment method / paid (staff only) |
| `GET` | `/api/khata` | Khata accounts + entries (role-scoped) |
| `POST` | `/api/khata` | Create/adjust a khata account (staff) |
| `POST` | `/api/khata/:id/payment` | Record a khata payment |
| `GET` | `/api/admin/access` | Recent admin access log |
| `POST` | `/api/admin/block` | Block an IP |
| `DELETE` | `/api/admin/block/:ip` | Unblock an IP |
| `POST` | `/api/chat` | Chat reply; returns `{ text, actionBtn? }` |
| `POST` | `/api/track` | Anonymous visit beacon (`visits` table) |

`POST /api/chat` accepts `{ message, history, role, userName, products, khataSummary }`.
The product catalogue and Khata summary are passed to the model so replies
reference real inventory and real balances. `actionBtn.view` is validated
against a whitelist on the server before it reaches the UI.

The API key is never sent to the browser. Chat requires a signed-in session.

## Project layout

```
.
├── backend/
│   └── server/             Express app, Gemini chat, schema.sql,
│                           routes/ (auth, products, orders, khata, admin),
│                           seed/ (catalogue.ts)
├── frontend/
│   ├── index.html
│   ├── vite.config.ts      (root: frontend/, proxies /api to :3001)
│   ├── public/images/      product WebP assets + placeholder.svg
│   └── src/                React app (components/, context/, data/, hooks/)
├── scripts/
│   └── optimise_catalogue_images.mjs
├── index config files      package.json, tsconfig.json, docker-compose.yml, .env
```

## Design system

Warm light "field ledger" theme defined in `frontend/src/index.css`:

- Tokens: cream `#f7f2e7`, paper `#fffdf7`, ink `#1b2a22`, pine `#1f4d3a`,
  ochre `#c8842a`, clay `#b4552d`, line `#e3dac8`
- Type: Fraunces (display) + Manrope (body)
- Utility classes: `.card`, `.btn` (+ `btn-primary` / `btn-accent` /
  `btn-outline`), `.field`, `.eyebrow`

## Known limits

- No SMTP: password-reset emails are logged by the server; in non-production the
  reset URL is returned in the API response for development.
- `npm audit` reports upstream advisories (esbuild / protobufjs chain via
  tooling); review before a production deploy.
- Full production verification (served `dist`, HTTPS cookies, reverse proxy)
  has not been performed on a real host.
