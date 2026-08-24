---
ticket: SEA-01
stage: DESIGN
agent: tech-lead-design
produced_at: 2026-08-24T02:10:53Z
inputs_read: [ .ai/board/tickets/SEA-01/ticket.yaml, .ai/board/tickets/SEA-01/01-story.md, .ai/board/tickets/DEV-01/ticket.yaml, .ai/board/tickets/DEV-01/02-design.md, .ai/registry/rules.md, .ai/registry/invariants.md, .ai/registry/features.md, .ai/standards/testing-standards.md, .ai/steward/context.md, .ai/templates/tech-design.md, .ai/01-operating-model.md, prisma/schema.prisma, src/lib/data/types.ts, src/lib/data/index.ts, src/lib/data/derive.ts, src/lib/data/fixtures.ts, src/lib/data/mock/store.ts, src/lib/data/mock/seats.ts, src/lib/data/mock/devices.ts, src/lib/data/mock/rooms.ts, src/lib/data/mock/members.ts, src/lib/data/mock/layout.ts, src/lib/data/prisma/seats.ts, src/lib/auth/permissions.ts, src/actions/devices.ts, src/lib/validation/device.ts, src/lib/validation/room.ts, src/app/(app)/layout.tsx, src/app/(app)/seats/page.tsx, src/app/(app)/devices/page.tsx, src/app/(app)/devices/devices-manager.tsx, src/app/(app)/rooms/page.tsx, src/components/shared/DataTable.tsx, src/components/shared/EntityFormDialog.tsx, src/components/shared/EmptyState.tsx, src/components/ui/Badge.tsx, tests/unit/seam-parity.test.ts, tests/unit/devices.test.ts, tests/e2e/smoke.spec.ts, tests/e2e/devices.spec.ts ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: IN_PROGRESS
---

# SEA-01 — Seat occupancy, assign and release — technical design

First version. All seven sections complete, `allowed_paths` enumerated and written back to
`ticket.yaml`, `size` set to `M`.

Six findings are raised against `01-story.md` and none of them blocks this gate. Section 0 states
each in full, because this document has to stand alone (RULE-16). Three of the six are answers to
questions the story asked DESIGN to answer — `Q-1`, `Q-2` and `Q-4` — and all three are answered
from the repository rather than assumed.

**The registry is not amended by this document and nothing here asks for it to be.** `schema_delta`
is `none` and `requires_adr` stays `false`. `H-1` in the story remains open and is a human's
(RULE-01).

---

## 0. Findings against the story, and what they do to this stage

### F-1 — `Q-1` answered: the seat's field set, transcribed and not invented

`01-story.md` `Q-1` asks what identifies a seat on this surface and what the occupancy field names
are, and records that no registry or standards document names one. `src/lib/data/types.ts:69-96`
and `prisma/schema.prisma:71-128` do. Transcribed:

| Field | Type | Written by this ticket? | Notes |
|---|---|---|---|
| `id` | `string` | no | `@default(cuid())` in Prisma, a seeded literal in the mock. Never displayed, never a testid — F-5. |
| `roomId` | `string` | no | Displayed as the room's `code`, resolved through `rooms.listRooms()`. |
| `code` | `string` | no | `@unique` (`prisma/schema.prisma:73`). **This is the seat identifier the surface displays and the key every seat testid is built from.** |
| `gridX`, `gridY`, `gridW`, `gridH` | `number` | **no** | Placement. Out of scope by the story's own scope decision and by out-of-scope item 1. Not read, not written, not rendered. |
| `ports` | `NetworkPort[]` | no | Rendered as today. Out-of-scope item 2 makes them fixed physical description. |
| `occupantId` | `string \| null` | **yes** | INV-01 expressed as a nullable single reference (`prisma/schema.prisma:110-114`). `null` is vacant. **This is the only field SEA-01 writes on a seat.** |

Two consequences the story could not state:

1. **Occupancy is a nullable column on `Seat`, not a join table.** `01-story.md` out-of-scope item 9
   quotes `data-model.md` on INV-01 needing *a uniqueness constraint on the current-occupancy
   relation*. Under this schema that constraint is structural rather than declared: a single
   nullable reference cannot hold two occupants, so INV-01 is held by the shape in `prisma` mode and
   by an explicit check in `src/lib/data/` under `mock`. The story's item 9 says the mock is weaker
   than a constraint; the finding is that the *schema* is not, and for a reason no index provides.
2. **`Seat.code` is `@unique`, so it is addressable.** That settles the row key — section 6.

AC-1's *the seat identifier the surface displays* resolves to `code`. The criterion becomes more
specific and not different, which is what the story predicted. Routed to `ba` as a RULE-14 amendment.

### F-2 — `Q-2` answered: the surface is a flat list of every seat, and it stays that way

`01-story.md` `Q-2` asks whether the surface is room-scoped or flat, and records that a room-scoped
surface *makes every criterion room-aware, which is a materially larger surface and moves `size`*.

Answered flat, and the story's own position is confirmed rather than overridden. Grounds:

- `listSeats(roomId?)` already takes an optional room filter (`src/lib/data/mock/seats.ts:7`), so a
  room-scoped variant is a later filter over the same seam call and costs nothing to defer.
- The seed holds 12 seats across 2 rooms (`src/lib/data/fixtures.ts:47-52`). A flat table of twelve
  rows needs no chooser to be usable.
- A room chooser is a second piece of client state on a surface whose only state is *which dialog is
  open*, and every criterion would gain a *within the chosen room* clause that no invariant asks for.

The room is carried as a **column** rather than as a scope, so AC-1's *every seat the system holds
within the scope of that screen* means every seat, and the room is still visible. This is section 7
alternative C.

### F-3 — `Q-4` answered: yes, and AC-6's Given no longer needs the seed at all

`01-story.md` `Q-4` asks whether any seeded seat holds two devices, one primary and one secondary,
and says **DESIGN or QA is expected to check this and raise it**. Checked, against
`src/lib/data/fixtures.ts:56-79`:

- `seat-a-01` (code `SEAT-A-01`, in `room-a`, code `ROOM-A`) is occupied by `mem-admin`.
- `dev-01` is assigned to that seat, `PRIMARY`, owned by `mem-admin`.
- `dev-02` is assigned to the same seat, `SECONDARY`, owned by `mem-admin`.

So assumption `A-5` holds, `Q-4` is answered yes, and AC-6 and AC-7 both have a Given in the seed as
written. **AC-7 does not need to be weakened.**

**But the recommendation is that neither criterion depend on the seed, and the reason is that the
world changed under the story.** `01-story.md` names `dev-01` explicitly, and justifies it by saying
QA *can neither look it up nor construct it, because designating a primary device is `DEV-01`'s
surface*. `DEV-01` is DONE and merged. Its section 6 publishes `devices-create-open`,
`devices-row-<assetTag>-assign` and `devices-row-<assetTag>-primary`, which means the whole Given —
a seat with an occupant, a device owned by that occupant assigned to it and designated primary, and a
second device beside it — is now **constructible from published selectors**, using this ticket's own
assign control to create the occupancy first.

That matters beyond tidiness. `tests/e2e/devices.spec.ts:11-18` records the discipline this repo
already runs under: *nothing seeded is mutated*, because one production server holds one mutable
store and `tests/e2e/smoke.spec.ts` asserts against seeded state. A SEA-01 e2e test that releases
`seat-a-01` to satisfy AC-6 destroys the occupancy `smoke.spec.ts` asserts on, and destroys
`dev-01`'s primary designation permanently for every later spec in the run — the mock has no reset
hook by design (`src/lib/data/mock/store.ts`).

**Routed to `ba` as a RULE-14 amendment: drop the `dev-01` and `ROOM-A` clauses from AC-6.** The
criterion is stronger without them. Section 6.2 specifies the constructed Given either way, so this
stage is not blocked on the answer, and AC-6 as written is still satisfiable.

### F-4 — assigning an occupant the system does not hold has no acceptance criterion

`Seat.occupantId` is a foreign key onto `Member` (`prisma/schema.prisma:114`). A `memberId` that
resolves to nobody must therefore be refused, and no criterion in `01-story.md` covers it. AC-2's
Given says *a member the system already holds* and AC-9 covers only the empty submission.

**This design specifies the refusal anyway, as `MEMBER_NOT_FOUND`, and that is not an invention.**
The seam is agreeing with the model rather than adding a rule of its own: a mock that writes an
`occupantId` no member answers to accepts data the database rejects, which is exactly the
mock-to-Prisma divergence the seam exists to prevent. It is the same shape as `DEV-01`'s F-1
(`assetTag @unique`) and `ROO-01`'s B3 (`Room.code @unique`), and it closed there as a new AC.

Routed to `ba` as a RULE-14 amendment, in the shape `ROO-01`'s AC-12 took. It changes no signature
here and blocks nothing: the reason code is in section 1.1 and is testable at the seam today.

### F-5 — `mock/devices.ts` is **not** written by this ticket, and `ticket.yaml`'s parallel-dispatch note is narrower than it needs to be

`ticket.yaml:14` states *SEA-01 writes `mock/seats.ts` and, because of INV-06, `mock/devices.ts`*,
and `01-story.md` carries the same implication.

It does not. The INV-06 downgrade lives inside `releaseSeatOccupant` in `src/lib/data/mock/seats.ts`
and writes the `devices` array through `./store`, which is the identical mechanism
`deleteRoom` already uses: `src/lib/data/mock/rooms.ts:66-73` detaches devices from inside the rooms
module, for the same reason — *deleting a seat is the most complete occupant exit there is*
(`mock/rooms.ts:60`). `store.ts` re-exports the fixture arrays themselves with no clone
(`src/lib/data/mock/store.ts:33-45`), so a write from `mock/seats.ts` is observed by
`mock/devices.ts` and by every other module, and `mock/devices.ts` already imports `seats` in the
mirror direction (`src/lib/data/mock/devices.ts:16`).

Two consequences:

1. `src/lib/data/mock/devices.ts` is **absent from `allowed_paths`** (section 5). Section 7
   alternative A is the version that writes it, and why it was rejected.
2. **The parallel dispatch with `MEM-01` is safer than `ticket.yaml` claims**, not less safe. The one
   collision `ticket.yaml:16-21` names — `MEM-01` putting a member-centric helper into
   `mock/seats.ts` — is unchanged and still real, and `Q-3` still stands as written. But the device
   module is not contested at all.

This is a correction to `ticket.yaml`'s seeding comment, which is board plane and not a gate item. It
is recorded here rather than edited there, because the comment is a record of what was believed when
the ticket was seeded and rewriting it would erase that.

### F-6 — `/seats` already exists as a read-only surface, and `tests/e2e/smoke.spec.ts` asserts on selectors this ticket must re-key

`src/app/(app)/seats/page.tsx` is a Phase B scaffold: it renders a `DataTable` keyed by `seat.id`
with columns Code, Room (rendered as the raw `roomId`), Ports and Status, and emits
`seats-status-<seat.id>`. `tests/e2e/smoke.spec.ts:47-51` asserts
`seats-status-seat-a-01` reads `OCCUPIED` and `seats-status-seat-a-03` reads `VACANT`.

Three things follow, and each is decided here rather than left to the Developer:

1. **Rows are re-keyed from `seat.id` to `seat.code`** (section 6), for the reason `ROO-01` re-keyed
   rooms to `code` and `DEV-01` re-keyed devices to `assetTag`: `id` is `@default(cuid())` in Prisma,
   so a testid built from one is unaddressable the moment `DATA_SOURCE=prisma`. `Seat.code` is
   `@unique` (F-1). `seats-status-<id>` becomes `seats-row-<code>-status`.
2. **`tests/e2e/smoke.spec.ts` is therefore in `allowed_paths`**, exactly as it was for `DEV-01`. Its
   INV-03 assertion is rewritten fixture-blind — section 6.2 gives the shape — because as it stands
   it quotes two seeded seat ids, which is knowledge RULE-05 does not permit that suite to hold. The
   comment `DEV-01` left at `tests/e2e/smoke.spec.ts:55-63` is that rewrite for devices and is the
   precedent.
3. **The seeded occupancy `smoke.spec.ts` depends on is now mutable by a SEA-01 test.** Before this
   ticket nothing could change a seat's occupant. Section 6.2 makes restoring it a constraint on the
   suite rather than an accident waiting for a CI failure.

---

## 1. Contract

Copy-pasteable and complete. Nothing here is contingent on an answer to section 0. Every field name
that appears in the code appears here first (RULE-04); the Developer may not invent one.

### 1.1 Seam DTOs — `src/lib/data/types.ts` (additive only)

`Seat`, `Device`, `Member` and `Room` are **unchanged**. Two types are added and no existing type is
modified, which is what keeps this ticket out of the XL row (section 5).

```ts
/**
 * AC-2, AC-3, AC-9, and F-4. INV-01 is the seam's refusal, not the caller's: whether a seat already
 * has an occupant is stored data and not something the caller supplied, so the check belongs where
 * the data is. A caller has to narrow this before it can claim success.
 *
 * `SEAT_OCCUPIED` and `MEMBER_NOT_FOUND` are separate members rather than one "ILLEGAL", for the
 * reason `DesignatePrimaryOutcome` gives: a shared reason code makes two failures indistinguishable
 * in a test, which is how the bug survives.
 *
 * There is no `SEAT_ALREADY_OCCUPIED_BY_THIS_MEMBER` arm. Assigning member A to a seat A already
 * occupies is refused as `SEAT_OCCUPIED` like any other: INV-01 counts occupants, not identities,
 * and an idempotent success would be a write path that reports having done something it did not do.
 */
export type AssignOccupantOutcome =
  | { assigned: true; seat: Seat }
  | { assigned: false; reason: "SEAT_NOT_FOUND" | "MEMBER_NOT_FOUND" | "SEAT_OCCUPIED" };

/**
 * AC-5, AC-6, AC-7, AC-8. INV-06 is a consequence of this operation and not of any other
 * (invariants.md: "it is what INV-05 forces to happen when occupancy ends"), so the downgrade
 * happens here and the fact that it happened is returned rather than inferred.
 *
 * `downgradedDeviceId` names the device this release demoted from PRIMARY to SECONDARY, or null when
 * the seat had no primary device. It is returned for the reason `DeleteRoomOutcome` returns its
 * counts and `DesignatePrimaryOutcome` returns `demotedDeviceId`: AC-6 is assertable at the seam,
 * where the downgrade actually happens, and not only through a second surface.
 *
 * A seat may hold at most one primary device (INV-04), so this is a single id and not a list. The
 * release path only ever REMOVES a primary designation, which is the one-directional engagement
 * `01-story.md` records for INV-04.
 */
export type ReleaseOccupantOutcome =
  | { released: true; seat: Seat; downgradedDeviceId: string | null }
  | { released: false; reason: "SEAT_NOT_FOUND" | "SEAT_NOT_OCCUPIED" };
```

No `NewSeat`, no `SeatPatch`, no `OccupancyPatch`. Seat CRUD is out-of-scope item 2 and placement is
item 1; a patch type with a `gridX` in it is the first step to a surface that moves seats.

### 1.2 Seam functions — `src/lib/data/mock/seats.ts` and `src/lib/data/prisma/seats.ts`

Two functions are added to both sides, same names and same arity, or `tests/unit/seam-parity.test.ts`
fails. `listSeats`, `getSeat` and the `deriveSeatStatus` re-export are unchanged.

```ts
export async function assignSeatOccupant(
  seatId: string,
  memberId: string
): Promise<AssignOccupantOutcome>;

export async function releaseSeatOccupant(seatId: string): Promise<ReleaseOccupantOutcome>;
```

**Four rules the implementation must hold, each tied to what would break without it.**

1. **`assignSeatOccupant` checks in this order: seat, member, occupancy.** `SEAT_NOT_FOUND` before
   `MEMBER_NOT_FOUND` before `SEAT_OCCUPIED`. A seat that is gone has no occupancy to read, and
   reporting `SEAT_OCCUPIED` for a seat that does not exist is a refusal for the right reason by
   accident — the same failure mode `designatePrimaryDevice` orders its four checks against
   (`src/lib/data/mock/devices.ts:154-171`).
2. **`assignSeatOccupant` writes `occupantId` and nothing else.** No device row is read and none is
   written. This is AC-11 and it is where INV-05 is at genuine risk: the seat may still carry the
   previous occupant's devices, and promoting one would give the seat a primary device owned by a
   non-occupant. **No code path in this ticket sets `rank = "PRIMARY"`.** A reviewer checking R8
   should grep for it and find nothing.
3. **`releaseSeatOccupant` demotes before it clears, with no `await` between the first write and the
   last.** Under the mock there is no constraint to refuse an intermediate state, so a seat that is
   vacant while a device still points at it as PRIMARY must not be observable — that state is INV-05
   false, and `mock/rooms.ts:52-56` states the same requirement for the room cascade.
4. **`releaseSeatOccupant` changes `rank` on exactly one device and `seatId` on none.** This is `A-2`
   and AC-7 in one sentence: the primary device becomes secondary, it stays on the seat, its owner is
   untouched, and every other device on that seat is untouched. INV-07 permits a device to sit
   unassigned; nothing here puts one there.

The mock reads `members` from `../fixtures` rather than adding it to `./store`. `store.ts` is the
names for where the mock seam's *writes* go and nothing in this ticket writes a member; the two
bindings are the same array either way (`src/lib/data/mock/store.ts:33-45`). It is stated because
`MEM-01` is running in parallel and may add a `members` export to `store.ts` — SEA-01 must not.

Reference implementation for the mock, which the Developer may take as written:

```ts
// src/lib/data/mock/seats.ts — added below the existing listSeats/getSeat.
import { members } from "../fixtures";
import { devices, seats } from "./store";

export async function assignSeatOccupant(
  seatId: string,
  memberId: string
): Promise<AssignOccupantOutcome> {
  const seat = seats.find((s) => s.id === seatId);
  if (seat === undefined) return { assigned: false, reason: "SEAT_NOT_FOUND" };
  // F-4. `Seat.occupantId` is a foreign key onto Member; the seam agrees with the model rather
  // than writing an occupantId no member answers to.
  if (!members.some((m) => m.id === memberId)) {
    return { assigned: false, reason: "MEMBER_NOT_FOUND" };
  }
  // INV-01. Under `prisma` the single nullable reference cannot hold two occupants; under `mock`
  // this line is the only mechanism, which is out-of-scope item 9 stated as code.
  if (seat.occupantId !== null) return { assigned: false, reason: "SEAT_OCCUPIED" };

  // AC-11, INV-05: occupancy and nothing else. No device is read and none is promoted.
  // INV-02: no check on how many other seats this member occupies — the invariant is the absence
  // of that constraint, and adding one is the only way to break it.
  seat.occupantId = memberId;
  return { assigned: true, seat: structuredClone(seat) };
}

export async function releaseSeatOccupant(seatId: string): Promise<ReleaseOccupantOutcome> {
  const seat = seats.find((s) => s.id === seatId);
  if (seat === undefined) return { released: false, reason: "SEAT_NOT_FOUND" };
  // AC-8. A release against a vacant seat is refused rather than succeeding silently: a write path
  // with nothing to write that still runs the INV-06 downgrade can demote a device on a seat that
  // never had an occupant to lose.
  if (seat.occupantId === null) return { released: false, reason: "SEAT_NOT_OCCUPIED" };

  // INV-06. AC-6 and AC-7: the designation is removed, the association is not. INV-04 makes this at
  // most one device, so the first match is the only match.
  const primary = devices.find((d) => d.seatId === seatId && d.rank === "PRIMARY");
  let downgradedDeviceId: string | null = null;
  if (primary !== undefined) {
    primary.rank = "SECONDARY";
    downgradedDeviceId = primary.id;
  }
  seat.occupantId = null;

  return { released: true, seat: structuredClone(seat), downgradedDeviceId };
}
```

The Prisma side is `notWired` in both cases, matching every other unimplemented seam function
(`src/lib/data/prisma/seats.ts`):

```ts
export async function assignSeatOccupant(
  seatId: string,
  memberId: string
): Promise<AssignOccupantOutcome> {
  void seatId;
  void memberId;
  return notWired("assignSeatOccupant");
}

export async function releaseSeatOccupant(seatId: string): Promise<ReleaseOccupantOutcome> {
  void seatId;
  return notWired("releaseSeatOccupant");
}
```

### 1.3 Zod schemas — `src/lib/validation/seat.ts` (new file)

```ts
import { z } from "zod";

// Zod schemas are the contract's runtime half. The field names here must match section 1 exactly
// (RULE-04) — a schema that accepts a field the contract does not name is how an invented name
// reaches the database.
//
// TODO(verify): these mirror the DRAFT prisma/schema.prisma. They change when it is approved.

export const seatIdSchema = z.string().trim().min(1);

// AC-9's "no member chosen" is refused here and nowhere else. The occupant control is a `<select>`
// whose first option is a placeholder with `value=""`, so an unmade choice submits the empty string
// and fails `.min(1)`. No `required` attribute is relied on: that is a browser affordance and the
// server action is a network boundary.
export const occupantIdSchema = z.string().trim().min(1);

export const assignSeatSchema = z.object({
  seatId: seatIdSchema,
  occupantId: occupantIdSchema,
});

export const releaseSeatSchema = z.object({ seatId: seatIdSchema });

export type AssignSeatInput = z.infer<typeof assignSeatSchema>;
export type ReleaseSeatInput = z.infer<typeof releaseSeatSchema>;
```

**The form field is named `occupantId`, not `memberId`.** It names the role the member plays on this
seat, it is the field it lands in (`Seat.occupantId`), and the glossary defines an Occupant as *the
person currently assigned to a seat*. The seam parameter stays `memberId` because at that boundary
it is an id of a member and nothing yet makes it an occupant.

No `seatCodeSchema` and no `gridX`. Nothing on this surface creates a seat or moves one.

### 1.4 Server actions — `src/actions/seats.ts` (new file)

Every write action runs the five steps in the order `coding-standards.md` fixes: `"use server"`,
parse with the schema from 1.3, check permission, call the seam, return a typed result. **Step 3 is
absent on this ticket by specification and not by oversight** — section 2 — and each action carries
the comment at the line where the check belongs, as `src/actions/devices.ts` does.

Each parameter is `unknown` and is narrowed by its schema inside the action. A server action is a
network boundary; typing it as `AssignSeatInput` would claim a guarantee the caller never had to
honour, and on this surface that matters more than most, because AC-3 and AC-8 are both refusals the
UI deliberately does not offer a control for (1.5).

```ts
"use server";

import { revalidatePath } from "next/cache";

import { seats } from "@/lib/data";
import type { Seat } from "@/lib/data";
import { assignSeatSchema, releaseSeatSchema } from "@/lib/validation/seat";

export type SeatFieldName = "seatId" | "occupantId";

/**
 * `REFUSED`, and why it is not called `INVARIANT`. `coding-standards.md` reserves that word for an
 * invariant that CANNOT be satisfied — state already wrong, escalated under RULE-07. Nothing here is
 * that. AC-3 and AC-8 are the system preventing a violation on a write a person attempted, which is
 * an ordinary expected failure and returns a typed refusal.
 *
 * `field` carries `"occupantId"` for the refusals that belong against the occupant select and null
 * for the row-action refusals, which render in the page-level region (section 6).
 */
export type SeatActionError =
  | { kind: "VALIDATION"; fields: Partial<Record<SeatFieldName, string>> }
  | { kind: "REFUSED"; field: SeatFieldName | null; message: string }
  | { kind: "NOT_FOUND"; message: string };

export type SeatActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SeatActionError };

/** AC-6: the downgrade is carried back so the caller knows it happened without re-reading devices. */
export type ReleaseSeatData = { seat: Seat; downgradedDeviceId: string | null };

const SEAT_OCCUPIED_MESSAGE = "That seat already has an occupant.";
const SEAT_NOT_OCCUPIED_MESSAGE = "That seat has no occupant to release.";
const MEMBER_GONE_MESSAGE = "That member no longer exists.";
const SEAT_GONE_MESSAGE = "That seat no longer exists.";

export async function assignSeat(input: unknown): Promise<SeatActionResult<Seat>>;
export async function releaseSeat(input: unknown): Promise<SeatActionResult<ReleaseSeatData>>;
```

**The mapping from seam reason to action error is part of the contract.** Assert on these strings by
value; they are what distinguishes one refusal from another, which is the distinction `01-story.md`
puts AC-3 and AC-8 in the criteria set to protect.

| Action | Seam reason | `kind` | `field` | Message |
|---|---|---|---|---|
| `assignSeat` | `SEAT_OCCUPIED` | `REFUSED` | `null` | `That seat already has an occupant.` |
| `assignSeat` | `MEMBER_NOT_FOUND` | `REFUSED` | `"occupantId"` | `That member no longer exists.` |
| `assignSeat` | `SEAT_NOT_FOUND` | `NOT_FOUND` | — | `That seat no longer exists.` |
| `assignSeat` | schema failure | `VALIDATION` | per field | Zod's message, first per field |
| `releaseSeat` | `SEAT_NOT_OCCUPIED` | `REFUSED` | `null` | `That seat has no occupant to release.` |
| `releaseSeat` | `SEAT_NOT_FOUND` | `NOT_FOUND` | — | `That seat no longer exists.` |

`SEAT_OCCUPIED` maps to `field: null` and not to `occupantId`, and the difference is not cosmetic:
the seat being occupied is not a fact about the member the user chose, and putting the message under
the occupant select would tell them to pick somebody else, which is exactly the wrong instruction.
`MEMBER_NOT_FOUND` does belong against that field, because that is the value the user supplied.

**Both actions revalidate two paths.**

```ts
revalidatePath("/seats");
revalidatePath("/devices");
```

`releaseSeat` must, because the INV-06 downgrade changes a device's designation and `/devices`
renders it — a cached devices page would show a rank the store no longer holds, and AC-6 is verified
on that surface (section 6.2). `assignSeat` must, because `/devices` renders each device's *seat
occupant* cell (`devices-row-<assetTag>-occupant`), which is a fact about a seat this action just
changed. Revalidating one path and not the other is the defect that looks like a caching quirk and
is a contract violation.

### 1.5 UI control rules

Five rules. Each one is the reason a criterion is reachable or a state is unreachable.

1. **The assign control is present only on a seat with no occupant** (AC-1). The release control is
   present only on a seat that has one (AC-1). The criterion says so in terms and the surface obeys
   it literally.
2. **Consequently AC-3 and AC-8 are not reachable through this UI, and that is correct.**
   `01-story.md` is explicit — *the refusal belongs to the operation, not to the absence of a
   control* — and names the path that reaches it: two clients racing on the same free seat, or a
   stale view. Both criteria are verified at the seam and in the action, never through a button
   (section 6.2). This is the deliberate opposite of `DEV-01`'s *Make primary* control, which is
   rendered on every row precisely because its refusal has no other route; here the story fixes the
   affordance and the seam carries the refusal.
3. **No control on this surface sets, confirms, or corrects a seat's status** (AC-10, INV-03). The
   status cell is rendered from `seats.deriveSeatStatus(seat)` on every read and is never held in
   client state. A surface that offers a status control has already lost the invariant regardless of
   what the schema says.
4. **No device is shown, chosen, or edited** (out-of-scope item 6). There is no device column, no
   primary-device column, and no *make primary* control. The INV-06 downgrade is invisible on this
   screen and is observed on `/devices` — section 6.2, and section 7 alternative D for the column
   that was rejected.
5. **Release is a bare row control with no confirmation dialog.** No criterion asks for one and
   INV-06 asks for a downgrade rather than a warning; the shape follows `DEV-01`'s *Unassign*
   (`src/app/(app)/devices/devices-manager.tsx:204-210`). Section 7 alternative B is the confirmation
   that was rejected, and it is the closest call in this document.

The page is split as every other manager screen is: `page.tsx` is a server component that reads
through the seam and holds no state, `seats-manager.tsx` is the client half and keeps no copy of the
seat list. Every mutation calls `revalidatePath` on the server and `router.refresh()` on the client,
which is what makes AC-2's and AC-5's *without my having to reload the page* true.

The row shape the server component builds, and the two option lists:

```ts
// src/app/(app)/seats/page.tsx
export interface SeatRow {
  seat: Seat;
  /** The occupant's full name, or null when the seat is vacant. AC-1. */
  occupantName: string | null;
  /** The code of the room this seat belongs to. F-2: the room is a column, not a scope. */
  roomCode: string;
}

export interface OccupantOption {
  id: string;
  fullName: string;
}
```

The join happens in the page and not behind a `listSeatRows()`, for the reason `DEV-01`'s
`devices/page.tsx:36-43` gives: a joined DTO puts a new *shape* across the seam rather than a new
name, and shape is the one thing `tests/unit/seam-parity.test.ts` does not check.

---

## 2. Permission model

**No permission gate is implemented by this ticket, and that is the specified state rather than an
omission.** The `AUT — Authentication & Accounts` table in `.ai/registry/features.md` is empty: there
is no session, no role to read, and no rank to compare. `ROO-01` and `DEV-01` both shipped under the
same condition. `01-story.md`'s Permissions section and out-of-scope item 5 carry the guard to the
`AUT` group.

`PermissionGate` is **not imported** by `seats-manager.tsx` and `can()` is **not called**. A control
wrapped in a gate fed a hard-coded role renders a surface that looks guarded and is not, which
`rbac-and-security.md` calls an open endpoint with a hidden button. Not gating is the honest state;
gating against a stub is the dishonest one.

Consequently, while this ticket is the current state of the code, **every seat assignment and every
release is reachable by anyone who can reach the application.**

### 2.1 The gate each operation takes when `AUT` lands

Transcribed from `01-story.md`'s Permissions table and from the helpers that already exist in
`src/lib/auth/permissions.ts`. Nothing below is implemented here.

| Operation | Where the check goes | Gate | `USER` | Denial |
|---|---|---|---|---|
| Render `/seats`, list seats with occupants | `page.tsx`, then the action | any authenticated member | allowed | unauthenticated: no surface |
| `assignSeat` | `src/actions/seats.ts`, step 3 | `canApproveRequests(role)` — `can(role, "MANAGER")` | **denied** | a `USER` assigning is refused by the action, not by a hidden control |
| `releaseSeat`, any seat | `src/actions/seats.ts`, step 3 | `canApproveRequests(role)` | **denied** | as above |
| `releaseSeat`, a seat the caller occupies | `src/actions/seats.ts`, step 3 | rank `USER` **plus** `seat.occupantId === session.memberId` | **allowed** | a `USER` releasing somebody else's seat is refused by the same mechanism that refuses an unauthenticated caller |

`canApproveRequests` is the existing helper and is the right one: `rbac-and-security.md` scopes a
Manager to *approve requests, assign seats, manage accounts, members, and devices*, and the helper's
own comment already reads *approving seat requests and assigning seats is Manager-or-above*. No new
helper is needed for the first three rows. **The fourth row needs one that does not exist**, because
self-release is a rank check plus an ownership check and `can()` compares ranks only — the same shape
`rbac-and-security.md` describes for *manage their own devices*.

`canManageRooms` (ADMIN) is deliberately **not** the gate here. Room, seat and layout **CRUD** is
Admin-only; assigning an occupant is not seat CRUD — it creates no seat and destroys none (`A-3`) —
and gating occupancy at ADMIN would make the Manager scope's *assign seats* unreachable.

The `USER` *assign* denial is not a threshold that could be lowered later by accident: a User
obtaining a seat goes through a seat **request**, which is the `REG` group. A User who can assign
themselves a seat directly has routed around the approval the request exists to obtain.

When the guard is built it goes on the action's step 3 line in every row above, never in
`PermissionGate` alone. `PermissionGate` hides a control; it does not protect an operation.

---

## 3. Seam impact

**Two functions added, none changed, none removed. No existing signature moves and no existing caller
changes.**

| Module | Change |
|---|---|
| `src/lib/data/types.ts` | `AssignOccupantOutcome`, `ReleaseOccupantOutcome` added. Additive; no existing type modified. |
| `src/lib/data/mock/seats.ts` | `assignSeatOccupant` (arity 2) and `releaseSeatOccupant` (arity 1) added. `listSeats`, `getSeat`, the `deriveSeatStatus` re-export unchanged. Gains an import of `devices` from `./store` and `members` from `../fixtures`. |
| `src/lib/data/prisma/seats.ts` | The same two names and the same two arities, both `notWired`. |
| `src/lib/data/derive.ts` | **none.** `deriveSeatStatus` is correct as it stands and is what makes INV-03 hold on this surface. |
| `src/lib/data/mock/devices.ts` | **none** — F-5. The INV-06 write lives in `mock/seats.ts` and reaches the same array through `./store`. |
| `src/lib/data/mock/store.ts` | **none.** No new binding. `MEM-01` may add one; SEA-01 must not. |
| `src/lib/data/fixtures.ts` | **none.** `Q-4` is answered yes by the seed as it stands (F-3), so no fixture change is needed. |
| `src/lib/data/mock/layout.ts`, `mock/rooms.ts` | **none.** Occupancy travels on the seat object, which both already hold by identity. |

`tests/unit/seam-parity.test.ts` covers the two additions automatically: it compares exported
function names and arity per module pair, and both new functions land in the `seats` pair. It is
**not** in `allowed_paths` and does not need to be — the `PAIRS` list already names `seats` and no
new entity is introduced. Parity is necessary and not sufficient (`testing-standards.md`), which is
why section 6.1 also pins the return shapes QA asserts on.

**The one cross-module write, stated plainly for R8.** `releaseSeatOccupant` writes `Device.rank` on
a device row from inside the seats module. That is deliberate, it is INV-06, and it has a precedent
in the same layer: `deleteRoom` writes `Device.seatId` and `Device.rank` from inside the rooms module
(`src/lib/data/mock/rooms.ts:66-73`). The rule both follow is that **the cascade lives with the
operation that causes it, not with the entity that suffers it** — because the operation is the only
place that knows the cascade is happening. Section 7 alternative A is the version that inverts this,
and why it was rejected.

---

## 4. Schema delta

**`none`.** `requires_adr` stays `false`.

This ticket writes one field that already exists — `Seat.occupantId`, `prisma/schema.prisma:113` —
and one field on a device that already exists — `Device.rank`, `prisma/schema.prisma:194`. No model
is added, no column is added, no column is removed, no index changes, and no migration is written.

Three things that might look like schema work and are not:

- **INV-01's uniqueness.** `data-model.md` asks for a uniqueness constraint on the current-occupancy
  relation. The draft schema already satisfies it structurally: `occupantId String?` is a single
  nullable reference and cannot hold two occupants (F-1). Nothing to add.
- **INV-05's partial unique index.** Named in `invariants.md` and still unwritten. It is not this
  ticket's: SEA-01 never sets a primary designation (1.2 rule 2), so the index would constrain no
  write this ticket makes. It belongs to the ticket that applies the schema.
- **INV-03.** The absence of a `status` column is the invariant. Absence needs no migration, and a
  migration that added one would be the violation.

Out-of-scope item 8 is held: if seat occupancy turned out to be undeliverable without a migration,
this stage would stop with BLOCKED rather than acquire one. It is deliverable, so it does not.

---

## 5. allowed_paths

Enumerated, written back into `ticket.yaml`. Eleven entries.

```yaml
allowed_paths:
  - "src/app/(app)/seats/page.tsx"
  - "src/app/(app)/seats/seats-manager.tsx"
  - "src/actions/seats.ts"
  - "src/lib/validation/seat.ts"
  - "src/lib/data/types.ts"
  - "src/lib/data/mock/seats.ts"
  - "src/lib/data/prisma/seats.ts"
  - "tests/unit/seats.test.ts"
  - "tests/e2e/seats.spec.ts"
  - "tests/e2e/smoke.spec.ts"
  - ".ai/board/tickets/SEA-01/**"
```

Two entries need their justification on the record, because both look like scope creep and neither
is:

- **`src/app/(app)/seats/page.tsx` is rewritten, not created.** F-6: it exists as a Phase B read-only
  scaffold. AC-1 requires an occupant column, a status that agrees with it, and two row controls, and
  the existing page has none of them.
- **`tests/e2e/smoke.spec.ts` is in the list for the same reason it was in `DEV-01`'s**: re-keying
  seat rows from `id` to `code` moves a selector that suite asserts on (F-6). The edit is confined to
  the seat test in that file.

**Four things deliberately absent**, each of which a Developer might reach for:

- `src/lib/data/mock/devices.ts` — F-5. Nothing to change there.
- `src/lib/data/mock/store.ts` — no new binding; `MEM-01` is the ticket that may need one.
- `src/lib/data/fixtures.ts` — `Q-4` is answered yes by the seed as it stands (F-3).
- `src/lib/auth/permissions.ts` — section 2. This ticket implements no gate, so it adds no helper.

### `size` — **M**

Eleven paths, which is the M row of the sizing table in `.ai/01-operating-model.md` (M is up to 12).

**It is not XL.** The XL row names three triggers and this ticket meets none of them: no schema
change (section 4), no changed signature of an existing `src/lib/data/` function (section 3 — two are
added, none altered), and the `types.ts` change is two new types with no existing type modified, so
no existing caller has to follow. The operating model states the test explicitly — *whether existing
callers must change, not whether the seam was touched at all* — and adding functions to
`src/lib/data/` is called ordinary feature work in the same paragraph. This is `DEV-01`'s position on
the same question.

**It is not L.** Eleven is inside the M ceiling with one to spare, and the two candidates for a
twelfth were both examined and are absent by decision rather than by luck (`mock/devices.ts` and
`fixtures.ts`, above).

**`size_estimate` was `M` and the verdict is `M`. They agree, so nothing routes back to `ba`.** The
`ba`'s reasoning survives inspection on both of its grounds: the surface is new, and the ticket does
write across two entities. It got the second one right for a reason that turned out to be false — the
device write happens in `mock/seats.ts`, not `mock/devices.ts` (F-5) — but the write is real, and it
is the reason `DEV-01` had to land first, which was the substance of the claim.

---

## 6. Testability contract

Every selector QA may use. RULE-05 makes this the only channel: a control absent from this table does
not exist as far as QA is concerned, and check R7 verifies the reverse — every testid here appears in
the markup.

**Rows are keyed by seat `code`, not by seat id.** `Seat.code` is `@unique`
(`prisma/schema.prisma:73`) and is the identifier the surface displays, which is what AC-1 means by
*the seat identifier the surface displays*. Ids are `@default(cuid())` under Prisma and are not
addressable across the seam swap. This is the decision that puts `tests/e2e/smoke.spec.ts` in
`allowed_paths` (F-6, section 5).

Two prefixes come from shared components and are reused rather than redefined: `DataTable` emits
`${prefix}-table`, `${prefix}-row-${key}` and `${prefix}-empty`; `EntityFormDialog` emits
`${prefix}-dialog`, `${prefix}-cancel` and `${prefix}-submit`.

| data-testid | Element | Used by |
|---|---|---|
| `seats-page` | The seat occupancy screen's root section | AC-1 |
| `seats-table` | The seat list table | AC-1, AC-2, AC-4, AC-5, AC-10 |
| `seats-empty` | Empty-state message shown when no seat exists | AC-1 |
| `seats-row-<code>` | One row per seat, keyed by seat code | AC-1, AC-2, AC-4, AC-5, AC-10, AC-11 |
| `seats-row-<code>-code` | The seat code cell | AC-1 |
| `seats-row-<code>-room` | The room cell — the room's `code`, not its id | AC-1 |
| `seats-row-<code>-ports` | The ports cell — comma-separated port codes | AC-1 |
| `seats-row-<code>-occupant` | The occupant cell — the occupant's full name, or the literal `no occupant` when the seat is vacant | AC-1, AC-2, AC-4, AC-5, AC-11 |
| `seats-row-<code>-status` | The status cell — `OCCUPIED` or `VACANT`, derived on every read | AC-1, AC-2, AC-4, AC-5, AC-10 |
| `seats-row-<code>-assign` | Assign control on a row. **Present only when the seat has no occupant** — 1.5 rule 1 | AC-1, AC-2, AC-4, AC-9, AC-10, AC-11 |
| `seats-row-<code>-release` | Release control on a row. **Present only when the seat has an occupant** — 1.5 rule 1 | AC-1, AC-5, AC-6, AC-7, AC-10 |
| `seats-action-error` | Page-level message for a refused row action. **Absent until one is refused** | AC-8 *(see 6.2)* |
| `seat-assign-dialog` | The assign dialog | AC-2, AC-9 |
| `seat-assign-occupant` | Occupant select. First option is a placeholder with `value=""` | AC-2, AC-4, AC-9, AC-11 |
| `seat-assign-occupant-error` | Validation message against the occupant select. **Absent until the field is rejected** | AC-9 |
| `seat-assign-seat` | Read-only element naming the seat the dialog is about — its `code` | AC-2, AC-9 |
| `seat-assign-cancel` | Cancel control in the assign dialog | AC-9 |
| `seat-assign-submit` | Submit control in the assign dialog | AC-2, AC-4, AC-9, AC-11 |

**No `data-testid` anywhere on this surface names a device, a status control, or a grid coordinate.**
That is 1.5 rules 3 and 4 expressed as an absence: there is nothing here for a test to click that
could set a status directly (AC-10) and nothing that could designate a primary device (AC-11).

**The status cell has no separate `OCCUPIED`/`VACANT` element.** One element, three-way readable
against the occupant cell beside it — that is what makes AC-10's three-write sequence assertable as a
sequence rather than as three unrelated states.

### 6.1 The seam surface QA may call

`tests/unit/seats.test.ts` may call exactly this and nothing else. Anything absent from this table is
out of bounds for the same reason an unlisted selector is.

```ts
import { devices, members, rooms, seats } from "@/lib/data";
```

| Call | Returns | Fields QA may assert on |
|---|---|---|
| `seats.listSeats(roomId?)` | `Promise<Seat[]>` | `id`, `code`, `roomId`, `occupantId` (`string \| null`) |
| `seats.getSeat(id)` | `Promise<Seat \| null>` | the same fields |
| `seats.deriveSeatStatus(seat)` | `SeatStatus` | `"OCCUPIED" \| "VACANT"` |
| `seats.assignSeatOccupant(seatId, memberId)` | `Promise<AssignOccupantOutcome>` | `assigned`, and `seat` or `reason` |
| `seats.releaseSeatOccupant(seatId)` | `Promise<ReleaseOccupantOutcome>` | `released`, `downgradedDeviceId`, and `seat` or `reason` |
| `devices.listDevices()` | `Promise<Device[]>` | `id`, `assetTag`, `ownerId`, `seatId` (`string \| null`), `rank` (`"PRIMARY" \| "SECONDARY"`) |
| `devices.createDevice(input)` | `Promise<CreateDeviceOutcome>` | `created`, and `device` or `reason` |
| `devices.assignDeviceToSeat(deviceId, seatId)` | `Promise<AssignDeviceOutcome>` | `assigned`, and `device` or `reason` |
| `devices.designatePrimaryDevice(deviceId)` | `Promise<DesignatePrimaryOutcome>` | `designated`, `demotedDeviceId`, and `device` or `reason` |
| `devices.deleteDevice(id)` | `Promise<DeleteDeviceOutcome>` | `deleted`, `wasPrimaryOfSeatId`, or `reason` |
| `members.listMembers()` | `Promise<Member[]>` | `id`, `fullName` |
| `rooms.listRooms()` | `Promise<Room[]>` | `id`, `code` |

The exact reason strings are in section 1.1 and the action messages are in the table in 1.4. Both are
part of the contract — **assert on them by value.** They are what distinguishes AC-3 from AC-8, and
`01-story.md` is explicit that folding two refusals onto one code is where the defect hides.

The four `devices.*` write calls are here for one purpose: **they are how AC-6, AC-7 and AC-11 build
their Given without quoting the seed.** Create two devices owned by a member, assign both to a vacant
seat, occupy that seat with `assignSeatOccupant`, designate one device primary, then release. That
sequence produces AC-7's Given exactly, and AC-11's follows from it. It is F-3's recommendation in
executable form and it works whether or not `ba` amends AC-6.

`@` resolves to `src/` under vitest (`vitest.config.mts`) and `tests/unit/**/*.test.ts` is the only
pattern vitest collects. Each unit test **file** gets its own module graph, so the store this file
mutates is not the one `tests/unit/devices.test.ts` mutates. **Within one file it is shared and does
not reset** — `src/lib/data/mock/store.ts` exports no reset hook, deliberately — so order destructive
cases rather than discovering the ordering from a failure.

### 6.2 Constraints on the test suites, and where each criterion is verified

**Three constraints this design imposes, not the suite's to choose.**

1. **`tests/e2e/seats.spec.ts` runs serial.** `playwright.config.ts` sets `fullyParallel: true` and
   one production server holds one mutable store. AC-2, AC-4, AC-5 and AC-11 all assert that *no
   other seat's occupant changes*, which is not meaningful while another worker is writing to the
   same array. Set `test.describe.configure({ mode: "serial" })`, as `tests/e2e/devices.spec.ts:20`
   does.
2. **Every test restores the occupancy it changed.** This is new with this ticket and it is the
   hazard F-6 names: before SEA-01 nothing could change a seat's occupant, and
   `tests/e2e/smoke.spec.ts` asserts on seeded occupancy. A spec that releases a seeded seat and
   walks away has silently changed the fixture for every later spec in the run. Assign back what you
   released; release what you assigned.
3. **Nothing seeded is quoted.** No seat code, no member id, no asset tag from `fixtures.ts` appears
   in any test file — RULE-05, and `src/**` is not read. Seats, members and rooms are **discovered**
   through `seats.listSeats()`, `members.listMembers()` and `rooms.listRooms()` in unit tests, and
   through the rendered table in e2e tests. Devices a test needs are devices it created.

**Where each criterion is verified.** AC-3 and AC-8 are the two that have no UI route, by design
(1.5 rule 2), and this table is the only place that says so.

| AC | Verified where | Note |
|---|---|---|
| AC-1 | e2e, `seats-table` and the row cells | Both a seat with an occupant and one without must be present in the rendered list |
| AC-2 | e2e through the assign dialog, and unit at the seam | *Without reloading* is the e2e half |
| AC-3 | **unit only** — `assignSeatOccupant` on an occupied seat | No control exists to reach it (1.5 rule 2). Assert `reason === "SEAT_OCCUPIED"` and that `occupantId` is unchanged |
| AC-4 | e2e, and unit | Assign one member to two seats. INV-02 is broken by a refusal appearing, so assert the second assign **succeeds** |
| AC-5 | e2e through the release control, and unit | |
| AC-6 | **unit at the seam**, plus e2e on `/devices` | Unit: `downgradedDeviceId` is the device's id and `listDevices()` shows `rank === "SECONDARY"`, `seatId` unchanged. E2e: `devices-row-<assetTag>-rank` reads `SECONDARY` after the release |
| AC-7 | **unit**, on a constructed two-device Given (6.1) | Both devices still on the seat, neither PRIMARY, neither deleted, neither owner changed |
| AC-8 | **unit only** — `releaseSeatOccupant` on a vacant seat | No control exists to reach it. Assert `reason === "SEAT_NOT_OCCUPIED"` and that **no device rank changed** |
| AC-9 | e2e, submit the assign dialog with the placeholder still selected | `seat-assign-occupant-error` appears; the seat's occupant cell still reads `no occupant` |
| AC-10 | e2e, the three-write sequence | Assign, release, assign a different member. Assert `seats-row-<code>-status` after each, and assert the surface offers no status control |
| AC-11 | **unit**, on the Given AC-7 leaves behind | Assign a different member to the released seat; assert no device became PRIMARY and no owner moved |

**AC-6's e2e half needs device selectors this surface does not own.** They are republished here so
QA never has to read `DEV-01`'s design, which is a different ticket's artifact
(RULE-16): `devices-page`, `devices-create-open`, `device-create-dialog`, `device-create-tag`,
`device-create-model`, `device-create-owner`, `device-create-submit`,
`devices-row-<assetTag>-assign`, `device-assign-dialog`, `device-assign-seat`,
`device-assign-submit`, `devices-row-<assetTag>-primary`, `devices-row-<assetTag>-rank`,
`devices-row-<assetTag>-seat`, `devices-row-<assetTag>-owner`,
`devices-row-<assetTag>-occupant`, `devices-row-<assetTag>-delete`, `device-delete-confirm`.
The device rows there are keyed by `assetTag`; keep every tag a single token in the seed's shape —
`AST-QA-<run>-<n>` — so a testid built from one is addressable.

**The `tests/e2e/smoke.spec.ts` edit, specified.** The current seat test reads:

```ts
await expect(page.getByTestId("seats-status-seat-a-01")).toHaveText("OCCUPIED");
await expect(page.getByTestId("seats-status-seat-a-03")).toHaveText("VACANT");
```

Both selectors move under the re-key, and both quote a seeded seat id that RULE-05 does not permit
that suite to hold. Replace with a fixture-blind assertion over the status cells — at least one reads
`OCCUPIED` and at least one reads `VACANT`, located by attribute prefix and suffix, in the shape
`tests/e2e/smoke.spec.ts:64-68` already uses for devices. That still asserts INV-03 — status is
derived and rendered, both values occur — and it no longer passes or fails on the identity of one
seeded seat. Combined with constraint 2 above, it survives `tests/e2e/seats.spec.ts` running against
the same server.

---

## 7. Rejected alternatives

### A — Put the INV-06 downgrade in `mock/devices.ts`, behind a new seam function

The shape: add `downgradePrimaryOnSeat(seatId): Promise<string | null>` to `mock/devices.ts` and
`prisma/devices.ts`, and have `releaseSeatOccupant` call it. Genuinely plausible: it keeps every
write to a `Device` row inside the device module, which is the cohesion rule most codebases would
apply without thinking about it, and it is what `ticket.yaml:14` anticipated when it said this ticket
writes `mock/devices.ts`.

**Rejected for three reasons, in the order they bind.**

1. **It puts an `await` between the demotion and the occupancy clear.** `releaseSeatOccupant` would
   have to await the devices module before writing `seat.occupantId = null`, or await it after — and
   either ordering makes an illegal intermediate state observable to any concurrent read: a seat with
   an occupant whose primary device has already been demoted, or a vacant seat still carrying a
   PRIMARY device owned by a person who no longer sits there. The second is INV-05 false. Under the
   mock there is no constraint to refuse it, so the only mechanism is that the state never exists,
   which requires both writes in one synchronous stretch. `mock/rooms.ts:52-56` states this same
   requirement for the room cascade, and `mock/devices.ts:145-149` states it for
   `designatePrimaryDevice`.
2. **It adds a seam export whose only caller is another seam module.** Parity would then require
   `prisma/devices.ts` to carry a `notWired` twin of a function no page, action or component ever
   calls — a public name on the seam that exists to serve a private need. The seam's exports are the
   contract components are allowed to use (RULE-02); widening it for an internal cascade makes the
   contract describe something other than what callers can do.
3. **The precedent already exists and points the other way.** `deleteRoom` writes `Device.seatId` and
   `Device.rank` directly from `mock/rooms.ts`, and its comment gives the rule: the cascade lives
   with the operation that causes it, because that operation is the only place that knows the cascade
   is happening. Two different answers to the same question in one layer is drift, and drift in
   `src/lib/data/` is what the seam exists to prevent.

The cost of the rejection is real and is stated rather than hidden: `mock/seats.ts` now writes a
device row, and a reader of `mock/devices.ts` alone cannot see every path that changes a device's
rank. Section 3 names the write for R8 for exactly that reason.

### B — Confirm the release in a dialog that names the device about to be downgraded

The shape: Release opens a confirmation, the way Delete does on rooms and devices, and the
confirmation names the primary device that INV-06 is about to demote — the seam answering the
question, as `countSeatsInRoom` answers INV-11's.

**This is the closest call in this document.** The argument for it is strong: releasing a seat has a
side effect on a *different entity* that this surface deliberately does not show (1.5 rule 4), so the
person clicking Release cannot see what their click is about to change. That is precisely the
condition ROO-01's delete confirmation exists to answer.

**Rejected on three grounds.**

1. **No criterion asks for it, and INV-11 is the reason ROO-01's exists.** `invariants.md` calls
   INV-11 the one invariant whose enforcement point is a UI affordance — the confirmation *is* the
   guard, because the delete destroys data. INV-06 is the opposite kind: it is a state change the
   system performs *for* the user to keep INV-05 true, it destroys nothing, and it is fully
   reversible from `/devices` with one click on *Make primary*. A confirmation would be asking
   consent for a correction.
2. **It requires either a device query on this surface or a new seam function.** Naming the device
   means reading it, and out-of-scope item 6 says no device is shown or chosen here. The honest
   version of this alternative is alternative D, which was also rejected.
3. **It adds a dialog, its state, and three testids to a ticket that is one path from the M ceiling.**

Recorded rather than dropped, because the underlying observation survives the rejection: this surface
performs a write a user cannot see. If that turns out to matter in use, the fix is a line in the
release control's label or a post-release message naming what was downgraded, and it is a new feature
row rather than a reinterpretation of AC-5.

### C — Scope the surface to one room, with a room chooser

`01-story.md` `Q-2` leaves this open and notes it *moves `size`*. `listSeats(roomId?)` already
supports it, so it is not speculative.

Rejected: twelve seats across two rooms do not need a chooser, and adding one puts a *within the
chosen room* clause on every criterion — AC-1's *every seat*, AC-2's and AC-11's *no other seat's
occupant changes*, AC-4's two seats which may be in different rooms — while answering no invariant.
It is also a second piece of client state on a surface whose only state is which dialog is open, and
which room is selected is exactly the kind of state that has to be preserved across
`router.refresh()` or the screen jumps after every write.

The room is carried as a **column** instead (F-2), so nothing is hidden. Room scoping is list
ergonomics, which is out-of-scope item 11 and needs its own feature row.

### D — Add a *Primary device* column to the seat table

The shape: one more column showing each seat's primary device, so AC-6's downgrade is observable on
the surface that causes it instead of on `/devices`.

It is the tidiest answer to AC-6's testability and it is rejected on scope, not on taste:
out-of-scope item 6 says in terms that **no device is shown, chosen, or edited by hand here**, and
the story's own warning is that *a seat occupancy surface that grows a make-this-primary control has
left this ticket*. A read-only column is one product conversation away from that control.

It also costs a third seam read on every page render for a column no criterion requires, and it makes
`/seats` a device surface in everything but name — at which point the boundary between `SEA` and
`DEV` is drawn by which file the code sits in rather than by what the screen is for.

AC-6 is verified at the seam and on `/devices` instead (6.2), which is stronger: the seam assertion
sees `downgradedDeviceId` directly, and the `/devices` assertion checks the state a person would
actually go looking for.

---

## Changelog

- `2026-08-24T02:10:53Z` — initial version, all seven sections. Raised by `tech-lead-design`. Amended
  by `tech-lead-design`. `consulted` is empty; no clarification was requested and none was needed to
  reach a verdict. `allowed_paths` enumerated with eleven entries and written back to `ticket.yaml`;
  `size` set to `M`, agreeing with the `ba`'s `size_estimate`. Six findings raised against
  `01-story.md`, none blocking: F-1 answers `Q-1`, F-2 answers `Q-2`, F-3 answers `Q-4` and
  recommends AC-6 stop naming `dev-01`, F-4 specifies a refusal that has no criterion, F-5 corrects
  `ticket.yaml`'s claim that this ticket writes `mock/devices.ts`, F-6 records that `/seats` already
  exists and that re-keying its rows moves a selector `tests/e2e/smoke.spec.ts` asserts on.
  `schema_delta` stays `none` and `requires_adr` stays `false`. `H-1` is untouched — it is a registry
  edit and a human's (RULE-01).
