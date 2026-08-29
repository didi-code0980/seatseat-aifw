// SYS-02 — QA suite. AC-11: Database-level refusals and downgrade invariants.
// Written from 01-story.md and section 6 of 02-design.md only (RULE-05).

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { close, reset, serviceClient, sql } from "../../scripts/local-stack-client";

describe("SYS-02 Database Lane — AC-11 Database Invariant Refusals", () => {
  beforeEach(async () => {
    await reset();
  });

  afterAll(async () => {
    await close();
  });

  it("AC-11: a second occupant on a seat is refused (INV-01)", async () => {
    const supabase = serviceClient();
    await sql(`INSERT INTO "Room" (id, name, code, "gridWidth", "gridHeight") VALUES ('room-1', 'Room 1', 'R1', 10, 10)`);
    await sql(`INSERT INTO "Member" (id, "fullName", email, role) VALUES ('mem-1', 'Member 1', 'm1@test.local', 'USER')`);
    await sql(`INSERT INTO "Member" (id, "fullName", email, role) VALUES ('mem-2', 'Member 2', 'm2@test.local', 'USER')`);
    await sql(`INSERT INTO "Seat" (id, code, "roomId", "gridX", "gridY", "gridW", "gridH", "occupantId") VALUES ('seat-1', 'S1', 'room-1', 1, 1, 1, 1, 'mem-1')`);

    const { data } = await supabase.rpc("assign_seat_occupant", {
      p_seat_id: "seat-1",
      p_member_id: "mem-2",
    });

    expect(data).toEqual({ assigned: false, reason: "SEAT_OCCUPIED" });
  });

  it("AC-11: a second primary device on one seat is rejected with SQLSTATE 23505 (INV-04)", async () => {
    await sql(`INSERT INTO "Room" (id, name, code, "gridWidth", "gridHeight") VALUES ('room-1', 'Room 1', 'R1', 10, 10)`);
    await sql(`INSERT INTO "Member" (id, "fullName", email, role) VALUES ('mem-1', 'Member 1', 'm1@test.local', 'USER')`);
    await sql(`INSERT INTO "Seat" (id, code, "roomId", "gridX", "gridY", "gridW", "gridH", "occupantId") VALUES ('seat-1', 'S1', 'room-1', 1, 1, 1, 1, 'mem-1')`);
    await sql(`INSERT INTO "Device" (id, "assetTag", model, "ownerId", "seatId", rank) VALUES ('dev-1', 'TAG-1', 'Laptop', 'mem-1', 'seat-1', 'PRIMARY')`);

    let sqlState: string | undefined;
    try {
      await sql(`INSERT INTO "Device" (id, "assetTag", model, "ownerId", "seatId", rank) VALUES ('dev-2', 'TAG-2', 'Laptop 2', 'mem-1', 'seat-1', 'PRIMARY')`);
    } catch (err: unknown) {
      sqlState = (err as { code?: string }).code;
    }

    expect(sqlState).toBe("23505");
  });

  it("AC-11: a primary device owned by someone other than the occupant is rejected with SQLSTATE INV05 (INV-05)", async () => {
    await sql(`INSERT INTO "Room" (id, name, code, "gridWidth", "gridHeight") VALUES ('room-1', 'Room 1', 'R1', 10, 10)`);
    await sql(`INSERT INTO "Member" (id, "fullName", email, role) VALUES ('mem-1', 'Member 1', 'm1@test.local', 'USER')`);
    await sql(`INSERT INTO "Member" (id, "fullName", email, role) VALUES ('mem-2', 'Member 2', 'm2@test.local', 'USER')`);
    await sql(`INSERT INTO "Seat" (id, code, "roomId", "gridX", "gridY", "gridW", "gridH", "occupantId") VALUES ('seat-1', 'S1', 'room-1', 1, 1, 1, 1, 'mem-1')`);

    let sqlState: string | undefined;
    try {
      await sql(`INSERT INTO "Device" (id, "assetTag", model, "ownerId", "seatId", rank) VALUES ('dev-1', 'TAG-1', 'Laptop', 'mem-2', 'seat-1', 'PRIMARY')`);
    } catch (err: unknown) {
      sqlState = (err as { code?: string }).code;
    }

    expect(sqlState).toBe("INV05");
  });

  it("AC-11: removing a seat occupant automatically downgrades the primary device to SECONDARY (INV-06)", async () => {
    await sql(`INSERT INTO "Room" (id, name, code, "gridWidth", "gridHeight") VALUES ('room-1', 'Room 1', 'R1', 10, 10)`);
    await sql(`INSERT INTO "Member" (id, "fullName", email, role) VALUES ('mem-1', 'Member 1', 'm1@test.local', 'USER')`);
    await sql(`INSERT INTO "Seat" (id, code, "roomId", "gridX", "gridY", "gridW", "gridH", "occupantId") VALUES ('seat-1', 'S1', 'room-1', 1, 1, 1, 1, 'mem-1')`);
    await sql(`INSERT INTO "Device" (id, "assetTag", model, "ownerId", "seatId", rank) VALUES ('dev-1', 'TAG-1', 'Laptop', 'mem-1', 'seat-1', 'PRIMARY')`);

    await sql(`UPDATE "Seat" SET "occupantId" = NULL WHERE id = 'seat-1'`);

    const devices = await sql<{ rank: string }>(`SELECT rank FROM "Device" WHERE id = 'dev-1'`);
    expect(devices.length).toBe(1);
    const device = devices[0];
    expect(device).toBeDefined();
    if (device) {
      expect(device.rank).toBe("SECONDARY");
    }
  });
});
