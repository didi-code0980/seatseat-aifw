// Prisma 7 configuration.
//
// This file exists because Prisma 7 removed `url` from the datasource block in schema.prisma —
// verified against the CLI, which rejects it with P1012. Migrate and Introspect read the connection
// string from here; the runtime client takes a driver adapter instead.
//
// Nothing here applies a migration. `prisma migrate` is out of scope until prisma/schema.prisma is
// approved (RULE-09).

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
