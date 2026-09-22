import { defineConfig } from "drizzle-kit";

// Run drizzle-kit against the DIRECT (non-pooled) Neon connection string,
// never the "-pooler" one — see the neon-postgres skill's pooled-vs-direct
// note. DATABASE_URL here is expected to be that direct connection.
export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
