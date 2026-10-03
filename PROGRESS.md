# Progress log

Where this project stands, what is verified, and what to do next. Written for
whoever picks this up next — including a future session with no memory of it.

Last updated: scroll experience overhaul (reels + reveals).

---

## Done: orders and billing API (uncommitted)

- `orders` + `order_items` tables added to `schema.sql`, idempotent re-run safe.
- `POST /api/orders`: session required; every line re-priced from
  `product_variants` (client prices never trusted); `SELECT ... FOR UPDATE` then
  stock decrement + order insert in ONE transaction; GST (5%) computed
  server-side on the taxable value; `products.stock_count` kept in step;
  `orderNumber` `ORD-YYYY-NNNN`; 404 unknown product, 409 insufficient stock,
  400 bad payment/delivery/items/address.
- `GET /api/orders`: customer sees only their own; admin/employee sees all.
- `PATCH /api/orders/:id/status`: **server-side role check** - customer accounts
  get 403. This is real enforcement now, not a UI gate.
- Frontend: `placeOrder` is async, API-first with the old local path kept only
  as a demo fallback when the DB is unconfigured; `refreshOrders` loads the
  signed-in user's orders; `CheckoutModal` shows a submitting state and the
  server error message.
- Verified end-to-end against `pashufeed-db`: GST math (7200 -> 360 discount ->
  342 tax -> 7182), stock 120 -> 116 and 118 after two orders, unauth 401,
  farmer PATCH 403, admin/counter PATCH ok, admin-only/customer-only listing,
  overstock/bad-payment rejected. `tsc` exit 0, `vite build` exit 0.
- Docker Desktop was not running; started it, container `pashufeed-db` is up
  and healthy. The stale `npm run dev` API process was killed; restart
  `npm run dev` to bring both servers back.

Build green, chat verified live against Gemini.

## Moved this session

- **Repo reorganised**: `server/` → `backend/server/`, `src/` + `public/` +
  `index.html` + `vite.config.ts` → `frontend/`. Scripts, frame extractor path,
  `env.ts` dotenv path and the two `src/types` imports updated to match.
  `tsc` exit 0, `vite build` exit 0, API health ok with `gemini-3.8-flash`.
- **Daily Farm Intake Reel fixed**: the hero `<video>` pointed at a missing
  `/videos/cow_eating.mp4` and then at two dead Mixkit preview URLs, so it
  painted black. Dropped the generated cattle-feed clip at
  `frontend/public/videos/cow_eating.mp4` — it now plays locally with the
  remote URLs as fallback.

## Fixed this session

- **Stacked views bug (the "most buttons don't work"):** `checkout`,
  `customer-dashboard`, `subscriptions`, `admin-dashboard` and `order-tracking`
  rendered unconditionally for any signed-in user — every page stacked all of
  them, swallowing clicks. Each now renders only when its view is active. This
  also explains why dispatch/tracking appeared in every dashboard without
  signing in or navigating there.
- **Chat 503:** `.env` pinned `gemini-2.5-flash`, which Google now returns 404
  for ("model no longer available"). Updated to `gemini-3.8-flash` and added a
  3-attempt retry for transient 503 demand spikes. Verified live.
- `GEMINI_MODEL` had a BOM-safe rewrite — `.env` re-written as UTF-8 no BOM.
- Orders: engine now also decrements `products.stock_count` in the same
  transaction. Verified: ORD-2026-0002 priced correctly (1900 + 250 express +
  95 GST = 2245), COD marked Pending, stock_count 120 -> 118.

Not done yet: Khata credit ledger API (orders with Khata Credit are accepted
and priced like any order, but no khata_entries table), subscriptions API,
WhatsApp bill sharing.

---

## Done since the scroll fix: landing motion upgrade (uncommitted)

- `ScrollAnimationBackground` now applies a slow Ken Burns zoom + drift on top of
  the frame scrub, and the new 48-frame sequence was regenerated from
  `gemini_generated_video_18ef80e5.mp4`.
- New `useRevealOnScroll` hook: one IntersectionObserver + MutationObserver
  driving `[data-reveal]` blur/rise/fade transitions on every landing card and
  heading (`data-reveal-delay` staggers them). Reduced-motion users get the
  final state immediately.
- New top-of-viewport emerald scroll progress bar in `App.tsx`.
- `npm run lint` exit 0, `npm run build` exit 0. Still not browser-verified —
  scroll the landing page once and confirm the reveal stagger and background
  zoom feel right.

---

## The plan

Replace hardcoded sample data with a real backend and database, **one feature at
a time**. After each feature: verify it, then stop and get sign-off before
starting the next.

Order agreed with the user:

1. ~~Clean up dead files, unused imports and placeholder assets~~ — done
2. ~~Accounts, sessions, roles~~ — done
3. ~~Product catalogue~~ — done
4. ~~Scroll and parallax stability~~ — done
5. Orders + billing (real order rows, GST, actual bill)
6. Server-side role enforcement (comes free with 5)
7. Khata credit ledger
8. Analytics and reports (only become true once orders exist)
9. WhatsApp bill sharing
10. Deploy

---

## Done

### 1. Cleanup — commit `f11b6fa`

Removed generated `dist/`, `metadata.json`, a project ZIP, corrupt OneDrive
`.mp4` placeholders, and dead `ScrollingVideoBackground.tsx`. Dropped
`MOCK_SUPPLIERS` and 71 unused `lucide-react` imports. Local media drop-in
slots are kept even though the files 404 in this environment.

### 2. Accounts, sessions, roles — commit `fc3a4a9`

- **Database**: `pg` + `DATABASE_URL`, plain SQL, no ORM. Portable — moving from
  Docker to a hosted Postgres is a one-line `.env` change.
- **Auth**: `scrypt` password hashing, JWT in an `httpOnly` `sameSite=lax`
  cookie named `pashufeed_session`. No session store, so no Redis or sticky
  sessions when deployed.
- **Roles come from the database.** `POST /api/auth/register` hard-codes
  `role = 'customer'` and ignores any `role` in the body, so privilege
  escalation from the browser is impossible.
- **Endpoints**: `POST /api/auth/register|login|logout`, `GET /api/auth/me`.
- **Frontend**: `AuthContext` restores the session from the cookie on load,
  `AuthModal` handles sign-in and sign-up. The "Quick Role Switcher" is gone.
- **Gates**: public browsing, AI quiz and chatbot; sign-in required for
  checkout, customer dashboard, subscriptions and the shop dashboard.
- **`admin-dashboard` is role-gated**, and `AdminLayout` filters its tabs by
  role and shows the real signed-in staff name instead of a hardcoded one.
  Owner sees 11 tabs; counter staff sees 4.

### 3. Product catalogue — commit `ff10863`

- **Tables**: `categories`, `products`, `product_variants`.
- **Seed**: moved out of `src/data/mockData.ts` into `server/seed/catalogue.ts`,
  so the running app never imports sample data. `db:seed` upserts it and is
  safe to re-run.
- **API**: `GET /api/products` (`?category=`, `?brand=`, `?q=`),
  `GET /api/products/:id` (matches id or SKU), `GET /api/categories`.
- **Frontend**: `AppContext` fetches the catalogue on mount and exposes
  `products`, `categories`, `isCatalogueLoading`, `catalogueError`.
  `CategoryGrid`, `ProductListing`, `InventoryManagement` and
  `SmartRationQuiz` all read from context now. Loading skeletons and an honest
  error state replace the silent empty list.

### 4. Scroll and parallax stability — uncommitted

The landing page drifted and stuttered. Five separate root causes, all fixed.

1. **Parallax was driven by absolute `window.scrollY`, not by the element's own
   position.** Five components did `translateY(scrollY * k)`. Scrolling to
   20,000px therefore offset a section by 2,000px, and it never came back. Four
   of them also alternated direction per card index, which pulled grid children
   apart within a single row - this was the "boxes leave their original place"
   report. Replaced with `progressThroughViewport()`, a bounded 0..1 value
   derived from `getBoundingClientRect()`.
2. **Transformed grid children were the visible symptom.** A `translate` on a
   grid child takes it out of row alignment, so rows split and columns stopped
   matching height. Cards are no longer translated at all; only section headings
   move.
3. **Five duplicate `scroll` listeners, none rAF-throttled.** Scroll events fire
   faster than the display refreshes, so each one queued a full re-render. Now
   one app-wide listener in `src/hooks/useScrollProgress.ts`, coalesced into a
   single read per frame, with zero listeners while nothing is on screen.
4. **The background scrubbed with `video.currentTime = t`.** That is a *seek*:
   each assignment aborted the in-flight decode and restarted it, and `seeked`
   resolves asynchronously, so rapid scrolling queued seeks that landed out of
   order. The video froze or stuttered backwards. Replaced with a pre-extracted
   frame sequence drawn to a canvas, which cannot seek. Regenerate with
   `npm run frames -- <clip>`.
5. **An unbounded 60fps rAF loop.** The particle fallback re-queued itself
   forever, on every view, including background tabs. Now gated on
   `visibilitychange` and `prefers-reduced-motion`, and the frame path only
   repaints when the visible frame actually changes - a still page costs nothing.

Also: the background used to scrub against `documentElement.scrollHeight`, so it
had only reached ~20% of the clip by the footer. It now plays across the first
2.5 viewports and holds. And `HeroSection` no longer claims "4K Ultra HD" over a
720p remote clip.

---

## Decisions worth respecting

- **Money is `NUMERIC`, never a float.** 0.1 + 0.2 must not drift in a billing
  column.
- **Pack sizes are rows, not a JSON blob.** A 25 kg bag and a 50 kg bag of the
  same feed are different line items with their own price and stock.
- **`inStock` and the default pack size are derived**, never stored, so they
  cannot drift from the variant rows.
- **The headline price IS stored**, because the "X% off" badge is computed
  against `original_price` and must stay truthful even when the default pack is
  out of stock. This was a real bug caught during verification — see Gotchas.
- **Category `productCount` is counted in SQL.** The seed claimed 115 products
  across 8 categories while only 8 existed. The API now reports reality.
- **`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for later schema changes.**
  `CREATE TABLE IF NOT EXISTS` is a no-op on an existing table, so a new column
  needs its own ALTER to reach databases created by an earlier version.
- **`server/seed/catalogue.ts` imports a type from `src/types`.** Intentional,
  so the seed and the UI cannot drift on the `Product` shape.

---

## Gotchas found the hard way

Do not reintroduce these.

1. **`expiryDate` lost a day.** `pg` parses a `DATE` into a local-midnight
   `Date`; JSON-serialising it shifts a day backwards in any timezone ahead of
   UTC, so `2027-02-01` reached the browser as `2027-01-31`. Fixed with
   `to_char(p.expiry_date, 'YYYY-MM-DD')`. **Any new DATE column needs the same
   treatment.**
2. **JSONB does not preserve key order.** `nutritionalInfo` comes back with
   keys reordered. Harmless for the UI, which reads by key, but never
   string-compare a JSONB object in a test.
3. **Never write files with PowerShell `-Encoding utf8`.** On PowerShell 5.1
   that emits a BOM, and `db:init` then fails with
   `syntax error at or near "﻿"`. Use
   `[IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding($false)))`.
4. **`SmartRationQuiz` used to index `MOCK_PRODUCTS[0..4]`.** Row order is not
   something the database guarantees, so that would have recommended the wrong
   feed. It now looks products up by SKU.
5. **`isBestSeller` and `isRecommended` are optional** in the `Product` type,
   so compare them with `?? false` in the seed and tests.
6. **Never put a `transform` on a grid child for parallax.** It leaves row
   alignment and equal-height stretching behind. Translate the heading instead.
7. **Parallax values must be element-relative and capped.** Anything derived from
   `window.scrollY` grows without bound and cannot be reasoned about.
8. **Do not scrub video with `currentTime`.** Use a frame sequence
   (`npm run frames`). Assignment aborts the decode; rapid scroll reorders seeks.
9. **`spawn` without `shell: true` on Windows.** A shell mangles any path with a
   space - `C:\Users\Sai Argade\...` truncated the ffmpeg output at the first
   space and wrote nothing.

---

## Not enforced yet — be honest about this

The dashboard and checkout hiding is **client-side only**. There is nothing
server-side worth protecting until orders exist. Anyone determined can still
bypass the UI. Step 4 (orders) is what makes the gates real.

Also still sample data in memory, from `src/data/mockData.ts`:
orders, Khata records, subscriptions, notifications, reviews. The analytics and
reports screens show **fake numbers** until real orders land.

---

## Environment

- Node v24.18.0, npm 12.0.1
- Database: Docker container `pashufeed-db`, `postgres:16-alpine`, port 5432,
  database `pashufeed`, user `postgres`, password `pashufeed`. Managed by
  `docker-compose.yml` with a named volume, so `docker compose down` keeps the
  seeded data. Start with `docker compose up -d`.
- ffmpeg 9.0.2 installed via winget (`Gyan.FFmpeg`). Only needed to regenerate the
  parallax frames; the app never shells out to it. On Windows it is added to the
  machine PATH, so a shell opened *before* the install will not see it.
- `.env` holds the `DATABASE_URL`, a generated `SESSION_SECRET` and a
  `GEMINI_API_KEY` **placeholder**. Gitignored, never commit it.
- The real Gemini key goes in `.env` and is only ever read by `server/index.ts`.
  The placeholder is treated as "not configured", so the chat widget shows
  labelled Demo Mode instead of failing.
- Current row counts: 3 users, 8 categories, 8 products, 10 pack sizes.

### Demo accounts (`npm run db:seed`)

| Role | Email | Password |
| --- | --- | --- |
| Shop admin | `admin@pashufeed.test` | `Admin@12345` |
| Counter staff | `counter@pashufeed.test` | `Counter@12345` |
| Dairy farmer | `farmer@pashufeed.test` | `Farmer@12345` |

---

## Commands

```bash
npm run dev        # Vite on :3000, API on :3001
npm run lint       # tsc --noEmit
npm run build      # then delete dist/ before finishing
npm run db:init    # apply schema, safe to re-run
npm run db:seed    # demo accounts + catalogue, safe to re-run
npm run frames -- clip.mp4   # rebuild the parallax frames (needs ffmpeg)
```

---

## Verification status

Last run, all green:

| Check | Result |
| --- | --- |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 |
| `docker compose up -d` → `db:init` → `db:seed` | 3 users, 8 categories, 8 products, 10 pack sizes |
| Vite proxy: `/api/health/db` | `{"db":"ok"}` |
| Vite proxy: `/frames/.../frame_0025.jpg` | 200, `image/jpeg`, 73 KB |
| Vite proxy: missing frame `frame_0049.jpg` | Vite HTML fallback; the `Image()` decode fails, `onerror` advances |
| `npm run frames` on a 12s test clip | 48 frames, 1600x900, 3.3 MB total |
| Any remaining `setScrollY` / `scrollY *` / `.currentTime =` in `src` | none outside explanatory comments |

### Claims in this file that are not true

The "Auth suite 25/25" and "Catalogue suite 179/179" rows from earlier revisions
describe suites that **do not exist on disk**. There is no `*.test.*` file and no
`test` script in `package.json`. They were run ad hoc and never committed, so
there is currently no regression net for auth or the catalogue. Rebuilding them
is still outstanding.

**Not verified:** no browser was driven through the UI. The parallax fixes were
verified by build, by lint, and by confirming the frame pipeline and the served
bytes over HTTP - **not** by watching the page scroll. Someone needs to open the
landing page and scroll it to confirm the boxes now hold their rows and the
background scrubs smoothly. That is the one check that matters most here.

---

## Next: orders and billing

The next feature. Sketch, not yet implemented:

- `orders`, `order_items`, `shipping_addresses` tables.
- `POST /api/orders` requires a session — this is where the gates become real.
- GST computed server-side, never trusted from the client.
- Decrement `product_variants.stock` in the same transaction as the insert.
- Move `placeOrder()` in `src/context/AppContext.tsx` to that endpoint.
- `CustomerDashboard` and the order-tracking modal read from the API.
- Server-side role checks on every staff write route (inventory edits, Khata
  entries, offers).
- WhatsApp bill link last, once there is a real bill to share.