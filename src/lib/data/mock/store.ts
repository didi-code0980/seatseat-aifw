// The names for where the mock seam's writes go.
//
// This module is NOT a copy of the fixture data. It re-exports the `fixtures.ts` arrays themselves —
// same object identity, no clone — so there is exactly one array per collection in the process. Every
// mock module that imports `rooms`, `seats` or `devices`, from here or from `../fixtures` directly,
// holds the same object and therefore cannot disagree with any other about what the seam contains.
//
// That property is load-bearing and it is the whole of the R8 fix (02-design.md sections 0.3, 3 and
// 7). An earlier version of this file cloned with `structuredClone`, which made the store a second
// source of truth: every module reading the collections then had to be repointed at it, the list of
// those modules lived in a design document, and nothing enforced the list — not
// `tests/unit/seam-parity.test.ts`, which compares the mock against Prisma and not against the store;
// not lint; not the type system. `mock/layout.ts` was missed, and after a room delete it kept
// returning the deleted room with all six of its deleted seats. INV-11 was observably false through a
// seam read path. Aliasing makes that state unrepresentable rather than merely currently-absent.
//
// What the clone was justified as buying, and did not: `prisma/seed.ts` runs in its own process
// (`pnpm db:seed`), so a runtime mutation was never able to reach the seed anyway; and it bought no
// test isolation, because a clone taken once at module load is exactly as process-global and as
// un-reset as the arrays it copied. The source text of `fixtures.ts` is what a reader opens to learn
// what the system starts with, and it is untouched by any of this.
//
// Still true, and QA needs it: this state is process-global and does NOT reset between tests. That is
// a property of any in-memory mock. Order destructive specs deliberately rather than discovering the
// ordering from a failure. No reset hook is exported — a test-only export on the seam is a second
// interface with no parity coverage, and `seam-parity.test.ts` would have to learn to ignore it.
//
// One consumer of `fixtures.ts` does not track the cascade and is safe: `fixtures.ts:73` builds
// `ports` with `seats.flatMap(...)`, a new array computed once at load rather than a view, so it
// still holds the ports of destroyed seats. Nothing in the seam reads it — `prisma/seed.ts` is its
// only consumer, in another process. Do not read `ports` from a mock module.

import {
  devices as seedDevices,
  groups as seedGroups,
  members as seedMembers,
  rooms as seedRooms,
  seats as seedSeats,
} from "../fixtures";
import type { Device, Group, Member, Room, Seat } from "../types";

export const rooms: Room[] = seedRooms;

/** A seat owns its ports (`Seat.ports`) and its occupancy (`Seat.occupantId`), so both travel with it. */
export const seats: Seat[] = seedSeats;

export const devices: Device[] = seedDevices;

/**
 * MEM-01. `mock/members.ts` becomes a writing module in that ticket, and a writing module that
 * bypasses the store makes this file's first sentence false and gives the next reader two places to
 * look. Aliased, like every binding above: same array object as `fixtures.ts`, no clone.
 */
export const members: Member[] = seedMembers;

/**
 * GRP-01, and the same reason MEM-01 added `members` above. `mock/groups.ts` read `groups` from
 * `../fixtures` directly while it only read, which was harmless; it becomes a writing module in this
 * ticket, and a writing module that bypasses the store makes this file's first sentence false.
 *
 * Aliased, like every binding above: same array object as `fixtures.ts`, no clone. That identity is
 * what lets `deleteGroup` detach a member through `members` here and have `/members` agree about
 * what happened — AC-13 is one write seen by two surfaces, not two writes that must be kept in step.
 */
export const groups: Group[] = seedGroups;
