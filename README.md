# PashuFeed Pro

Cattle feed shop and farm management platform for dairy farmers and shop owners.
Covers the storefront, POS billing, inventory, the farmer credit ledger (Khata),
ration guidance, and an AI nutrition advisor.

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`, no PostCSS config) |
| Icons | lucide-react |
| API | Express 4, run with `tsx` |
| Database | PostgreSQL via `pg` (plain SQL, no ORM) |
| Auth | scrypt password hashing + JWT in an httpOnly cookie |
| AI | Google Gemini via `@google/genai` |

## Setup guide for a fresh machine

1. Install Node.js 20+, Docker Desktop (running), and Git.
2. Clone the repo, then: ```bash
   npm install
   cp .env.example .env   # Windows: Copy-Item .env.example .env
   ```
3. Open `.env` and fill in: `DATABASE_URL` (already set for Docker), `SESSION_SECRET` (any long string), `GEMINI_API_KEY` (from Google AI Studio).
4. Start the database and load schema + demo data: ```bash
   docker compose up -d
   npm run db:init
   npm run db:seed
   ```
5. Run everything: ```bash
   npm run dev
   ```
   Vite on http://localhost:3000 , API on http://localhost:3001 .

Demo logins: `admin@pashufeed.test` / `Admin@12345`, `farmer@pashufeed.test` / `Farmer@12345`.

The hero intake video is committed, so the page renders without regenerating anything. The parallax background uses a procedural particle animation (no external frame assets required).
## Requirements

- Node.js 20 or newer
- npm
- A PostgreSQL database. Easiest option is Docker:

  ```bash
  docker compose up -d
  ```

  A hosted Postgres works just as well (Neon, Supabase, Render). The connection
  string is the only thing that changes, which is why nothing in the code is
  tied to a local file or a specific host.

## Setup

```bash
npm install
cp .env.example .env    # then add DATABASE_URL, SESSION_SECRET and GEMINI_API_KEY
npm run db:init          # create tables from backend/server/schema.sql
npm run db:seed          # create the demo admin and customer accounts
```

On Windows PowerShell: `Copy-Item .env.example .env`

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

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
widget falls back to canned answers, labelled **Demo Mode** in the UI so it is
never mistaken for a live model response.

### Without a database

The server still boots and the whole storefront works: browsing, the AI ration
quiz and the chatbot need no account. Only `/api/auth` returns
`503 DB_DISABLED`, because there is nowhere to store an account.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes, for accounts | - | PostgreSQL connection string |
| `SESSION_SECRET` | yes, for accounts | - | Signs the session cookie; 32+ random bytes |
| `GEMINI_API_KEY` | yes, for live AI | - | Gemini credential, kept server-side only |
| `GEMINI_MODEL` | no | `gemini-2.5-flash` | Model for chat replies |
| `PORT` | no | `3001` | API port |
| `NODE_ENV` | no | - | Set to `production` so cookies are HTTPS-only |

## Accounts and roles

Browsing is public. An account is required only where data is written: placing
an order, and the staff dashboard.

- Passwords are hashed with **scrypt** and a per-user random salt. The hash is
  never returned by any endpoint.
- Sessions are a **JWT in an httpOnly, sameSite=lax cookie**, so the token is
  unreachable from JavaScript. No session store is needed, which keeps the app
  portable across hosts.
- **Role comes from the database, never from the browser.** `POST /api/auth/register`
  hard-codes `role = 'customer'` and ignores a `role` field in the request body.
- Login compares against a dummy hash when the email is unknown, so response
  timing does not reveal whether an account exists.

Demo accounts created by `npm run db:seed`:

| Role | Email | Password |
| --- | --- | --- |
| Shop admin | `admin@pashufeed.test` | `Admin@12345` |
| Counter staff | `counter@pashufeed.test` | `Counter@12345` |
| Dairy farmer | `farmer@pashufeed.test` | `Farmer@12345` |

Counter staff see only Overview, Inventory, POS and Delivery. Revenue, Khata,
farmer directory, suppliers, promos, reports and settings are owner-only.

## Product catalogue

Categories and products are read from the database at runtime, not bundled into
the bundle. `backend/server/seed/catalogue.ts` holds the one-time seed; the running app
never imports it.

- `categories`, `products` and `product_variants` tables, plus a
  `default_weight_kg` column for the pack size shown first on a product page.
- Pack sizes (25 kg, 50 kg, 500 kg) are their own rows with their own price and
  stock, because a 25 kg bag and a 50 kg bag are not the same line item.
- Money is `NUMERIC`, never a float, so totals cannot drift.
- Category `productCount` is counted in SQL, so a category can never advertise
  products it does not have.
- `inStock` and the default pack size are derived from the variant rows at read
  time, so they cannot go stale.
- The catalogue is public. Only writes need a session, and those arrive with the
  orders feature.

To edit the catalogue, change the rows in the database (or
`backend/server/seed/catalogue.ts` and re-run `npm run db:seed` on a fresh database).

## Other commands

```bash
npm run lint     # tsc --noEmit
npm run build    # production bundle to frontend/dist/
npm run preview  # serve the production bundle
npm run db:init  # apply backend/server/schema.sql (safe to re-run)
npm run db:seed  # upsert the demo accounts
```

## Parallax Background

The landing background uses a procedural particle animation rendered on a canvas.
It responds to scroll progress with a Ken Burns style parallax effect. No external
frame assets or ffmpeg are required. The animation respects `prefers-reduced-motion`
and pauses in background tabs for performance.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness plus whether AI is enabled |
| `GET` | `/api/health/db` | Whether the database is ok, erroring, or unset |
| `POST` | `/api/auth/register` | Create a customer account |
| `POST` | `/api/auth/login` | Sign in, sets the session cookie |
| `POST` | `/api/auth/logout` | Clears the session cookie |
| `GET` | `/api/auth/me` | The signed-in user, or 401 |
| `GET` | `/api/products` | Catalogue; `?category=`, `?brand=`, `?q=` filters |
| `GET` | `/api/products/:id` | One product by id or SKU |
| `GET` | `/api/categories` | Categories with live product counts |
| `GET` | `/api/orders` | Current user's orders (staff see all) |
| `POST` | `/api/orders` | Place an order: server-side pricing, GST, stock decrement |
| `PATCH` | `/api/orders/:id/status` | Update status (staff only) |
| `POST` | `/api/chat` | Chat reply; returns `{ text, actionBtn? }` |

`POST /api/chat` accepts `{ message, history, products, khataSummary }`. The
product catalogue and Khata summary are passed to the model so replies reference
real inventory and real balances. `actionBtn.view` is validated against a
whitelist on the server before it reaches the UI.

The API key is never sent to the browser.

## Project layout

```
.
├── backend/
│   └── server/             Express app, Gemini chat, orders, auth, schema.sql,
│                           routes/, seed/
├── frontend/
│   ├── index.html
│   ├── vite.config.ts      (root: frontend/, proxies /api to :3001)
│   ├── public/             videos/cow_eating.mp4 (local drop-in)
│   └── src/                React app (components/, context/, hooks/, ...)
├── index config files      package.json, tsconfig.json, docker-compose.yml, .env
```

Only `users` and the catalogue are persisted so far. Orders, the Khata ledger,
subscriptions and analytics are still in-memory sample data from
`frontend/src/data/mockData.ts`.

## Media assets

Background video clips load from public Mixkit CDN URLs. Each video list starts
with an optional local path that is skipped automatically when the file is
absent, so you can drop in your own footage without touching the code:

- `public/videos/cow_eating.mp4` - hero background

The parallax background uses a procedural canvas animation (no video required).
If the hero video fails, it falls back to the Mixkit CDN.

Product and testimonial imagery loads from Unsplash CDN URLs defined in
`frontend/src/data/mockData.ts`.
