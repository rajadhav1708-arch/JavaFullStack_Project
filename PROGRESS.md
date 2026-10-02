# Progress log

Where this project stands, what is verified, and what to do next. Written for
whoever picks this up next — including a future session with no memory of it.

Last updated: after the product catalogue feature.

---

## The plan

Replace hardcoded sample data with a real backend and database, **one feature at
a time**. After each feature: verify it, then stop and get sign-off before
starting the next.

Order agreed with the user:

1. ~~Clean up dead files, unused imports and placeholder assets~~ — done
2. ~~Accounts, sessions, roles~~ — done
3. ~~Product catalogue~~ — done
4. Orders + billing (real order rows, GST, actual bill)
5. Server-side role enforcement (comes free with 4)
6. Khata credit ledger
7. Analytics and reports (only become true once orders exist)
8. WhatsApp bill sharing
9. Deploy

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

### 3. Product catalogue — uncommitted, ready to commit

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
  database `pashufeed`, user `postgres`, password `pashufeed`
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
```

---

## Verification status

Last run, all green:

| Check | Result |
| --- | --- |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 |
| Auth suite | 25/25 |
| Catalogue suite | 179/179 |
| Vite proxy: products, categories, by id, by SKU, page | 200 |
| Unknown product id | 404 |

The catalogue suite compares every field of all 8 products against
`server/seed/catalogue.ts`, so it fails loudly if the move to the database ever
loses or alters data. It also checks that a `'; DROP TABLE products; --`
search string is treated as literal text and that the table survives.

Test users created by the suites use `@test.local` emails and should be deleted
afterwards:

```bash
docker exec pashufeed-db psql -U postgres -d pashufeed \
  -c "DELETE FROM users WHERE email LIKE '%@test.local';"
```

**Not verified:** no browser was driven through the UI. Everything was checked
over HTTP and through the Vite proxy. A visual pass over the shop page, the
product detail page and the ration quiz is still worth doing.

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