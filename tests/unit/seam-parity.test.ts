// The test that makes the mock-to-Supabase swap safe.
//
// It imports both implementations of every entity and asserts they expose the same exported names
// with the same arity. Without it, the seam is a naming convention: a function added to the mock and
// forgotten in the Supabase module fails only in production, in the mode nobody runs locally —
// which, since ADR-007 flipped the default, is now every mode but the test suite's.
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

import * as supabaseAccounts from "@/lib/data/supabase/accounts";
import * as supabaseDevices from "@/lib/data/supabase/devices";
import * as supabaseGroups from "@/lib/data/supabase/groups";
import * as supabaseLayout from "@/lib/data/supabase/layout";
import * as supabaseMembers from "@/lib/data/supabase/members";
import * as supabaseRequests from "@/lib/data/supabase/requests";
import * as supabaseRooms from "@/lib/data/supabase/rooms";
import * as supabaseSeats from "@/lib/data/supabase/seats";

type Module = Record<string, unknown>;

const PAIRS: Array<[name: string, mock: Module, supabase: Module]> = [
  ["accounts", mockAccounts, supabaseAccounts],
  ["devices", mockDevices, supabaseDevices],
  ["groups", mockGroups, supabaseGroups],
  ["layout", mockLayout, supabaseLayout],
  ["members", mockMembers, supabaseMembers],
  ["requests", mockRequests, supabaseRequests],
  ["rooms", mockRooms, supabaseRooms],
  ["seats", mockSeats, supabaseSeats],
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

  for (const [name, mock, supabase] of PAIRS) {
    describe(name, () => {
      it("exports the same function names on both sides", () => {
        expect(exportedFunctions(supabase)).toEqual(exportedFunctions(mock));
      });

      it("exports at least one function", () => {
        expect(exportedFunctions(mock).length).toBeGreaterThan(0);
      });

      it("matches arity for every export", () => {
        for (const key of exportedFunctions(mock)) {
          const mockFn = mock[key] as (...args: unknown[]) => unknown;
          const supabaseFn = supabase[key] as (...args: unknown[]) => unknown;
          expect(supabaseFn.length, `${name}.${key} arity`).toBe(mockFn.length);
        }
      });
    });
  }
});
