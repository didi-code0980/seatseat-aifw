import { describe, expect, it } from "vitest";

import { ROLES, ROLE_RANK, can, canApproveRequests, canCreateAccount, canManageRooms } from "@/lib/auth/permissions";
import { deriveSeatStatus } from "@/lib/data/derive";
import type { Seat } from "@/lib/data";

describe("ROLE_RANK", () => {
  it("orders USER below MANAGER below ADMIN", () => {
    expect(ROLE_RANK.USER).toBeLessThan(ROLE_RANK.MANAGER);
    expect(ROLE_RANK.MANAGER).toBeLessThan(ROLE_RANK.ADMIN);
  });

  it("ranks every role exactly once", () => {
    const ranks = ROLES.map((r) => ROLE_RANK[r]);
    expect(new Set(ranks).size).toBe(ROLES.length);
  });
});

describe("can", () => {
  it("is satisfied by an equal rank", () => {
    expect(can("MANAGER", "MANAGER")).toBe(true);
  });

  it("is satisfied by a higher rank", () => {
    expect(can("ADMIN", "MANAGER")).toBe(true);
  });

  it("refuses a lower rank", () => {
    expect(can("USER", "MANAGER")).toBe(false);
  });

  it("refuses an absent role", () => {
    // An unauthenticated caller must not fall through to the lowest role — absent is not USER.
    expect(can(null, "USER")).toBe(false);
    expect(can(undefined, "USER")).toBe(false);
  });
});

describe("gates", () => {
  it("restricts room management to ADMIN", () => {
    expect(canManageRooms("ADMIN")).toBe(true);
    expect(canManageRooms("MANAGER")).toBe(false);
    expect(canManageRooms("USER")).toBe(false);
  });

  it("allows MANAGER and ADMIN to approve requests", () => {
    expect(canApproveRequests("ADMIN")).toBe(true);
    expect(canApproveRequests("MANAGER")).toBe(true);
    expect(canApproveRequests("USER")).toBe(false);
  });

  it("restricts account creation to MANAGER and above — INV-08, no self-signup", () => {
    expect(canCreateAccount("MANAGER")).toBe(true);
    expect(canCreateAccount("ADMIN")).toBe(true);
    expect(canCreateAccount("USER")).toBe(false);
    expect(canCreateAccount(null)).toBe(false);
  });
});

describe("deriveSeatStatus — INV-03", () => {
  const base: Seat = {
    id: "seat-x",
    roomId: "room-x",
    code: "SEAT-X",
    gridX: 0,
    gridY: 0,
    gridW: 2,
    gridH: 2,
    ports: [],
    occupantId: null,
  };

  it("is VACANT with no occupant", () => {
    expect(deriveSeatStatus(base)).toBe("VACANT");
  });

  it("is OCCUPIED with an occupant", () => {
    expect(deriveSeatStatus({ ...base, occupantId: "mem-user" })).toBe("OCCUPIED");
  });

  it("is not a stored field on the DTO", () => {
    // If a `status` key ever appears on Seat, INV-03 has been violated in the type before it is
    // violated in the schema, and this is where that shows up.
    expect(Object.keys(base)).not.toContain("status");
  });
});
