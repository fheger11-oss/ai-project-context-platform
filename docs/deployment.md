# Production Deployment Runbook

This runbook describes the current MVP deployment shape. It does not introduce a hosting provider, queue, worker, or new runtime architecture.

## Architecture

```text
Browser
  -> Static Vite SPA
  -> HTTPS API
  -> NestJS
  -> PostgreSQL / Supabase
```

The web app is a static SPA built from `apps/web`. The API is a long-running Node/NestJS process built from `apps/api`.

## Prerequisites

- Node.js 26
- pnpm 10.14.0
- A production PostgreSQL/Supabase database
- A GitHub OAuth app for the production domain
- HTTPS frontend and API domains

Install dependencies from the repository root:

```bash
pnpm install --frozen-lockfile
```

## Production Deployment Configuration

Do not commit real production secrets. The production frontend origin is `https://ctxaro.com` and
the production API origin is `https://api.ctxaro.com`.

```text
Vercel
  -> builds apps/web
  -> publishes apps/web/dist
  -> sets VITE_API_URL to https://api.ctxaro.com/api/v1

Railway
  -> builds the monorepo API
  -> runs apps/api/dist/main.js
  -> allows https://ctxaro.com through CORS

Supabase
  -> provides DATABASE_URL for Prisma/PostgreSQL
  -> receives forward Prisma migrations before API rollout
```

Production URL dependencies:

```text
Frontend production origin
  -> CORS_ORIGINS on Railway

GitHub OAuth callback
  -> GITHUB_CALLBACK_URL on Railway
  -> GitHub OAuth app callback URL

Frontend callback URL
  -> WEB_AUTH_CALLBACK_URL on Railway
  -> Vercel /auth/callback route

Frontend API base URL
  -> VITE_API_URL on Vercel
  -> Railway /api/v1 origin
```

### Environment Variables

| Variable                                        | Service                   | Required | Purpose                                                                                      | Safe placeholder                                     |
| ----------------------------------------------- | ------------------------- | -------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `VITE_API_URL`                                  | Vercel/Web                | Yes      | HTTPS API base URL used by the Vite bundle. Must include `/api/v1`.                          | `https://api.ctxaro.com/api/v1`                      |
| `APP_ENV`                                       | Railway/API               | Yes      | Production environment mode. Must match `NODE_ENV=production` in production.                 | `production`                                         |
| `NODE_ENV`                                      | Railway/API               | Yes      | Node production mode. Disables Swagger when production.                                      | `production`                                         |
| `API_HOST`                                      | Railway/API               | Yes      | Bind host for NestJS.                                                                        | `0.0.0.0`                                            |
| `PORT`                                          | Railway/API               | Yes      | Platform-provided bind port on Railway. The API maps this to `API_PORT` when unset.          | Railway-provided                                     |
| `API_PORT`                                      | Railway/API               | No       | Explicit API port override for non-Railway or diagnostic runs.                               | `3000`                                               |
| `API_TRUST_PROXY`                               | Railway/API               | Yes      | Enables trusted proxy IP handling behind Railway.                                            | `true`                                               |
| `API_PREFIX`                                    | Railway/API               | No       | API route prefix.                                                                            | `api`                                                |
| `API_VERSION`                                   | Railway/API               | No       | URI version segment.                                                                         | `1`                                                  |
| `SWAGGER_PATH`                                  | Railway/API               | No       | Swagger path outside production. Ignored in production because Swagger is disabled.          | `docs`                                               |
| `CORS_ORIGINS`                                  | Railway/API               | Yes      | Comma-separated allowed frontend HTTPS origins. Must include the production frontend origin. | `https://ctxaro.com`                                 |
| `REQUEST_BODY_LIMIT_BYTES`                      | Railway/API               | No       | Maximum JSON or URL-encoded request body size.                                               | `32768`                                              |
| `DATABASE_URL`                                  | Railway/API, Prisma       | Yes      | Supabase PostgreSQL connection string read by Prisma.                                        | `<supabase-postgresql-url>`                          |
| `JWT_ACCESS_SECRET`                             | Railway/API               | Yes      | Access-token signing secret. Must differ from refresh secret.                                | `<generate-access-secret>`                           |
| `JWT_REFRESH_SECRET`                            | Railway/API               | Yes      | Refresh-token signing secret. Must differ from access secret.                                | `<generate-refresh-secret>`                          |
| `JWT_ACCESS_TOKEN_TTL_SECONDS`                  | Railway/API               | No       | Access-token lifetime.                                                                       | `7200`                                               |
| `JWT_REFRESH_TOKEN_TTL_SECONDS`                 | Railway/API               | No       | Refresh-token lifetime.                                                                      | `2592000`                                            |
| `GITHUB_CLIENT_ID`                              | Railway/API               | Yes      | Production GitHub OAuth app client ID.                                                       | `<github-oauth-client-id>`                           |
| `GITHUB_CLIENT_SECRET`                          | Railway/API               | Yes      | Production GitHub OAuth app client secret.                                                   | `<github-oauth-client-secret>`                       |
| `GITHUB_CALLBACK_URL`                           | Railway/API, GitHub OAuth | Yes      | API callback URL registered with GitHub.                                                     | `https://api.ctxaro.com/api/v1/auth/github/callback` |
| `GITHUB_WEBHOOK_SECRET`                         | Railway/API, GitHub       | Yes      | Independent HMAC secret for `POST /api/v1/webhooks/github`.                                  | `<generate-webhook-secret>`                          |
| `GITHUB_WEBHOOK_BODY_LIMIT_BYTES`               | Railway/API               | No       | Raw GitHub webhook payload limit; defaults to 256 KiB and cannot exceed 1 MiB.               | `262144`                                             |
| `REPOSITORY_UPDATE_WORKER_ENABLED`              | Railway/API               | Yes      | Runs the durable dispatch worker in this API process.                                        | `true`                                               |
| `REPOSITORY_UPDATE_WORKER_POLL_INTERVAL_MS`     | Railway/API               | No       | Delay between database dispatch polls.                                                       | `2000`                                               |
| `REPOSITORY_UPDATE_WORKER_LEASE_SECONDS`        | Railway/API               | No       | Renewable claim lease; expired work can be reclaimed after a crash.                          | `900`                                                |
| `REPOSITORY_UPDATE_WORKER_MAX_ATTEMPTS`         | Railway/API               | No       | Bounded dispatch attempts before terminal failure.                                           | `3`                                                  |
| `REPOSITORY_UPDATE_WORKER_BACKOFF_BASE_SECONDS` | Railway/API               | No       | Base for bounded exponential retry delays.                                                   | `30`                                                 |
| `WEB_AUTH_CALLBACK_URL`                         | Railway/API, Vercel/Web   | Yes      | Frontend callback route receiving API-issued tokens.                                         | `https://ctxaro.com/auth/callback`                   |
| `PROVIDER_TOKEN_ENCRYPTION_KEY`                 | Railway/API               | Yes      | Server-side encryption key for GitHub provider tokens.                                       | `<generate-encryption-key>`                          |
| `RATE_LIMIT_GLOBAL_TTL_SECONDS`                 | Railway/API               | No       | Global in-memory throttle window.                                                            | `60`                                                 |
| `RATE_LIMIT_GLOBAL_MAX`                         | Railway/API               | No       | Global in-memory throttle max requests/window.                                               | `300`                                                |
| `RATE_LIMIT_AUTH_TTL_SECONDS`                   | Railway/API               | No       | Auth endpoint throttle window.                                                               | `60`                                                 |
| `RATE_LIMIT_AUTH_MAX`                           | Railway/API               | No       | Auth endpoint throttle max requests/window.                                                  | `10`                                                 |
| `RATE_LIMIT_EXPENSIVE_TTL_SECONDS`              | Railway/API               | No       | Expensive synchronous operation throttle window.                                             | `60`                                                 |
| `RATE_LIMIT_EXPENSIVE_MAX`                      | Railway/API               | No       | Expensive synchronous operation max requests/window.                                         | `5`                                                  |

Values that must align:

`REPOSITORY_UPDATE_STALE_THRESHOLD_SECONDS` is optional and defaults to `21600` (six hours).
Keep it explicit when the deployment needs a different conditional stale-update recovery window.

- Vercel `VITE_API_URL` must point to `https://api.ctxaro.com/api/v1`.
- Railway `CORS_ORIGINS` must include `https://ctxaro.com`.
- Railway `GITHUB_CALLBACK_URL` must exactly match the GitHub OAuth app callback URL.
- Railway `WEB_AUTH_CALLBACK_URL` must point to the Vercel frontend `/auth/callback` route.
- Railway `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `PROVIDER_TOKEN_ENCRYPTION_KEY` must be generated secrets and must never be exposed to Vercel.

Set `API_TRUST_PROXY=true` only when the API runs behind Railway's trusted proxy/load balancer.
The proxy must remove client-supplied forwarding headers and provide the authoritative client IP;
otherwise IP-based throttling and session metadata can be spoofed. Leave proxy trust disabled for
direct deployments.
Production CORS must use explicit HTTPS origins; do not use `CORS_ORIGINS=*`.

## Build

Build everything from the repository root:

```bash
pnpm build
```

Build only the frontend:

```bash
pnpm --filter @ai-context/web build
```

The frontend output is `apps/web/dist`.

Build only the API:

```bash
pnpm --filter @ai-context/api build
```

The API output is `apps/api/dist`.

## Database Migrations

Production migrations use Prisma forward migrations from the repository root:

```bash
pnpm db:migrate:deploy
```

This is equivalent to:

```bash
pnpm exec prisma migrate deploy
```

Production must not use `prisma migrate dev` or `prisma db push`.

The MVP does not require a production seed. Treat Prisma migrations as forward migrations. Database backup and restore are owned by the database provider.

## API Runtime

Start the production API after building:

```bash
pnpm --filter @ai-context/api start
```

The API uses:

- Helmet
- production-safe CORS validation
- global rate limiting
- stricter auth rate limiting
- a stricter rate limit for GitHub listing, repository connection/sync/update, scan, analysis,
  context/document generation, and export generation
- a 32 KiB default limit for JSON and URL-encoded request bodies
- graceful shutdown hooks
- `GET /api/health`
- disabled Swagger when `APP_ENV=production` and `NODE_ENV=production`

## GitHub Webhook and Dispatch Worker

Configure a GitHub `push` webhook at:

```text
https://api.ctxaro.com/api/v1/webhooks/github
```

Use JSON payloads, enable only `push`, and set the same independently generated secret in GitHub
and `GITHUB_WEBHOOK_SECRET`. The endpoint verifies `X-Hub-Signature-256` against the exact raw
bytes, validates `X-GitHub-Delivery`, resolves connected repositories solely from verified GitHub
repository identity, and accepts only default-branch pushes. It does not scan or analyze during
the HTTP request.

An HTTP `202` means the delivery and per-repository dispatches were durably committed; it does not
mean repository processing succeeded. A known duplicate is acknowledged with `200` and cannot
create another dispatch because `(provider, delivery ID)` is unique in PostgreSQL.

Set `REPOSITORY_UPDATE_WORKER_ENABLED=true` on processes intended to execute dispatches. Multiple
API instances are safe: each dispatch is claimed with a conditional database update and renewable
lease. A hard crash leaves the dispatch `PROCESSING`; another instance can reclaim it after the
lease expires. The worker retries transient failures up to three attempts by default using 30s,
60s backoff, then records a terminal safe failure category. Permanent validation failures are not
retried. Graceful shutdown stops polling and awaits the active dispatch; hard shutdown relies on
lease recovery. Existing RepositoryUpdate locks remain the processing authority.

Deploy the webhook migration before starting an API version with the endpoint, then start at least
one worker-enabled API instance. Operational recovery is to restart a worker-enabled instance;
expired leases are reclaimed automatically. There is no external broker or dead-letter UI in this
sprint.

Rate limiting uses process-local memory. It protects one API process only, resets on restart, and
is not a distributed quota. Multiple API replicas require an infrastructure-level shared limiter
or gateway in a later deployment phase. Infrastructure must also provide volumetric DDoS
protection; the application limiter is not a WAF.

Health URL with default prefix/version settings:

```text
https://api.ctxaro.com/api/health
```

Application API URL:

```text
https://api.ctxaro.com/api/v1
```

## Frontend SPA Hosting

Deploy `apps/web/dist` to Vercel static hosting.

Vercel project settings:

```text
Root directory: apps/web
Build command: pnpm --filter @ai-context/web build
Output directory: dist
Install command: pnpm install --frozen-lockfile
Environment: VITE_API_URL=https://api.ctxaro.com/api/v1
```

The host must rewrite application routes to `/index.html`:

```text
/                     -> /index.html
/repositories          -> /index.html
/repositories/connect  -> /index.html
/repositories/:id      -> /index.html
/analyses/:analysisId  -> /index.html
```

Do not add a frontend server for the MVP.

`apps/web/vercel.json` currently provides the SPA fallback, HSTS, `X-Content-Type-Options`,
`Referrer-Policy`, `frame-ancestors 'none'`, and `X-Robots-Tag: noindex, nofollow` for protected
or transient SPA routes. Do not add a broad CSP until the production asset/API domains are final.

Production status:

- Vercel serves the frontend at `https://ctxaro.com`.
- `https://www.ctxaro.com` redirects to `https://ctxaro.com`.
- The frontend uses `https://api.ctxaro.com/api/v1` as its production API base URL.

## Railway API Hosting

No `railway.json`, `railway.toml`, `nixpacks.toml`, `Dockerfile`, or `Procfile` is required for the
current NestJS/pnpm setup.

Railway service settings:

```text
Root directory: repository root
Build command: pnpm install --frozen-lockfile && pnpm --filter @ai-context/api build
Start command: pnpm --filter @ai-context/api start
Healthcheck path: /api/health
```

Port handling:

- Railway provides `PORT`.
- The API uses `PORT` when `API_PORT` is not explicitly configured.
- Do not hardcode a fixed Railway port.
- Keep `API_HOST=0.0.0.0`.

Run database migrations from the repository root before promoting the API deployment:

```bash
pnpm db:migrate:deploy
```

The production API must use the Railway environment variables listed above. Do not set Vercel-only
variables such as `VITE_API_URL` on Railway unless they are needed for a one-off build diagnostic.

Production status:

- Railway serves the API at `https://api.ctxaro.com`.
- `GET https://api.ctxaro.com/api/health` is the production healthcheck.
- Production verification covers `GET /api/health`, `GET /docs`, one protected endpoint without
  auth, CORS, rate limiting, and Helmet headers against `https://api.ctxaro.com`.

## SEO and Crawl Controls

The frontend is a static Vite SPA, so the host rewrites application routes to the same
`index.html`. Vite does not emit different HTTP headers for different SPA routes by itself.

The SEO origin is `https://ctxaro.com` in:

- `apps/web/index.html`
- `apps/web/public/robots.txt`
- `apps/web/public/sitemap.xml`

Use the exact HTTPS production frontend origin. Keep `/landing` available as a public alias, but
do not include it in the sitemap because `/` is the canonical public URL.

The checked-in Vercel config returns this header for private or transient app routes:

```text
X-Robots-Tag: noindex, nofollow
```

Required path coverage:

```text
/repositories
/repositories/*
/analyses
/analyses/*
/auth/callback
/auth/callback/*
```

Keep the matching `robots.txt` disallow rules as a crawler hint, but do not rely on
`robots.txt` alone for authenticated application routes.

## GitHub OAuth

Configure the production GitHub OAuth app callback URL to exactly match:

```text
GITHUB_CALLBACK_URL=https://api.ctxaro.com/api/v1/auth/github/callback
```

OAuth flow:

```text
GitHub OAuth App
  -> GITHUB_CALLBACK_URL
  -> API callback
  -> WEB_AUTH_CALLBACK_URL
  -> Frontend /auth/callback
```

`WEB_AUTH_CALLBACK_URL` must point to the frontend route:

```text
https://ctxaro.com/auth/callback
```

## Deployment Order

1. Provision the production database and configure all production API/frontend variables.
2. Install dependencies with `pnpm install --frozen-lockfile`.
3. Generate Prisma Client with `pnpm db:generate`.
4. Apply forward migrations with `pnpm db:migrate:deploy`.
5. Build the API with `pnpm --filter @ai-context/api build`.
6. Build the web app with `pnpm --filter @ai-context/web build`.
7. Start the compiled API with `pnpm --filter @ai-context/api start`.
8. Serve `apps/web/dist` from static hosting.
9. Verify `GET /api/health`, CORS allow/deny behavior, and that `/docs` is unavailable.
10. Verify the registered GitHub OAuth callback and end-to-end login redirect.

## Smoke Test

1. Open the frontend.
2. Sign in with GitHub.
3. Confirm the Dashboard loads.
4. Connect a repository.
5. Confirm the repository appears on the Dashboard.
6. Open the repository workspace.
7. Sync the repository.
8. Start a scan.
9. Wait for the scan result.
10. Start analysis.
11. Open the analysis result.
12. Generate Project Context.
13. Generate a document.
14. Open AI Export.
15. Preview, copy, and download an export.
16. Return to the Dashboard.
17. Confirm the Dashboard reflects the updated project state.
18. Logout.
19. Login again.
20. Verify session refresh behavior during normal API usage.

Also verify:

- direct navigation to `/repositories`, `/repositories/connect`, `/repositories/:id`, and `/analyses/:analysisId`
- `GET /api/health`
- unauthenticated access to protected API endpoints returns `401`
- browser requests from the frontend domain pass CORS
- requests from unapproved origins fail CORS
- production Swagger is unavailable
- intentionally exceeding auth rate limits returns `429`

## Rollback

Application rollback means redeploying the previous known-good frontend build and API build.

Do not run destructive database rollback scripts automatically. Prisma migrations should be treated as forward migrations. Use the database provider's backup/restore process when a database rollback is required.

## Known MVP Limitations

- Large repository scan/analysis operations are synchronous.
- Rate limiting uses in-memory counters and is single-instance only.
- Refresh tokens remain browser-persisted as an MVP tradeoff.
