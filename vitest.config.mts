import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // AC-2, and the one place `DATA_SOURCE` is set for the unit suite.
    //
    // ADR-007 clause 7 flipped the default to `supabase`, so a test process that says nothing now
    // reaches for a network and fails as a connection error rather than as a broken test.
    // `.ai/standards/testing-standards.md` requires every unit and component test to set the mode
    // DELIBERATELY; this is that declaration, made once where a reader of the config sees it rather
    // than pasted into sixteen files where one omission is the failure.
    //
    // Verified against vitest 4.1.10, `reporters.d.DtoKVV2s.d.ts:3053` — `test.env` is *"Custom
    // environment variables assigned to `process.env` before running tests."*
    //
    // Playwright pins the same value on its web server (`playwright.config.ts:36`) and this ticket
    // does not change that.
    env: { DATA_SOURCE: "mock" },
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    // Unit tests only. `tests/e2e/**` is Playwright's, and letting vitest collect a .spec.ts from
    // there produces a failure that looks like a broken test rather than a misrouted one.
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
