// THE SEAM.
//
// Every component, page, and server action reaches data through this module and no other (RULE-02,
// enforced by the `no-restricted-imports` rule in eslint.config.mjs, checked again at review as R4).
//
// This is the one file allowed to name both implementations, because choosing between them is what
// it does. That is why it appears in the lint rule's exception list alongside
// `src/lib/data/supabase/**` and `scripts/seed.ts`.
//
// The switch is read once, at module load. DATA_SOURCE is not a per-request concern: a process that
// served one request from the mock and the next from the database would make every bug report
// ambiguous.

import * as mockAccounts from "./mock/accounts";
import * as mockDevices from "./mock/devices";
import * as mockGroups from "./mock/groups";
import * as mockLayout from "./mock/layout";
import * as mockMembers from "./mock/members";
import * as mockRequests from "./mock/requests";
import * as mockRooms from "./mock/rooms";
import * as mockSeats from "./mock/seats";

import * as supabaseAccounts from "./supabase/accounts";
import * as supabaseDevices from "./supabase/devices";
import * as supabaseGroups from "./supabase/groups";
import * as supabaseLayout from "./supabase/layout";
import * as supabaseMembers from "./supabase/members";
import * as supabaseRequests from "./supabase/requests";
import * as supabaseRooms from "./supabase/rooms";
import * as supabaseSeats from "./supabase/seats";

export type DataSource = "mock" | "supabase";

/**
 * `supabase` is the default — ADR-007 clause 7, the cutover the operator asked for in words — and an
 * unrecognised value is an error rather than a silent fallback: a typo that quietly served mock data
 * from a production process is the failure this refuses to have.
 *
 * The mock is kept, not deleted. It is what lets the unit suite run with no network at all, which
 * `.ai/standards/testing-standards.md` depends on; `vitest.config.mts` is where it is pinned.
 */
export function resolveDataSource(raw: string | undefined): DataSource {
  if (raw === undefined || raw === "") return "supabase";
  if (raw === "mock" || raw === "supabase") return raw;
  throw new Error(`DATA_SOURCE must be "mock" or "supabase", received ${JSON.stringify(raw)}`);
}

export const DATA_SOURCE: DataSource = resolveDataSource(process.env.DATA_SOURCE);

const useSupabase = DATA_SOURCE === "supabase";

export const accounts = useSupabase ? supabaseAccounts : mockAccounts;
export const devices = useSupabase ? supabaseDevices : mockDevices;
export const groups = useSupabase ? supabaseGroups : mockGroups;
export const layout = useSupabase ? supabaseLayout : mockLayout;
export const members = useSupabase ? supabaseMembers : mockMembers;
export const requests = useSupabase ? supabaseRequests : mockRequests;
export const rooms = useSupabase ? supabaseRooms : mockRooms;
export const seats = useSupabase ? supabaseSeats : mockSeats;

export type * from "./types";
