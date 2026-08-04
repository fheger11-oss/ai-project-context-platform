import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres.placeholder:password@placeholder.supabase.co:5432/postgres?schema=public";

export default defineConfig({
  schema: "apps/api/prisma/schema.prisma",
  migrations: {
    path: "apps/api/prisma/migrations"
  },
  datasource: {
    url: databaseUrl
  }
});
