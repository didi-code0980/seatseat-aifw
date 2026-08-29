// SYS-02 — QA suite. AC-10: Database schema & invariant constraints.
// Written from 01-story.md and section 6 of 02-design.md only (RULE-05).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { close, reset, sql } from "../../scripts/local-stack-client";

describe("SYS-02 Database Lane — AC-10 Schema & Invariant Constraints", () => {
  beforeAll(async () => {
    await reset();
  });

  afterAll(async () => {
    await close();
  });

  it("AC-10: INV-04 — one_primary_device_per_seat is a partial unique index on Device", async () => {
    const indexes = await sql<{ indexname: string; indexdef: string }>(
      "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'Device' AND indexname = 'one_primary_device_per_seat'"
    );

    expect(indexes.length).toBe(1);
    const index = indexes[0];
    expect(index).toBeDefined();
    if (index) {
      expect(index.indexdef).toMatch(/UNIQUE\s+INDEX/i);
      expect(index.indexdef).toMatch(/ON\s+(public\.)?"?Device"?/i);
      expect(index.indexdef).toMatch(/WHERE/i);
      expect(index.indexdef).toMatch(/"?rank"?\s*=\s*'PRIMARY'/i);
    }
  });

  it("AC-10: INV-05 — device_primary_owner_check is a constraint trigger on Device", async () => {
    const triggers = await sql<{ tgname: string; tgdeferrable: boolean }>(
      "SELECT tgname, tgdeferrable FROM pg_trigger WHERE tgname = 'device_primary_owner_check'"
    );

    expect(triggers.length).toBe(1);
    const trigger = triggers[0];
    expect(trigger).toBeDefined();
    if (trigger) {
      expect(trigger.tgdeferrable).toBe(true);
    }
  });

  it("AC-10: INV-06 — seat_occupant_exit_downgrade is a trigger on Seat", async () => {
    const triggers = await sql<{ tgname: string }>(
      "SELECT tgname FROM pg_trigger WHERE tgname = 'seat_occupant_exit_downgrade'"
    );

    expect(triggers.length).toBe(1);
  });

  it("AC-10: INV-03 — Seat table declares no status column", async () => {
    const cols = await sql<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'Seat' AND column_name = 'status'"
    );

    expect(cols.length).toBe(0);
  });
});
