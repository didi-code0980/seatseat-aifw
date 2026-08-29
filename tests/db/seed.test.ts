// SYS-02 — QA suite. AC-12: Seed idempotency & table counts on reset stack.
// Written from 01-story.md and section 6 of 02-design.md only (RULE-05).

import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { close, reset, sql } from "../../scripts/local-stack-client";

const ROOT = process.cwd();

describe("SYS-02 Database Lane — AC-12 Seed Idempotency", () => {
  beforeAll(async () => {
    await reset();
  });

  afterAll(async () => {
    await close();
  });

  it("AC-12: running seed twice against reset stack exits 0 and does not change row counts", async () => {
    const runSeed = () => {
      execFileSync("node", ["node_modules/tsx/dist/cli.mjs", "scripts/seed.ts"], {
        cwd: ROOT,
        env: process.env,
        encoding: "utf8",
      });
    };

    // First run
    runSeed();

    const tables = ["Group", "Member", "Room", "Seat", "NetworkPort", "Device", "SeatRequest", "Account"];
    const countsAfterFirst: Record<string, number> = {};

    for (const t of tables) {
      const rows = await sql<{ count: string }>(`SELECT count(*)::text as count FROM "public"."${t}"`);
      const row = rows[0];
      expect(row).toBeDefined();
      if (row) {
        countsAfterFirst[t] = Number(row.count);
        expect(countsAfterFirst[t]).toBeGreaterThan(0);
      }
    }

    // Second run
    runSeed();

    const countsAfterSecond: Record<string, number> = {};
    for (const t of tables) {
      const rows = await sql<{ count: string }>(`SELECT count(*)::text as count FROM "public"."${t}"`);
      const row = rows[0];
      expect(row).toBeDefined();
      if (row) {
        countsAfterSecond[t] = Number(row.count);
      }
    }

    expect(countsAfterSecond).toEqual(countsAfterFirst);
  });
});
