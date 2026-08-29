import { defineConfig, devices } from "@playwright/test";

// The browser half of `pnpm test:db`. `02-design.md` section 6.4.
//
// A SECOND CONFIG RATHER THAN AN EDIT TO `playwright.config.ts`. That file goes on pinning
// `DATA_SOURCE: "mock"` on port 3100, which is what keeps `pnpm test:e2e` green on a machine with no
// container runtime and keeps the mock suite off every Supabase project, live or local. Editing it
// would put both lanes back in one file, which is the thing 6.4 exists to avoid.
//
// Only `scripts/test-db.mjs` runs this config, and it runs it TWICE — `--grep @write`, then
// `--grep @read`. That is the process restart AC-1's last clause needs; see `reuseExistingServer`.

// 3200, not 3100, so a mock-mode server can be up at the same time. The two lanes are meant to be
// runnable side by side on one machine.
const PORT = 3200;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/db-e2e",

  // One durable database behind every worker. `playwright.config.ts` gives the same reason for the
  // mock lane (MD-23) and it is stronger here: that store dies with the process, this one does not,
  // so a lost race leaves rows behind for the next run rather than only for the next spec.
  fullyParallel: false,
  workers: 1,

  forbidOnly: Boolean(process.env.CI),
  // No retries, in either environment. A retry re-runs a spec against a database the first attempt
  // already wrote to, so a passing second attempt would mean the fixture state changed rather than
  // that the flake cleared. `playwright.config.ts` retries twice in CI because its store is rebuilt
  // with the server; this one is not.
  retries: 0,
  reporter: process.env.CI ? "list" : "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // `pnpm start`, NOT `pnpm build && pnpm start`. The build happened once at step 5 of
    // `scripts/test-db.mjs`, under this same stack's environment, and both passes serve it. Building
    // here would build twice and — worse — would put a build between the `@write` pass and the
    // `@read` one, which is time in which nothing proves the row survived rather than proof that it
    // did.
    command: `pnpm start --port ${PORT}`,
    url: BASE_URL,

    // UNCONDITIONALLY FALSE, not `!process.env.CI`. A server left over from the `@write` pass is
    // precisely the thing that must not be reused: reusing it would leave AC-1 asserting that a row
    // is readable from the process that wrote it, which is a test of rendering and not of
    // persistence. Two servers over one database is the whole mechanism.
    reuseExistingServer: false,

    timeout: 180_000,

    // `DATA_SOURCE` IS LEFT UNSET. AC-1's `Given` says so, and ADR-007 §7 makes the default
    // `supabase` — this lane is the one place that default is exercised. The three names below are
    // the ones the application already reads (`.env.example`); `scripts/test-db.mjs` fills them from
    // `supabase status` and nothing here hard-codes a key.
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ?? "",
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    },
  },
});
