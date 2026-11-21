import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations run against the UNPOOLED (direct) Neon endpoint: Prisma's
    // advisory locks leak through pgbouncer when a build/client dies mid-lock,
    // which then times out every subsequent `migrate deploy` (P1002). The app
    // runtime keeps the pooled URL (src/lib/db.ts), so only the CLI is affected.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});
