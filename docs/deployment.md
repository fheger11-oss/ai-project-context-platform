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

Do not commit real production secrets. The production domain is not selected yet. Until it is,
`https://ctxaro.example` means "replace before public launch" and must not be treated as a real
deployment origin.

```text
Vercel
  -> builds apps/web
  -> publishes apps/web/dist
  -> sets VITE_API_URL to the Railway HTTPS API origin

Railway
  -> builds the monorepo API
  -> runs apps/api/dist/main.js
  -> allows the Vercel frontend origin through CORS

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

| Variable                        | Service                   | Required | Purpose                                                                                    | Safe placeholder                                         |
| ------------------------------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `VITE_API_URL`                  | Vercel/Web                | Yes      | HTTPS API base URL used by the Vite bundle. Must include `/api/v1`.                        | `https://api.ctxaro.example/api/v1`                      |
| `APP_ENV`                       | Railway/API               | Yes      | Production environment mode. Must match `NODE_ENV=production` in production.               | `production`                                             |
| `NODE_ENV`                      | Railway/API               | Yes      | Node production mode. Disables Swagger when production.                                    | `production`                                             |
| `API_HOST`                      | Railway/API               | Yes      | Bind host for NestJS.                                                                      | `0.0.0.0`                                                |
| `PORT`                          | Railway/API               | Yes      | Platform-provided bind port on Railway. The API maps this to `API_PORT` when unset.        | Railway-provided                                         |
| `API_PORT`                      | Railway/API               | No       | Explicit API port override for non-Railway or diagnostic runs.                             | `3000`                                                   |
| `API_TRUST_PROXY`               | Railway/API               | Yes      | Enables trusted proxy IP handling behind Railway.                                          | `true`                                                   |
| `API_PREFIX`                    | Railway/API               | No       | API route prefix.                                                                          | `api`                                                    |
| `API_VERSION`                   | Railway/API               | No       | URI version segment.                                                                       | `1`                                                      |
| `SWAGGER_PATH`                  | Railway/API               | No       | Swagger path outside production. Ignored in production because Swagger is disabled.        | `docs`                                                   |
| `CORS_ORIGINS`                  | Railway/API               | Yes      | Comma-separated allowed frontend HTTPS origins. Must include the Vercel production origin. | `https://ctxaro.example`                                 |
| `DATABASE_URL`                  | Railway/API, Prisma       | Yes      | Supabase PostgreSQL connection string read by Prisma.                                      | `<supabase-postgresql-url>`                              |
| `JWT_ACCESS_SECRET`             | Railway/API               | Yes      | Access-token signing secret. Must differ from refresh secret.                              | `<generate-access-secret>`                               |
| `JWT_REFRESH_SECRET`            | Railway/API               | Yes      | Refresh-token signing secret. Must differ from access secret.                              | `<generate-refresh-secret>`                              |
| `JWT_ACCESS_TOKEN_TTL_SECONDS`  | Railway/API               | No       | Access-token lifetime.                                                                     | `7200`                                                   |
| `JWT_REFRESH_TOKEN_TTL_SECONDS` | Railway/API               | No       | Refresh-token lifetime.                                                                    | `2592000`                                                |
| `GITHUB_CLIENT_ID`              | Railway/API               | Yes      | Production GitHub OAuth app client ID.                                                     | `<github-oauth-client-id>`                               |
| `GITHUB_CLIENT_SECRET`          | Railway/API               | Yes      | Production GitHub OAuth app client secret.                                                 | `<github-oauth-client-secret>`                           |
| `GITHUB_CALLBACK_URL`           | Railway/API, GitHub OAuth | Yes      | API callback URL registered with GitHub.                                                   | `https://api.ctxaro.example/api/v1/auth/github/callback` |
| `WEB_AUTH_CALLBACK_URL`         | Railway/API, Vercel/Web   | Yes      | Frontend callback route receiving API-issued tokens.                                       | `https://ctxaro.example/auth/callback`                   |
| `PROVIDER_TOKEN_ENCRYPTION_KEY` | Railway/API               | Yes      | Server-side encryption key for GitHub provider tokens.                                     | `<generate-encryption-key>`                              |
| `RATE_LIMIT_GLOBAL_TTL_SECONDS` | Railway/API               | No       | Global in-memory throttle window.                                                          | `60`                                                     |
| `RATE_LIMIT_GLOBAL_MAX`         | Railway/API               | No       | Global in-memory throttle max requests/window.                                             | `300`                                                    |
| `RATE_LIMIT_AUTH_TTL_SECONDS`   | Railway/API               | No       | Auth endpoint throttle window.                                                             | `60`                                                     |
| `RATE_LIMIT_AUTH_MAX`           | Railway/API               | No       | Auth endpoint throttle max requests/window.                                                | `10`                                                     |

Values that must align:

- Vercel `VITE_API_URL` must point to the Railway API HTTPS origin plus `/api/v1`.
- Railway `CORS_ORIGINS` must include the final Vercel frontend HTTPS origin.
- Railway `GITHUB_CALLBACK_URL` must exactly match the GitHub OAuth app callback URL.
- Railway `WEB_AUTH_CALLBACK_URL` must point to the Vercel frontend `/auth/callback` route.
- Railway `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `PROVIDER_TOKEN_ENCRYPTION_KEY` must be generated secrets and must never be exposed to Vercel.

Set `API_TRUST_PROXY=true` only when the API runs behind Railway's trusted proxy/load balancer.
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
- graceful shutdown hooks
- `GET /api/health`
- disabled Swagger when `APP_ENV=production` and `NODE_ENV=production`

Health URL with default prefix/version settings:

```text
https://api.ctxaro.example/api/health
```

Application API URL:

```text
https://api.ctxaro.example/api/v1
```

## Frontend SPA Hosting

Deploy `apps/web/dist` to Vercel static hosting.

Vercel project settings:

```text
Root directory: apps/web
Build command: pnpm --filter @ai-context/web build
Output directory: dist
Install command: pnpm install --frozen-lockfile
Environment: VITE_API_URL=https://api.ctxaro.example/api/v1
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

Current deployment status:

- Vercel deployment has not been executed from this repository workspace because Vercel CLI/account
  access is not available here.
- No temporary Vercel deployment URL has been verified yet.
- Frontend to API verification is pending an actual Railway API deployment URL.

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

Current deployment status:

- Railway deployment has not been executed from this repository workspace because Railway CLI/account
  access is not available here.
- No temporary Railway public URL has been verified yet.
- After the service exists and environment variables are set, verify `GET /api/health`, `GET /docs`,
  one protected endpoint without auth, CORS, rate limiting, and Helmet headers against the Railway
  public URL.

## SEO and Crawl Controls

The frontend is a static Vite SPA, so the host rewrites application routes to the same
`index.html`. Vite does not emit different HTTP headers for different SPA routes by itself.

Before public launch, replace the SEO origin placeholder `https://ctxaro.example` in:

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
GITHUB_CALLBACK_URL=https://api.ctxaro.example/api/v1/auth/github/callback
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
https://ctxaro.example/auth/callback
```

## Deployment Order

1. Provision the production database.
2. Configure production API environment variables.
3. Configure production frontend build environment variables.
4. Install dependencies with `pnpm install --frozen-lockfile`.
5. Build with `pnpm build`.
6. Run migrations with `pnpm db:migrate:deploy`.
7. Start the API with `pnpm --filter @ai-context/api start`.
8. Deploy `apps/web/dist` to static hosting.
9. Configure HTTPS/domains.
10. Configure the GitHub OAuth production callback URL.
11. Verify CORS from the frontend domain to the API domain.
12. Run the production smoke test.

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
