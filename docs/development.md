# Development Environment

The project uses managed Supabase PostgreSQL for development. Docker, Docker Compose, and local PostgreSQL are not required.

## Database

Create a local `.env` file from `.env.example` and set `DATABASE_URL` to the Supabase PostgreSQL connection string.

```bash
cp .env.example .env
```

Prisma reads `DATABASE_URL` through `prisma.config.ts`.

## Prisma Commands

```bash
pnpm db:validate
pnpm db:format
pnpm db:generate
pnpm db:migrate:dev
pnpm db:studio
```

Use `pnpm db:migrate:dev` only when a real Supabase development database URL is configured.
