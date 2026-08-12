// Prisma 7 configuration.
//
// VERIFIED AGAINST THE INSTALLED VERSION, NOT FROM MEMORY. Prisma 7 moved connection configuration
// twice over, and the Prisma 6 shape is wrong in two separate ways here:
//
//   1. `url` is gone from the datasource block in schema.prisma. The CLI rejects it with P1012.
//   2. `directUrl` is gone from the datasource block too, with its own P1012:
//      "The datasource property `directUrl` is no longer supported in schema files."
//      There is no `directUrl` anywhere in @prisma/config either — the Datasource type is exactly
//      `{ url?: string; shadowDatabaseUrl?: string }`.
//
// So the pooled/direct split is NOT expressed as two fields side by side. It is expressed by WHO
// reads WHICH url, and the roles are the reverse of Prisma 6:
//
//   this file, datasource.url  -> DIRECT_URL  (port 5432). Migrate and Introspect read it.
//   application runtime        -> DATABASE_URL (port 6543, ?pgbouncer=true), passed to a driver
//                                 adapter when the client is constructed.
//
// Putting DATABASE_URL here — the Prisma 6 habit — would point migrations at Supabase's transaction
// pooler. That pooler cannot hold the session state advisory locks and prepared statements need, so
// migrations would fail intermittently rather than cleanly, which is the worst way for this to be
// wrong.
//
// `env()` throws when the variable is missing, and that is deliberate: every Prisma CLI command
// fails loudly rather than silently targeting nothing. Prisma 7 has no dotenv, so the `db:*` scripts
// in package.json load .env.local through Node's --env-file-if-exists.
//
// Nothing here applies a migration. `prisma migrate` stays out of scope until prisma/schema.prisma
// is approved (RULE-09), which is still blocked on the Member <-> Better Auth user ADR.

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
