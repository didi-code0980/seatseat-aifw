import path from "node:path";

import { defineConfig } from "vitest/config";

// The database half of `pnpm test:db`. `02-design.md` section 6.4.
//
// A SEPARATE FILE, NOT A PROJECT INSIDE `vitest.config.mts`. A project declared there is still
// collected by `pnpm test`, and `01-story.md` requires these clauses to be invisible to it: a unit
// suite that turns red wherever Docker is absent fails the QA gate on the absence of a container
// runtime rather than on the product.
//
// Only `scripts/test-db.mjs` runs this config. Running it by hand with plain `vitest` skips the
// preflight and the environment step, and `scripts/local-stack-client.ts` will say so rather than
// reach for a socket.
export default defineConfig({
  // No `react()` plugin and no `setupFiles`. Nothing in this lane renders — AC-9 diffs generated
  // types, AC-10 reads the catalogue, AC-11 asserts SQLSTATEs and AC-12 counts rows. The rendering
  // half of AC-12 is Playwright's, in `tests/db-e2e/seed-parity.spec.ts`.
  test: {
    environment: "node",
    globals: false,
    include: ["tests/db/**/*.test.ts"],

    // NO `test.env.DATA_SOURCE`, and its absence is the assertion.
    //
    // `vitest.config.mts` pins `mock` for the unit suite (6.3). This lane is the one place ADR-007
    // §7's default is exercised, and AC-1's `Given` says "no `DATA_SOURCE` set" — setting it here
    // would test the override instead of the default. The stack's URL and keys arrive from
    // `scripts/test-db.mjs` through the process environment.

    // ONE DATABASE, MUTATED BY EVERY FILE. The same reasoning as `playwright.config.ts`'s
    // `workers: 1` (MD-23), and stronger, because that store is in process memory and this one is
    // durable: a parallel file's `reset()` would truncate the table another file is asserting over,
    // and the failure would land in whichever file lost the race rather than in the one at fault.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
