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

## Environment

Do not commit real production secrets. Use the values below as placeholders only.

Frontend build environment:

```text
VITE_API_URL=https://api.example.com/api/v1
```

API runtime environment:

```text
APP_ENV=production
NODE_ENV=production
API_HOST=0.0.0.0
API_PORT=3000
API_TRUST_PROXY=true
API_PREFIX=api
API_VERSION=1
CORS_ORIGINS=https://app.example.com
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<at-least-32-random-characters>
JWT_REFRESH_SECRET=<different-at-least-32-random-characters>
JWT_ACCESS_TOKEN_TTL_SECONDS=7200
JWT_REFRESH_TOKEN_TTL_SECONDS=2592000
GITHUB_CLIENT_ID=<github-oauth-client-id>
GITHUB_CLIENT_SECRET=<github-oauth-client-secret>
GITHUB_CALLBACK_URL=https://api.example.com/api/v1/auth/github/callback
WEB_AUTH_CALLBACK_URL=https://app.example.com/auth/callback
PROVIDER_TOKEN_ENCRYPTION_KEY=<at-least-32-random-characters>
RATE_LIMIT_GLOBAL_TTL_SECONDS=60
RATE_LIMIT_GLOBAL_MAX=300
RATE_LIMIT_AUTH_TTL_SECONDS=60
RATE_LIMIT_AUTH_MAX=10
```

Set `API_TRUST_PROXY=true` only when the API runs behind a trusted reverse proxy or platform load balancer. Production CORS must use explicit HTTPS origins; do not use `CORS_ORIGINS=*`.

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
https://api.example.com/api/health
```

Application API URL:

```text
https://api.example.com/api/v1
```

## Frontend SPA Hosting

Deploy `apps/web/dist` to static hosting.

The host must rewrite application routes to `/index.html`:

```text
/                     -> /index.html
/repositories          -> /index.html
/repositories/connect  -> /index.html
/repositories/:id      -> /index.html
/analyses/:analysisId  -> /index.html
```

Do not add a frontend server for the MVP.

## GitHub OAuth

Configure the production GitHub OAuth app callback URL to exactly match:

```text
GITHUB_CALLBACK_URL=https://api.example.com/api/v1/auth/github/callback
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
https://app.example.com/auth/callback
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
