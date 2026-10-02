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

## Requirements

- Node.js 20 or newer
- npm
- A PostgreSQL database. Easiest option is Docker:

  ```bash
  docker run -d --name pashufeed-db -e POSTGRES_PASSWORD=pashufeed -e POSTGRES_USER=postgres -e POSTGRES_DB=pashufeed -p 5432:5432 postgres:16-alpine
  ```

  A hosted Postgres works just as well (Neon, Supabase, Render). The connection
  string is the only thing that changes, which is why nothing in the code is
  tied to a local file or a specific host.

## Setup

```bash
npm install
cp .env.example .env    # then add DATABASE_URL, SESSION_SECRET and GEMINI_API_KEY
npm run db:init          # create tables from server/schema.sql
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
| Dairy farmer | `farmer@pashufeed.test` | `Farmer@12345` |

## Other commands

```bash
npm run lint     # tsc --noEmit
npm run build    # production bundle to dist/
npm run preview  # serve the production bundle
npm run db:init  # apply server/schema.sql (safe to re-run)
npm run db:seed  # upsert the demo accounts
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness plus whether AI is enabled |
| `GET` | `/api/health/db` | Whether the database is ok, erroring, or unset |
| `POST` | `/api/auth/register` | Create a customer account |
| `POST` | `/api/auth/login` | Sign in, sets the session cookie |
| `POST` | `/api/auth/logout` | Clears the session cookie |
| `GET` | `/api/auth/me` | The signed-in user, or 401 |
| `POST` | `/api/chat` | Chat reply; returns `{ text, actionBtn? }` |

`POST /api/chat` accepts `{ message, history, products, khataSummary }`. The
product catalogue and Khata summary are passed to the model so replies reference
real inventory and real balances. `actionBtn.view` is validated against a
whitelist on the server before it reaches the UI.

The API key is never sent to the browser.

## Project layout

```
.
├── server/
│   ├── index.ts              Express app, Gemini chat route
│   ├── env.ts                Loads .env once
│   ├── db.ts                 pg Pool and query helper
│   ├── schema.sql            Table definitions
│   ├── migrate.ts            npm run db:init
│   ├── seed.ts               npm run db:seed
│   ├── auth.ts               scrypt hashing, JWT, cookie helpers
│   └── routes/auth.ts        register · login · logout · me
├── src/
│   ├── App.tsx               View router and sign-in gates
│   ├── main.tsx
│   ├── index.css             Tailwind entry plus keyframes
│   ├── context/AppContext.tsx  Shop state (cart, orders, khata)
│   ├── context/AuthContext.tsx Session state
│   ├── data/mockData.ts      Seed catalogue, orders, ledger
│   ├── types/index.ts
│   └── components/
│       ├── auth/             AuthModal
│       ├── landing/          Hero, categories, featured, services, testimonials,
│       │                     ScrollAnimationBackground (scroll-scrubbed video)
│       ├── shop/             Listing, detail, cart, checkout, order tracking
│       ├── admin/            Overview, analytics, inventory, POS, Khata, CRM,
│       │                     suppliers, deliveries, offers, reports, settings
│       ├── customer/         Customer dashboard
│       ├── nutrition/        SmartRationQuiz
│       ├── subscriptions/    SubscriptionManager
│       ├── chat/             AIChatbotWidget
│       ├── common/           RatingStars, ToastContainer
│       └── layout/           Header, Footer
├── index.html
├── vite.config.ts
└── tsconfig.json
```

Only the `users` table is persisted so far. Products, orders, the Khata ledger
and analytics are still in-memory seed data from `src/data/mockData.ts`.

## Media assets

Background video clips load from public Mixkit CDN URLs. Each video list starts
with an optional local path that is skipped automatically when the file is
absent, so you can drop in your own footage without touching the code:

- `public/videos/cow_eating.mp4` - hero background
- `public/videos/cattle_feed_scroll.mp4` - scroll-scrubbed background

If every video source fails, the background falls back to a canvas animation.

Product and testimonial imagery loads from Unsplash CDN URLs defined in
`src/data/mockData.ts`.
