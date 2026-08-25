import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // `fullyParallel` is off and `workers` is 1 because every worker talks to the ONE `webServer`
  // below, and that server holds the mock seam's store in process memory. Parallel workers therefore
  // share one mutable fixture set, and any spec that mutates it breaks another spec's
  // "and nothing else changed" assertion. SEA-01 was the first ticket to land beside one that
  // asserts non-interference: its seat re-assignment moved SEAT-B-06 between members mid-run and
  // failed members.spec.ts AC-5. MD-23.
  //
  // The cost is wall-clock — 27s serial against ~15s parallel at 61 tests. The alternative, kept
  // open rather than taken, is per-worker store isolation (a server per worker, or a reset endpoint
  // the fixture calls), which would make `fullyParallel` mean something again.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "list" : "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // The e2e suite runs against a production build in mock mode. `next dev` would also work, but a
    // dev-only failure and a build-only failure are different bugs and this suite should only ever
    // report the second kind.
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { DATA_SOURCE: "mock" },
  },
});
