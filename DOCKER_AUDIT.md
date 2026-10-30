$path = 'DOCKER_AUDIT.md'
$content = @'
# Read-Only Database Deployment Audit - Hindavi Traders (PashuFeed Pro)

Companion to FINAL_REPORT.md. Scope of this audit: the PostgreSQL deployment
arrangements used by the app. **No configuration was changed as part of this
audit.**

## Arrangement under audit

- Image: postgres:16-alpine
- Container: pashufeed-db
- Port: 5432 published
- Volume: named volume pashufeed_pgdata (data survives `docker compose down`)
- Credentials: postgres / pashufeed (local development only)
- Database: pashufeed
- restart policy: unless-stopped
- Healthcheck: pg_isready -U postgres -d pashufeed, interval 5s, timeout 5s, retries 10
- Schema: plain SQL, idempotent (CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS), applied via npm run db:init
- Seed: npm run db:seed (idempotent upserts)

## Arrangements considered (read-only)

1. Local Docker Compose (postgres:16-alpine) - CURRENT. Docker Desktop was
   started during the audit; container pashufeed-db is up and healthy.
2. Managed PostgreSQL (Neon / Supabase / Render) - the documented alternative.
   The connection string (DATABASE_URL) is the only change required; the app
   reads it from backend/server/env.ts via dotenv.

## Questions answered (deployment audit)

1. Where does the database run? Local Docker :5432, or managed Postgres.
2. What credentials does the app use? postgres/pashufeed locally; provider
   credentials when managed.
3. How is data persisted? Named volume locally; provider storage when managed.
4. Are migrations applied safely? Idempotent SQL, npm run db:init.
5. Is seeding idempotent? Yes, npm run db:seed upserts.
6. Is there a healthcheck / readiness signal? pg_isready, retries 10.
7. Is the port published safely? 5432 published on localhost for local dev.
8. Is SSL required for hosted Postgres? Yes (sslmode=require in hosted URLs).
9. What happens on restart? Named volume persists data.
10. Is there backup automation? Not configured locally (manual pg_dump).
11. Are there resource limits on the DB container? Not set (postgres defaults).
12. Is the DB reachable from the app? DATABASE_URL -> localhost:5432/pashufeed
    for local Docker.

## Findings (read-only)

- Local Docker arrangement works: container healthy, schema + seed applied,
  API /api/health/db -> {"db":"ok"}.
- Hosted Postgres arrangement is a one-line DATABASE_URL change; no code change.
- No configuration was modified during this audit.

## Recommendation (no action taken in this audit)

- For real deployment: move DATABASE_URL to a managed Postgres with TLS.
- Rotate local dev credentials before any shared hosting.
- Add backup automation before production.
