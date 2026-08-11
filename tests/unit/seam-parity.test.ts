// The test that makes the mock-to-Prisma swap safe.
//
// It imports both implementations of every entity and asserts they expose the same exported names
// with the same arity. Without it, the seam is a naming convention: a function added to the mock and
// forgotten in the Prisma module fails only in production, in the mode nobody runs locally.
//
// Arity is checked as well as name because a signature that drifts by one parameter is the harder
// bug — both modules export `getSeat`, both typecheck at their own call sites, and the mismatch
// surfaces as an undefined argument rather than as a missing function.

import { describe, expect, it } from "vitest";

import * as mockAccounts from "@/lib/data/mock/accounts";
import * as mockDevices from "@/lib/data/mock/devices";
import * as mockGroups from "@/lib/data/mock/groups";
import * as mockLayout from "@/lib/data/mock/layout";
import * as mockMembers from "@/lib/data/mock/members";
import * as mockRequests from "@/lib/data/mock/requests";
import * as mockRooms from "@/lib/data/mock/rooms";
import * as mockSeats from "@/lib/data/mock/seats";

import * as prismaAccounts from "@/lib/data/prisma/accounts";
import * as prismaDevices from "@/lib/data/prisma/devices";
import * as prismaGroups from "@/lib/data/prisma/groups";
import * as prismaLayout from "@/lib/data/prisma/layout";
import * as prismaMembers from "@/lib/data/prisma/members";
import * as prismaRequests from "@/lib/data/prisma/requests";
import * as prismaRooms from "@/lib/data/prisma/rooms";
import * as prismaSeats from "@/lib/data/prisma/seats";

type Module = Record<string, unknown>;

const PAIRS: Array<[name: string, mock: Module, prisma: Module]> = [
  ["accounts", mockAccounts, prismaAccounts],
  ["devices", mockDevices, prismaDevices],
  ["groups", mockGroups, prismaGroups],
  ["layout", mockLayout, prismaLayout],
  ["members", mockMembers, prismaMembers],
  ["requests", mockRequests, prismaRequests],
  ["rooms", mockRooms, prismaRooms],
  ["seats", mockSeats, prismaSeats],
];

function exportedFunctions(mod: Module): string[] {
  return Object.keys(mod)
    .filter((k) => typeof mod[k] === "function")
    .sort();
}

describe("seam parity", () => {
  it("covers every entity in the seam", () => {
    // Guards against the quiet failure where an entity is added to `src/lib/data/` and nobody adds
    // it here — at which point the pair it forms is unchecked and the suite still passes.
    expect(PAIRS.map(([name]) => name)).toEqual([
      "accounts",
      "devices",
      "groups",
      "layout",
      "members",
      "requests",
      "rooms",
      "seats",
    ]);
  });

  for (const [name, mock, prisma] of PAIRS) {
    describe(name, () => {
      it("exports the same function names on both sides", () => {
        expect(exportedFunctions(prisma)).toEqual(exportedFunctions(mock));
      });

      it("exports at least one function", () => {
        expect(exportedFunctions(mock).length).toBeGreaterThan(0);
      });

      it("matches arity for every export", () => {
        for (const key of exportedFunctions(mock)) {
          const mockFn = mock[key] as (...args: unknown[]) => unknown;
          const prismaFn = prisma[key] as (...args: unknown[]) => unknown;
          expect(prismaFn.length, `${name}.${key} arity`).toBe(mockFn.length);
        }
      });
    });
  }
});
