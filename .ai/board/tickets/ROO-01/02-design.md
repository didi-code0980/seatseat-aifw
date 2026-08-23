---
ticket: ROO-01
stage: DESIGN
agent: tech-lead-design
produced_at: 2026-08-21T09:33:29Z
inputs_read: [ .ai/board/tickets/ROO-01/ticket.yaml, .ai/board/tickets/ROO-01/01-story.md, .ai/board/tickets/ROO-01/99-questions.md, .ai/board/tickets/ROO-01/03-impl-log.md, .ai/board/tickets/ROO-01/04-review.md, .ai/board/tickets/ROO-01/05-test-plan.md, .ai/board/tickets/ROO-01/06-test-report.md, .ai/registry/rules.md, .ai/registry/invariants.md, .ai/registry/features.md, .ai/standards/architecture.md, .ai/standards/data-model.md, .ai/standards/rbac-and-security.md, .ai/standards/coding-standards.md, .ai/standards/testing-standards.md, .ai/standards/session-model.md, .ai/01-operating-model.md, .ai/templates/tech-design.md, src/lib/data/types.ts, src/lib/data/index.ts, src/lib/data/fixtures.ts, src/lib/data/derive.ts, src/lib/data/mock/store.ts, src/lib/data/mock/rooms.ts, src/lib/data/mock/seats.ts, src/lib/data/mock/devices.ts, src/lib/data/mock/layout.ts, src/lib/data/mock/requests.ts, src/lib/data/prisma/rooms.ts, src/lib/data/prisma/client.ts, src/actions/rooms.ts, src/lib/validation/room.ts, src/lib/auth/permissions.ts, src/app/(app)/rooms/page.tsx, src/components/shared/DataTable.tsx, src/components/shared/EntityFormDialog.tsx, src/components/ui/Dialog.tsx, prisma/schema.prisma, node_modules/next/cache.d.ts ]
consulted:
  - with: ba
    asked: "Q1 — what does the create form collect, given code, gridWidth and gridHeight are required and non-nullable?"
    answer: "Resolution (a): the form carries all four fields. AC-2 and AC-3 amended, AC-13 added, out-of-scope item 2 split."
    resulted_in_amendment: true
  - with: ba
    asked: "Q2 — is the duplicate-code refusal an acceptance criterion?"
    answer: "Yes. AC-12, in the shape of AC-3, using the concrete code R-101."
    resulted_in_amendment: true
  - with: ba
    asked: "Q3 — is a non-Admin refused by a message or a redirect?"
    answer: "Withdrawn. AC-8 to AC-11 are cut to the AUT group; this surface enforces no guard."
    resulted_in_amendment: true
  - with: human
    asked: "Q4 — which sizing row governs a seam change, given the XL row catches every feature ticket?"
    answer: "The test is whether existing callers must change. Adding a function or a type is ordinary feature work. ROO-01 is M."
    resulted_in_amendment: false
  - with: qa
    asked: "Q10 — section 6 mandates a seam unit test for AC-14 but names no device-read entry point, and QA may not read src/**."
    answer: "Correct, and it is a section 6 omission. Section 6 now carries the seam surface QA may call — listRooms, deleteRoom, listDevices — with arguments and the return fields AC-14 asserts on."
    resulted_in_amendment: true
  - with: qa
    asked: "Q11 — tests/e2e/smoke.spec.ts is broken by section 6's row re-keying and is outside allowed_paths, so no agent on this ticket can repair it."
    answer: "Resolution (a). smoke.spec.ts is added to allowed_paths. The re-keying stands; the file that predates it is repaired by the ticket that broke it."
    resulted_in_amendment: true
chat_before_verdict: "ba — Q1, Q2 and Q3 in 99-questions.md, all answered and amended into 01-story.md before version 2 was raised. Version 3 reflects no chat: the R8 finding reached this stage as 04-review.md, which is a file, and the reviewer's session was discarded after it. `none` is not truthful here and is not required of a design; it is the attestation RULE-12 puts on 04-review.md and 06-test-report.md."
gate: PASS
blocking_reason: ""
next_state: QA
---

# ROO-01 — Room CRUD UI — technical design

Fourth version. Version 1 (`2026-08-12T07:54:08Z`) was BLOCKED on three findings, all since resolved.
Version 2 passed and was implemented; REVIEW failed on **R8 / INV-11**, and the defect was caused by a
decision in section 3 of this document. Version 3 reversed it, and REVIEW passed on the second pass
(`2026-08-21T04:18:29Z`). **Version 4 answers Q10 and Q11 from `06-test-report.md`** — both raised by
`qa`, both design-side omissions, and neither requiring a line of `src/**` to change. Section 0.4 is
the whole of it.

This version is complete: seven sections, `allowed_paths` enumerated and written back to
`ticket.yaml`, `size` set — and the size verdict moves to `L`, which section 5 explains and does not
act on.

Q6, Q7, Q8 and Q9 have all been answered by `ba` and are amended into `01-story.md`. Nothing in this
document is waiting on an answer.

## 0. What changed, and what is still open

### 0.1 What the resolutions changed in this design

| Resolution | Effect here |
|---|---|
| B1 cut — AC-8 to AC-11 withdrawn, no role guard | Section 2 is now a statement that no gate is enforced, with the intended model recorded for the AUT ticket. No auth file is in `allowed_paths`. |
| B2 resolved (a) — the form carries all four fields | Section 1's `createRoomSchema` is the four-field shape already in `src/lib/validation/room.ts`, no longer contingent. Section 6 gains the code and grid inputs and their error elements. |
| B3 resolved — AC-12 | Duplicate-code refusal lives in the seam, not the action. Section 1.2 and section 7. |
| INV-11 issued — a room delete destroys its seats | The **inversion of AC-6**, and the largest change. Version 1 refused to delete a populated room; the seam now cascades, and the cascade reaches devices through INV-06 and INV-07 (AC-14). This is what pulls `mock/seats.ts`, `mock/devices.ts` and a new `mock/store.ts` into `allowed_paths`. |
| Q4 answered — XL means existing callers must change | Size is `M`, by the human's rule and by file count. Section 5. |

### 0.2 Q6 and Q7 — open with `ba`, not blocking `/implement`

**Q6 — deleting a room destroys its network ports, and no criterion says so.** Raised by the
operator in `ticket.yaml` and passed to `ba`. `prisma/schema.prisma` declares `NetworkPort` to `Seat`
`onDelete: Cascade`, and in the DTO a port is a field *of* a seat (`Seat.ports`), so a destroyed seat
takes its ports with it and there is no shape in which it does not. Out-of-scope item 7 sends ports
to `SEA` without noting that this ticket destroys them.

**Q7 — AC-6 requires a room containing exactly three seats, and no such room exists.**
`src/lib/data/fixtures.ts` builds two rooms of six seats each — `seatRow(...)` twice per room, three
seats each time. AC-6's Given is "a room exists that contains exactly three seats" and its assertion
is "that number is three". Neither fixture room satisfies it, and this ticket creates no seats
(out-of-scope item 1), so QA cannot construct the setup. QA also cannot discover the real number for
itself: RULE-05 keeps it out of `src/**`, and `fixtures.ts` is `src/**`.

Both are answerable by amending `01-story.md` and neither changes a signature, a file, or a
selector in this document:

- Q6 resolves to an extra criterion asserting the ports are gone, or a line in out-of-scope item 7
  saying the loss is intended. Either way the implementation is identical — the ports are inside the
  seat rows being deleted — so the answer adds a test, not code. Ports appear on no surface here, so
  it adds no `data-testid` either.
- Q7 resolves to a number. Section 6 gives QA `room-delete-seat-count`, so the assertion is already
  addressable; what is missing is which room to run it against and what the count is.

They are therefore safe to carry into IN_PROGRESS and unsafe to carry into QA. A third item travels
with them: out-of-scope item 3 of `01-story.md` still says this ticket carries a pending
`schema_delta` and `requires_adr: true`, and both were returned to `none` and `false`. One RULE-14
pass covers all three, which is the shape the operator asked for.

### 0.3 The R8 failure, and the decision of this version's that caused it

`04-review.md` fails R8 on INV-11: after `deleteRoom`, `mock/layout.ts` still returns the deleted
room with all six of its deleted seats, because it reads `../fixtures` while the delete writes
`mock/store.ts`. The reviewer is right, the Developer found it first and correctly declined to fix it
outside `allowed_paths`, and **the defect is this document's.** Version 2 section 3 introduced
`mock/store.ts` as a *clone* of the fixture arrays and enumerated three modules to repoint. There is a
fourth. Nothing catches the omission — not the parity test, not lint, not the type system — so the
control was a reviewer noticing, and the only reason it worked is that the reviewer did.

**What is not decided here.** `04-review.md` puts two things to a human: whether a stale layout of a
deleted room is INV-11 being false, and what the fix is. The first is a reading of an invariant and
`.ai/registry/invariants.md` is human-only; this version does not take it. It does not need to. The
amendment below makes the deleted room unreachable through **every** seam read path, so INV-11 holds
under either reading and the question stops being load-bearing for this ticket. If the operator's
intent in re-running `/design` was the opposite — accept the divergence and carry it to `LAY` — then
this amendment should be reverted rather than reinterpreted, and that is a one-line instruction.

**The fix: `store.ts` aliases the seed arrays instead of cloning them.** Three lines in one file,
already in `allowed_paths`. No file is added, `layout.ts` and `requests.ts` are not touched, and the
size verdict does not move.

Version 2's section 7 rejected exactly this, in favour of the clone, on the grounds that the seed and
the live state should be different objects. **That rejection was wrong**, and the R8 failure is what
it cost. Section 7 now carries the reversal and the reasoning; section 3 carries the mechanism.

Both candidate fixes were executed against a copy of `src/lib/data/` before this version was raised,
not reasoned about. Deleting `room-a`, which holds six seats and three seated devices:

| | `layout.getRoomLayout("room-a")` | `layout.listRoomLayouts()` | files changed |
|---|---|---|---|
| as implemented | room `room-a` with 6 seats | `room-a,room-b` | — |
| **A** — repoint `layout.ts` at the cloning store | `null` | `room-b` | +1, and +1 more for `requests.ts` |
| **B** — `store.ts` aliases the seed, `layout.ts` untouched | `null` | `room-b` | 0 |

Both hold INV-11. B is adopted. Section 7 says why, and it is not primarily the file count.

**One thing neither fix changes, now Q8.** `req-01` names `seat-a-03` and `room-a`; after the delete
it still does, under A and under B alike, because nothing writes the requests array. Repointing
`requests.ts` at the store — which `04-review.md` offers as the second half of fix A — would change
no behaviour at all, and the executed run above confirms it. The real question is whether the cascade
should null `seatId` on requests pointing at destroyed seats, which is what
`prisma/schema.prisma`'s `SeatRequest.seat ... onDelete: SetNull` would do in a real database. That
is cascade semantics with no acceptance criterion behind it, so it goes to `ba` as Q8 rather than
being invented here — the same reasoning that kept `SEAT_COUNT_CHANGED` out of section 1 in version 2.
It blocks neither gate: no criterion, no surface, and no invariant reaches it.

### 0.4 Q10 and Q11 — the QA gate's two design-side findings

`06-test-report.md` fails the QA gate and routes two of its three causes here. Both are omissions in
this document and neither is a defect in the code: `pnpm test` is green, `pnpm test:e2e` is 22 of 24,
and the two failures are an unwritable test and a test nobody on this ticket could edit.

**Q10 — section 6 told QA to write a seam test without naming the seam.** Version 3 closed section 6
with "call `deleteRoom` and assert the device still exists", which names one function and needs two.
QA cannot supply the second: RULE-05 keeps it out of `src/**`, and `CLAUDE.md` forbids inventing a
name. So AC-14 was not written at all — correctly, since a stub or a skipped test would read as
coverage that does not exist. **Section 6.1 is new and answers it**: the three seam calls QA may make,
their arguments, and the return fields AC-14 asserts on. A seam entry point reaches QA exactly the way
a `data-testid` does, and for the same reason — this document is the only channel.

**Q11 — section 6's row re-keying broke a test that section 5 put out of reach.** Re-keying rows from
id to `code` was right and QA does not dispute it. What was wrong is that `tests/e2e/smoke.spec.ts:40-41`
addresses the seeded rows by id, and no agent on this ticket could repair it, because `allowed_paths`
listed two files under `tests/` and not that one. **The file is added** (section 5). A design that
breaks a file must put that file in reach of the ticket that broke it; the alternative leaves the
repair with no owner, which is the state QA reported.

Neither answer changes a signature, a schema, a permission, or a `data-testid`. **No `src/**` file
changes, so this amendment does not return the ticket to the Developer** — the work it unblocks is
QA's, in QA's own files. The next command is `/qa`, not `/implement`.

**The third cause is not mine and is already resolved.** AC-6's unsatisfiable Given was Q7, and `ba`
answered it while this amendment was being written, along with Q9's naming of AC-14's device. Both are
in `01-story.md`. The re-run has all three answers available to it.

---

## 1. Contract

Copy-pasteable and complete. Nothing here is contingent.

### 1.1 Seam DTOs — `src/lib/data/types.ts` (additive only)

`Room`, `Seat`, `Device` and `NetworkPort` are unchanged. Four types are added.

```ts
/** Input to createRoom. Every field the model requires; the id is minted by the seam. */
export type NewRoom = Omit<Room, "id">;

/** Input to updateRoom. Only the name is editable in this ticket (AC-4). */
export interface RoomPatch {
  name: string;
}

/**
 * INV-11 wording: code uniqueness is a fact about stored data, so the refusal belongs to the seam
 * and not to the action that calls it. A caller has to narrow this before it can claim success.
 */
export type CreateRoomOutcome =
  | { created: true; room: Room }
  | { created: false; reason: "DUPLICATE_CODE" };

/**
 * INV-11: the delete is destructive and cascades. The counts are returned rather than inferred so
 * that AC-6 and AC-14 are assertable at the seam, where the cascade actually happens.
 *
 * seatsDeleted    — seats destroyed with the room, and with them their ports and occupancy rows
 * devicesDetached — devices that sat on those seats, now seatId: null and rank: "SECONDARY"
 */
export type DeleteRoomOutcome =
  | { deleted: true; seatsDeleted: number; devicesDetached: number }
  | { deleted: false; reason: "NOT_FOUND" };
```

### 1.2 Seam functions — identical names and arity in both `src/lib/data/` implementations

```ts
// unchanged
export async function listRooms(): Promise<Room[]>;
export async function getRoom(id: string): Promise<Room | null>;

// new
export async function countSeatsInRoom(roomId: string): Promise<number>;
export async function createRoom(input: NewRoom): Promise<CreateRoomOutcome>;
export async function updateRoom(id: string, patch: RoomPatch): Promise<Room | null>;
export async function deleteRoom(id: string): Promise<DeleteRoomOutcome>;
```

`tests/unit/seam-parity.test.ts` asserts identical exported key sets and equal arity, so all four
appear in `src/lib/data/prisma/rooms.ts` too, each returning `notWired("...")` exactly as `listRooms`
does today. No database is wired and none is needed: `DATA_SOURCE` defaults to `mock`.

Three rules the implementations must both obey, stated here because they are the contract and not an
implementation detail:

1. **`createRoom` refuses a duplicate `code`** and returns `{ created: false, reason: "DUPLICATE_CODE" }`.
   It does not throw. `Room.code` is `@unique`, so this is the seam agreeing with the model rather
   than adding a rule of its own (AC-12).
2. **`createRoom` mints the id** with `crypto.randomUUID()`. The Prisma model uses `@default(cuid())`;
   the mock cannot, and a caller-supplied id would let the UI invent a primary key. No id is ever
   read from a form.
3. **`deleteRoom` performs the whole cascade or none of it** — the room, its seats, those seats' ports
   and occupancy, and the device detachment, in one function with no intermediate await on anything
   outside the seam. A partial cascade is what INV-01 and INV-04 would actually catch (section 3.1).

### 1.3 Zod schemas — `src/lib/validation/room.ts`

`roomCodeSchema` and `createRoomSchema` already exist in this file with exactly the shape Q1
resolution (a) requires. `createRoomSchema` is therefore **unchanged**. Three additions:

```ts
// existing, unchanged:
//   roomCodeSchema   = z.string().trim().min(1).max(32).regex(/^[A-Z0-9-]+$/, "...")
//   createRoomSchema = z.object({ name, code, gridWidth, gridHeight })

export const roomNameSchema = z.string().trim().min(1).max(120);
export const roomIdSchema = z.string().trim().min(1);

export const updateRoomSchema = z.object({
  id: roomIdSchema,
  name: roomNameSchema,
});

export const deleteRoomSchema = z.object({
  id: roomIdSchema,
});

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type DeleteRoomInput = z.infer<typeof deleteRoomSchema>;
```

`createRoomSchema`'s inline name rule is replaced by `roomNameSchema` so the create and rename paths
cannot drift; the resulting shape is identical.

Two behaviours AC-3 and AC-13 depend on, and neither is incidental:

- `.trim()` runs before `.min(1)`, so `"   "` fails rather than passing as three characters (AC-3).
- `gridWidth` and `gridHeight` are `z.number().int().min(1).max(200)`. `.int()` rejects `2.5` and
  `.min(1)` rejects `0` and `-4`, which is AC-13 exactly. A number input yields a string, so the
  client coerces with `Number(value)` and lets `z.number()` reject `NaN` — `z.coerce.number()` is
  **not** used, because it turns `""` into `0`, and `0` is a value AC-13 requires to be refused.
  That is the trap in this schema and it is the reason this paragraph exists.

### 1.4 Server actions — `src/actions/rooms.ts`

`getRooms` exists and is unchanged.

```ts
export type RoomFieldName = "name" | "code" | "gridWidth" | "gridHeight";

export type RoomActionError =
  | { kind: "VALIDATION"; fields: Partial<Record<RoomFieldName, string>> }
  | { kind: "DUPLICATE_CODE"; fields: { code: string } }
  | { kind: "NOT_FOUND"; message: string };

export type RoomActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: RoomActionError };

export async function getRooms(): Promise<Room[]>;                                   // exists
export async function createRoom(input: unknown): Promise<RoomActionResult<Room>>;
export async function renameRoom(input: unknown): Promise<RoomActionResult<Room>>;
export async function deleteRoom(
  input: unknown
): Promise<RoomActionResult<{ id: string; seatsDeleted: number; devicesDetached: number }>>;
```

`VALIDATION.fields` is a map rather than a single field because AC-3 requires "a validation message
against **each** offending field", and a one-field error cannot express two blank inputs.

Each parameter is `unknown` and is narrowed by its Zod schema inside the action. A server action is a
network boundary; typing the parameter as `CreateRoomInput` claims a guarantee the caller never had
to honour.

Body of every write action, in the order fixed by `coding-standards.md` and `architecture.md`:

1. `"use server"`
2. Parse with the schema named above. On failure map `error.issues` to `fields` and return
   `{ ok: false, error: { kind: "VALIDATION", fields } }` — never the raw `ZodError`.
3. **Permission check — none in this ticket.** Section 2. The step is not skipped silently: the
   Developer writes the comment section 2 specifies, at the line where the check belongs.
4. Call the seam. Map `{ created: false, reason: "DUPLICATE_CODE" }` to the `DUPLICATE_CODE` error and
   a `null` from `updateRoom` or `{ deleted: false }` to `NOT_FOUND`.
5. `revalidatePath("/rooms")`, then return the typed result.

`revalidatePath` is imported from `next/cache` and is `(originalPath: string, type?: "layout" | "page")`
— verified against `node_modules/next/cache.d.ts` and
`node_modules/next/dist/server/web/spec-extension/revalidate.d.ts` in the installed Next 16.3.0, not
recalled. It is what makes AC-2's "without my having to reload the page" a server round trip rather
than a second copy of the list in client state.

### 1.5 UI components

```ts
// src/app/(app)/rooms/page.tsx — server component, default export (framework requirement)
export default async function RoomsPage(): Promise<JSX.Element>;

// src/app/(app)/rooms/rooms-manager.tsx — client component
export interface RoomRow {
  room: Room;
  /** Seats that a delete would destroy. Read at render; see section 7 on staleness. */
  seatCount: number;
}

export function RoomsManager({ rows }: { rows: RoomRow[] }): JSX.Element;
```

The page reads through the seam directly — `@/lib/data` is what a page may import — and builds
`RoomRow[]` from `listRooms()` plus `countSeatsInRoom(room.id)` per room. It renders
`<RoomsManager rows={rows} />` and holds no state.

`RoomsManager` owns three dialogs (create, rename, delete-confirm), the pending flag, and the last
action error. It calls the actions and then `router.refresh()`. It keeps no copy of the room list:
the list is a prop, and a client-side copy is a second source of truth for data the server already
re-sends.

---

## 2. Permission model

**No permission gate is enforced by this ticket, on any operation, and that is a specified state
rather than an omission.** `01-story.md`'s Permissions section and out-of-scope item 5 record the
decision; finding B1 in version 1 of this document records why. There is no session to read a role
from: Better Auth is configured with no database adapter, the login page cannot produce a session,
and there is no `getSession` helper anywhere in `src/**`.

| Operation | Gate in this ticket | Gate intended, for the AUT ticket |
|---|---|---|
| Reach `/rooms` | none | `ADMIN` |
| List rooms | none | `ADMIN` |
| `createRoom` | none | `ADMIN`, in the server action |
| `renameRoom` | none | `ADMIN`, in the server action |
| `deleteRoom` | none | `ADMIN`, in the server action |
| Create / edit / delete controls | rendered unconditionally | `PermissionGate required="ADMIN"`, as an affordance only |

Consequences the Developer must implement exactly, because "no gate" is easy to implement in two
different ways and only one of them is this one:

- **`PermissionGate` is not used on this surface.** Wrapping a control in a gate fed a hard-coded
  `"ADMIN"` would render a surface that looks guarded and is not, which is worse than one plainly
  ungated. No import of `PermissionGate` appears in `allowed_paths`' files.
- **`canManageRooms` is not called.** It exists in `src/lib/auth/permissions.ts` and stays untouched;
  calling it against a fabricated role is the stubbed session the story explicitly refuses.
- **Step 3 of each action carries a comment naming what is absent** — the rank check, out-of-scope
  item 5, and the AUT group — at the line where the check will go. An absent check that looks
  deliberate is reviewable; an absent check that looks forgotten gets "fixed" by whoever reads it
  next, with an invented role.

Review check R6 reads this table. The correct R6 finding on this ticket is that no gate exists and
that the table says so.

---

## 3. Seam impact

Six files change, all inside `src/lib/data/`.

| File | Change |
|---|---|
| `src/lib/data/types.ts` | Adds `NewRoom`, `RoomPatch`, `CreateRoomOutcome`, `DeleteRoomOutcome`. No existing type is modified. |
| `src/lib/data/mock/store.ts` | **New.** Names the mutable `rooms`, `seats` and `devices` arrays. It **re-exports the `fixtures.ts` arrays themselves — same object identity, no clone.** |
| `src/lib/data/mock/rooms.ts` | Reads from the store; adds `countSeatsInRoom`, `createRoom`, `updateRoom`, `deleteRoom`. |
| `src/lib/data/mock/seats.ts` | Reads from the store instead of from `fixtures.ts`. **No signature changes.** |
| `src/lib/data/mock/devices.ts` | Reads from the store instead of from `fixtures.ts`. **No signature changes.** |
| `src/lib/data/prisma/rooms.ts` | Adds the same four names with the same arity, each returning `notWired(...)`. |

`src/lib/data/fixtures.ts` is **not** edited and is not in `allowed_paths`. Its source text is the
seed and stays the seed; what the alias changes is which array object the mock writes to at runtime,
not a line in that file.

**What the store is, and what it is not.** It is the *name* for where mock writes go — three exported
bindings that `mock/rooms.ts` splices and assigns through. It is **not** a second copy of the data.
`export const rooms: Room[] = seedRooms` re-exports the fixture array itself, and the same for
`seats` and `devices`.

That single word — alias, not clone — is the whole of the R8 fix, so the reasoning is worth stating
where the Developer will read it:

- **There is exactly one array per collection in the process.** Every mock module that imports
  `rooms`, `seats` or `devices`, from `./store` or from `../fixtures`, holds the same object. A module
  cannot be *forgotten* during a repoint, because there is nothing to repoint. `mock/layout.ts` reads
  `../fixtures` and observes the cascade; that is not an oversight left standing, it is the property
  that makes the seam unable to disagree with itself.
- **A clone bought nothing it was supposed to buy.** Version 2 justified it as keeping the seed
  pristine. `prisma/seed.ts` runs in a separate process (`pnpm db:seed`), so a runtime mutation never
  reaches it; and it bought no test isolation either, because the clone is just as process-global and
  just as un-reset as the arrays it copied. What it did buy was a second source of truth, which is
  what R8 caught.
- **`deleteRoom` already mutates in place** — `splice`, `push`, field assignment
  (`src/lib/data/mock/rooms.ts:35,76-77,88,93`), and its own comment at `:82-83` says it does so
  because "every other mock module holds that same object". Under the clone that sentence was true of
  three modules out of four. Under the alias it is true of all of them.

Still true and still worth knowing: this state is process-global and **does not reset between
tests**. That is a property of any in-memory mock, it was equally true of the clone, and it is written
here so QA orders destructive specs deliberately rather than discovering the ordering from a failure.
No reset hook is exported — a test-only export on the seam is a second interface with no parity
coverage, and `tests/unit/seam-parity.test.ts` would have to learn to ignore it.

**One consumer of `fixtures.ts` does not track the cascade, and it is safe.** `fixtures.ts:73` builds
`ports` with `seats.flatMap((s) => s.ports)` — a new array computed once at module load, not a view.
It therefore still holds the port objects of destroyed seats after a delete. Nothing in the seam reads
it: `prisma/seed.ts:21` is its only consumer and runs in another process. It is named here because it
is the next instance of the class R8 caught, and the cheapest moment to say "do not read `ports` from
a mock module" is before someone does.

### 3.1 Invariant mechanisms

`.ai/registry/invariants.md` requires a design to state, per ID in `invariants_touched`, which
mechanism holds it. A UI affordance alone is never sufficient, and none of the rows below relies on
one.

| ID | Mechanism, in this ticket |
|---|---|
| **INV-11** | `deleteRoom` in the seam performs the cascade; the confirmation dialog obtains explicit consent and names the count. The **count comes from `countSeatsInRoom`**, not from anything the client computes, so the number shown is the seam's own answer. The dialog is the invariant's guard and the guard is a UI element — which is why `deleteRoom` also *returns* `seatsDeleted`, giving the test a non-UI place to assert the cascade actually happened. **The destruction must hold on every seam read path, not only the ones this ticket calls** — that is the half R8 failed, and it is now held by there being one array per collection rather than by a list of modules someone has to keep complete (section 3). Verified by execution: after `deleteRoom("room-a")`, `layout.getRoomLayout("room-a")` is `null` and `layout.listRoomLayouts()` returns `room-b` alone. |
| **INV-01** | Occupancy is `Seat.occupantId`, a field of the row being deleted, so it cannot survive its seat. The mechanism is that the seat and its occupancy are one object in the store: a partial cascade is not expressible. The `Member` rows are untouched — deleting a seat destroys an occupancy, not a person. |
| **INV-04, INV-05** | Both constrain a *primary device on a seat*. After the cascade no device references a destroyed seat, so neither has a row left to be false about. The failure they would catch is the one this design refuses: a device left pointing at a deleted seat and still `PRIMARY`. `deleteRoom` detaches before it deletes, so that state is never written. |
| **INV-06** | The detachment sets `rank: "SECONDARY"` on every device that sat on a destroyed seat. Deleting a seat is the most complete occupant exit there is, and INV-06 is the write path that must exist for it — a constraint would only refuse, and there is nothing here to refuse. |
| **INV-07** | The detached devices are set to `seatId: null` and left in the store. INV-07 is what makes that a legal resting state rather than a leak, and AC-14 asserts it. No device is deleted by any path in this ticket. |
| **INV-10** | Held by `createRoomSchema`: `gridWidth` and `gridHeight` are `.int().min(1)`, so no room is created with a grid in which a placement is undefined. This ticket places no seat and cannot itself produce an overlap; what it can do is hand `LAY` an unusable coordinate space, and AC-13 is what stops that. |

Two of these are held by *the shape of the data* rather than by a check, and that is worth saying
plainly rather than dressing up as enforcement: INV-01 holds because occupancy is a field of the seat,
and INV-04/INV-05 hold because their subject stops existing. Where a real write was required —
INV-06's downgrade, INV-07's resting state — there is a real write, in the seam, on the same code
path as the delete.

---

## 4. Schema delta

**`none`.**

No model changes, no migration, no ADR. The design is written entirely against
`prisma/schema.prisma` as it stands, and the two schema decisions named in version 1 of this document
both fell away: decision 1 (Better Auth versus `Member`) existed only to make AC-8 to AC-11
checkable, and those criteria are withdrawn; decision 2 (defaults for `code` and the grid) was
contingent on Q1 resolving to (b), and it resolved to (a).

The cascade needs no migration either. The draft schema already declares what INV-11 and AC-14 now
want:

| Line | Declares | Wanted by |
|---|---|---|
| `Seat.room ... onDelete: Cascade` | deleting a room deletes its seats | INV-11, AC-6 |
| `NetworkPort.seat ... onDelete: Cascade` | deleting a seat deletes its ports | Q6 — the consequence with no criterion |
| `Device.seat ... onDelete: SetNull` | a device outlives its seat, unassigned | INV-07, AC-14 |

`Device.rank` is the one part the database does not do on its own: `SetNull` clears `seatId` and
leaves `rank` as it was, so a formerly-primary device would remain `PRIMARY` with no seat. INV-06
requires the downgrade and the seam performs it. When the Prisma implementation is eventually wired,
that downgrade must be written explicitly in the same transaction as the delete — it is not a
cascade, and the schema will not do it. This paragraph is the note to whoever wires it.

Version 1 set `schema_delta` to a pending decision and `requires_adr: true`. A human returned both to
`none` and `false`, and this design confirms that is correct.

---

## 5. allowed_paths

Written back into `ticket.yaml` verbatim.

```yaml
allowed_paths:
  - "src/app/(app)/rooms/page.tsx"
  - "src/app/(app)/rooms/rooms-manager.tsx"
  - "src/actions/rooms.ts"
  - "src/lib/validation/room.ts"
  - "src/lib/data/types.ts"
  - "src/lib/data/mock/store.ts"
  - "src/lib/data/mock/rooms.ts"
  - "src/lib/data/mock/seats.ts"
  - "src/lib/data/mock/devices.ts"
  - "src/lib/data/prisma/rooms.ts"
  - "tests/unit/rooms.test.ts"
  - "tests/e2e/rooms.spec.ts"
  - "tests/e2e/smoke.spec.ts"
  - ".ai/board/tickets/ROO-01/**"
```

Every entry is a file path. `src/app/(app)/rooms/**` would have been shorter and would have left
check R1 unable to tell this ticket's diff from any other change under that route.

**Version 4 adds one file: `tests/e2e/smoke.spec.ts`.** Answering Q11. Section 6 re-keyed the row
selectors from room id to room `code`, which broke two assertions in a Phase B smoke test at
`tests/e2e/smoke.spec.ts:40-41` — `rooms-row-room-a` no longer resolves, and the seeded rows are
`rooms-row-ROOM-A` and `rooms-row-ROOM-B`. `pnpm test:e2e` exits 1 on it, which the QA gate cannot
pass.

The re-keying stands: ids are minted with `crypto.randomUUID()` and a test cannot address a room it
just created, which is the reason section 6 gives and QA agrees with. What was wrong is the path
list. **A design that breaks a file must put that file in reach of the ticket that broke it** —
otherwise the repair has no owner, which is exactly the state QA found. Two selector strings change;
no behaviour does. QA repairs them, because `tests/**` is QA's and the file is a test.

Resolution (b) — leave it broken for a human to fix outside the ticket's path budget — was declined.
It converts a two-line consequence of this design into a manual step off the board, and the ticket
that caused it is the cheapest place to absorb it.

**Otherwise unchanged since version 3.** The R8 fix is three lines inside `src/lib/data/mock/store.ts`,
which is already on this list. `src/lib/data/mock/layout.ts` and `src/lib/data/mock/requests.ts` are
deliberately **not** added, and that is the substance of the amendment rather than an omission in it:

- `layout.ts` needs no edit once the store aliases instead of clones — it reads the same array the
  cascade writes. Adding it would fix the one module that has diverged so far and leave the next one
  to be found by the next reviewer.
- `requests.ts` would be edited to no effect. Nothing writes the requests array, so repointing it
  changes no behaviour; executed and confirmed in section 0.3. The real question there is Q8.
- Either addition would also take the file count past twelve. Version 3 listed that last, as a
  symptom rather than a reason. Version 4 hits it for real with `smoke.spec.ts` and pays it — see the
  size verdict below.

Six files a reader might expect, and why each is absent:

- **`src/lib/data/fixtures.ts`** — section 3. The store aliases its arrays; no line in it changes.
- **`src/lib/data/mock/layout.ts`, `src/lib/data/mock/requests.ts`** — immediately above.
- **`src/lib/auth/**`** — the guard is out-of-scope item 5, and section 2 requires that nothing here
  imports `PermissionGate` or calls `canManageRooms`.
- **`src/components/shared/**`** — `DataTable` and `EntityFormDialog` are used as they are.
  `DataTable`'s `rowKey` is a prop, so keying rows by `code` (section 6) needs no change to it, and
  `EntityFormDialog` already emits the `-dialog`, `-submit` and `-cancel` testids section 6 names.
- **`tests/unit/seam-parity.test.ts`** — it must keep passing unchanged, which is exactly why it is
  not editable. A parity test the ticket may edit is a parity test the ticket can silence.

`tests/unit/rooms.test.ts` and `tests/e2e/rooms.spec.ts` are two named files, not `tests/**`. If QA
needs a third file it asks — the `qa` to `tech-lead-design` edge is open and budgeted — and the answer
is an amendment to this section, which is cheaper than a glob that makes R1 meaningless for the whole
test tree.

**Size verdict: `L`.** Thirteen files plus the ticket folder, against the sizing table's "L — more
than 12". Version 2 and version 3 both counted twelve and read `M`; adding `tests/e2e/smoke.spec.ts`
crosses the line, and the honest figure is recorded rather than the convenient one.

Not XL: the operator's Q4 rule is whether existing callers must change, and none do. `types.ts` gains
four types and alters none; `mock/seats.ts` and `mock/devices.ts` change which module they read from
while their exported signatures stay identical; every seam addition is a new name. Nothing outside
`allowed_paths` has to follow.

**The ticket is not split, and that is a judgement this stage is making rather than a rule it is
applying.** The reasoning, so a reviewer can disagree with it:

- The Sizing table's `L` row says "must split at **DESIGN**", and the model's own gloss is about a
  story that "designs out to L", which "means the story was under-specified" and routes back to SPEC.
  Neither describes this. The story is not under-specified — `ba` has answered Q1, Q2, Q3, Q6, Q7, Q8
  and Q9, and `size_estimate` was re-checked at `M` after the largest of those amendments. The
  thirteenth file is a two-line repair to a Phase B test, carrying no acceptance criterion and no
  behaviour.
- Splitting is a pre-implementation instrument. This ticket is implemented, has a REVIEW `PASS`
  (`2026-08-21T04:18:29Z`), and has 22 of 24 e2e tests green. Carving it in two here would discard a
  passing gate to satisfy a count, and the split axes the model offers — by operation, then surface,
  then role — do not describe a boundary that exists in the remaining work.
- The alternative that keeps the count at twelve is resolution (b): leave `smoke.spec.ts` broken and
  have a human repair it off the board. That trades an honest `L` for a hidden manual step, which is
  the worse of the two.

**This is the second time the Sizing table has pushed toward the wrong answer on this ticket**, and
the two instances are the same shape: it counts a design's total file surface with no notion of an
*amendment* to a design whose implementation already exists, so a one- or two-line repair is weighed
as though it were new scope. Version 3 escaped it by finding a better fix; version 4 cannot, and pays
the `L` instead. That is model debt and it belongs to the steward, not to this ticket — recorded here
because this is where the evidence is, and deliberately not acted on, because
`.ai/01-operating-model.md` is human-owned.

The three files that first pushed this ticket to the `M` boundary — `store.ts`, `seats.ts`,
`devices.ts` — arrived with INV-11. The ticket was `S`-shaped when a room delete refused, and
inverting AC-6 into a destructive cascade is what grew it.

---

## 6. Testability contract

Every selector QA may use. RULE-05 makes this the only channel: a control absent from this table does
not exist as far as QA is concerned, and check R7 verifies each one appears in the markup.

**Rows are keyed by room `code`, not by room id.** Ids are minted with `crypto.randomUUID()` and are
unpredictable, so a testid built from one is unaddressable for a room the test just created. `code` is
`@unique`, it matches `^[A-Z0-9-]+$`, and it is a value the test supplies — AC-2 and AC-12 already
name `R-101`. `DataTable`'s `rowKey` prop is set to `(r) => r.room.code`.

Two prefixes come from shared components and are reused rather than redefined: `DataTable` emits
`${prefix}-table`, `${prefix}-row-${key}` and `${prefix}-empty`; `EntityFormDialog` emits
`${prefix}-dialog`, `${prefix}-cancel` and `${prefix}-submit`.

| data-testid | Element | Used by |
|---|---|---|
| `rooms-page` | The room management screen's root section | AC-1 |
| `rooms-table` | The room list table | AC-1, AC-2, AC-3, AC-4, AC-12, AC-13 |
| `rooms-empty` | Empty-state message shown when no room exists | AC-1 |
| `rooms-row-<code>` | One row per room, keyed by the room's code | AC-1, AC-2, AC-4, AC-5, AC-6, AC-7 |
| `rooms-row-<code>-name` | The name cell in a row | AC-1, AC-2, AC-4 |
| `rooms-row-<code>-code` | The code cell in a row | AC-4, AC-12 |
| `rooms-row-<code>-grid` | The grid cell in a row, rendered `<width> x <height>` | AC-2, AC-4, AC-13 |
| `rooms-row-<code>-edit` | Edit control on a row | AC-4 |
| `rooms-row-<code>-delete` | Delete control on a row | AC-5, AC-6, AC-7 |
| `rooms-create-open` | Control that opens the create dialog | AC-1, AC-2 |
| `room-create-dialog` | The create dialog | AC-2, AC-3, AC-12, AC-13 |
| `room-create-name` | Name input | AC-2, AC-3 |
| `room-create-name-error` | Validation message against the name | AC-3 |
| `room-create-code` | Code input | AC-2, AC-3, AC-12 |
| `room-create-code-error` | Validation message against the code, including "already in use" | AC-3, AC-12 |
| `room-create-grid-width` | Grid width input | AC-2, AC-3, AC-13 |
| `room-create-grid-width-error` | Validation message against the grid width | AC-3, AC-13 |
| `room-create-grid-height` | Grid height input | AC-2, AC-3, AC-13 |
| `room-create-grid-height-error` | Validation message against the grid height | AC-3, AC-13 |
| `room-create-submit` | Submit control in the create dialog | AC-2, AC-3, AC-12, AC-13 |
| `room-create-cancel` | Cancel control in the create dialog | AC-3 |
| `room-edit-dialog` | The rename dialog | AC-4 |
| `room-edit-name` | Name input in the rename dialog | AC-4 |
| `room-edit-name-error` | Validation message against the name | AC-4 |
| `room-edit-submit` | Submit control in the rename dialog | AC-4 |
| `room-edit-cancel` | Cancel control in the rename dialog | AC-4 |
| `room-delete-dialog` | The delete confirmation dialog | AC-5, AC-6, AC-7, AC-14 |
| `room-delete-message` | The confirmation sentence, naming the room and the consequence | AC-5, AC-6 |
| `room-delete-seat-count` | The number of seats that will be permanently lost, rendered as a bare integer — `0` when the room has none | AC-5, AC-6 |
| `room-delete-confirm` | Confirm control in the delete dialog | AC-5, AC-6, AC-14 |
| `room-delete-cancel` | Dismiss control in the delete dialog | AC-7 |

Three notes QA needs and cannot get from anywhere else:

**`room-delete-seat-count` renders a bare integer, always.** AC-5 says the confirmation states that no
seats will be lost and AC-6 says it names the number; one element serves both, and the difference
between them is the value. Parsing a number out of a sentence is the kind of assertion that breaks on
a wording change, so the sentence is `room-delete-message` and the number is its own element.

**Error elements exist only when there is an error.** Each `-error` testid is absent from the markup
until its field has been rejected. AC-3 requires a message against *each* offending field, so a
submission with two blank fields renders two of them — assert on the specific ones, not on a count.

**AC-14 has no selector, by design.** Devices appear on no surface this ticket builds (out-of-scope
item 7), so it is verified at the seam rather than through the UI. It is the only AC on this ticket
that cannot be exercised through the UI, and it belongs in `tests/unit/rooms.test.ts`.

### 6.1 The seam surface QA may call

Added in version 4, answering Q10. Version 3 told QA to write a seam test and named one function in
it, which is not a testable instruction: asserting that a device "still exists" needs a device read,
and RULE-05 keeps QA out of `src/**`, so a name absent from this document does not exist. Section 6
is the only channel, and a seam entry point reaches QA the same way a `data-testid` does — by being
written here.

This is the **whole** surface QA is permitted to call. Anything not in this table is out of bounds
for the same reason an unlisted selector is.

```ts
import { devices, rooms } from "@/lib/data";
```

| Call | Returns | Fields QA may assert on |
|---|---|---|
| `rooms.listRooms()` | `Promise<Room[]>` | `id`, `code` — the only way to turn a code the story names into the id `deleteRoom` takes |
| `rooms.deleteRoom(id: string)` | `Promise<DeleteRoomOutcome>` | `deleted`, and when `true`, `seatsDeleted` and `devicesDetached` |
| `devices.listDevices()` | `Promise<Device[]>` | `id`, `seatId` (`string \| null`), `rank` (`"PRIMARY" \| "SECONDARY"`) |

`@` resolves to `src/` under vitest (`vitest.config.mts`), and `tests/unit/**/*.test.ts` is the only
pattern vitest collects — `tests/e2e/**` is Playwright's.

Three things that shape the test, all of which QA would otherwise have to discover from a failure:

**The story names rooms by `code` and `deleteRoom` takes an `id`.** AC-14's Given names `ROOM-A`;
`listRooms()` is the bridge. Ids are minted with `crypto.randomUUID()` and are never stable across a
run, which is the same fact that re-keyed the row selectors.

**Assert the control device by comparison, not by literal.** AC-14 names `dev-04` as the device that
must come back untouched. Its seat is a fixture value this document does not disclose and QA may not
look up, so snapshot `listDevices()` before the delete and assert the `dev-04` entry is unchanged
afterwards. That is a stronger assertion than a literal anyway: it fails if any field moves.

**Mock state is process-global and does not reset** (section 3). Vitest isolates per file, so a
delete in `tests/unit/rooms.test.ts` cannot reach another file — but within that file, every test
after the delete sees the deleted room. Order accordingly; there is no reset hook and section 7 says
why.

---

## 7. Rejected alternatives

**Refuse the delete when the room still contains seats, and check it in the server action.**
This was version 1's design and it is now wrong twice over. INV-11 inverted the behaviour, which is
the operator's decision and not open here. The second half is still instructive: the check was to run
in the action, before calling the seam. That leaves the rule outside the seam, so any other caller of
`deleteRoom` bypasses it, and it opens a window between the read and the write. Both the duplicate-code
refusal and the cascade now live inside the seam functions themselves, where a caller cannot forget
them and cannot get between them.

**Take the seat count fresh when the delete dialog opens, and refuse the delete if it changed.**
The rigorous version of INV-11: the user confirms a specific number, the seam compares it against
reality, and a mismatch re-prompts rather than deleting a different set of seats than the one
consented to. Rejected, with the trade named rather than hidden. It adds a `confirmedSeatCount`
parameter to `deleteRoom` and a `SEAT_COUNT_CHANGED` outcome, and neither has an acceptance criterion,
a message, or a selector — so the Developer would be implementing a refusal nobody specified, and QA
could not test it. The count is instead read at page render and refreshed by `revalidatePath` after
every mutation. **The residual risk is real and bounded:** nothing in this ticket creates or deletes a
seat, so the only way the count can go stale is a concurrent writer that does not exist yet. When the
`SEA` group adds seat creation, this decision has to be revisited, and this paragraph is the marker.

**~~Mutate the `fixtures.ts` arrays in place instead of cloning them into `mock/store.ts`.~~ — REJECTED
IN VERSION 2, AND THE REJECTION WAS WRONG. This is now the design.**
Version 2 rejected it on the grounds that it "makes the seed and the live state the same object", and
that `fixtures.ts` "is what a reader opens to learn what the system starts with; a room delete editing
it means that file answers a different question after the first delete than before it." Both
sentences are still quotable and neither survives inspection:

- The *source text* of `fixtures.ts` is what a reader opens, and it never changes. What changes is an
  array in memory, in a process where that array is the database. A mock seam whose data never
  changed would not be a seam.
- `prisma/seed.ts` runs in its own process. A runtime mutation cannot reach it, so the "shared source"
  was never at risk.
- The clone was not isolation. It is process-global and never resets, exactly like the arrays it
  copied, which version 2's own section 3 said out loud without drawing the conclusion.

What the clone actually did was create a second source of truth across a seam with four readers and
three repointed, and that is the R8 failure. The cost of this rejection was one full
IN_PROGRESS and REVIEW cycle. It is left here struck rather than deleted because
`03-impl-log.md`, `04-review.md` and `ticket.yaml` all cite it, and because a design that quietly
edits away the reasoning that failed teaches nobody anything.

**Repoint `mock/layout.ts` — and `mock/requests.ts` — at the cloning store, keeping the clone.**
The fix `04-review.md` puts in front of the human, and the smaller-looking one: two import lines, no
change to a decision already made. Executed, and it does hold INV-11 (section 0.3). Rejected anyway,
and not for the file count:

- **It fixes an instance, not the class.** The clone means every module that reads `rooms`, `seats` or
  `devices` must be on a list, and the list lives in a design document. Nothing enforces it — not
  `seam-parity.test.ts`, which compares the mock against Prisma and not against the store; not lint;
  not the type system. `mock/layout.ts` was missed by a Tech Lead, a Developer and a design review,
  and was caught by a reviewer executing the seam. The next module added to `src/lib/data/mock/`
  inherits the same trap with the same absence of a control.
- **It is the fix that is one line from being incomplete.** `mock/requests.ts` is on the list because
  it reads the seed, but repointing it changes nothing, and the thing that *does* dangle there —
  `req-01.seatId` after its seat is destroyed — is untouched by both fixes. A fix whose scope is
  "every module that reads `../fixtures`" is not aimed at the defect; it is aimed at the symptom's
  neighbourhood.
- An enforcing mechanism could be built — an ESLint rule forbidding `../fixtures` anywhere under
  `src/lib/data/mock/` except in `store.ts` — and it would make this alternative sound. It also means
  editing `eslint.config.mjs`, which is not in `allowed_paths` and is not this ticket's, to hold a
  property the alias holds for free by making the wrong state unrepresentable.

**Keep the clone and give the store a reset hook for tests.**
It would answer the process-global objection directly and let QA order destructive specs freely.
Rejected: a test-only export on the seam is an interface with no parity coverage, so
`tests/unit/seam-parity.test.ts` would have to be taught to ignore it — and that test is deliberately
not in `allowed_paths`, because a parity test the ticket may edit is a parity test the ticket can
silence. It is also orthogonal to R8, which is about two sources of truth and not about reset.

**Key the row testids by room id.**
The obvious choice, and it is what `DataTable`'s existing `rowKey={(r) => r.id}` does on the current
page. Rejected because ids are minted by `crypto.randomUUID()`: a test that creates a room cannot
predict the id, so `rooms-row-<id>` is unaddressable for exactly the rows AC-2, AC-4 and AC-5 need to
address. Keying by `code` costs nothing — it is unique in the model, constrained to
`^[A-Z0-9-]+$`, and supplied by the test — and it is what lets QA write one selector for a room it
just created.

**Give `RoomsManager` its own copy of the room list in client state.**
It would make the create and delete feel instantaneous without a server round trip. Rejected: the list
would then exist twice, and every action would have to update both. AC-2 asks for confirmation without
a reload, not for an optimistic update, and `revalidatePath` plus `router.refresh()` delivers that
from one source. A second copy of the list is the same class of mistake as a cached derived value.

---

## Changelog

- `2026-08-12T07:54:08Z` — sections 0 through 7, initial version. Raised by `tech-lead-design`.
  Verdict BLOCKED on B1 (no session exists, so AC-8 to AC-11 are unimplementable), B2 (a room cannot
  be created from a name alone) and B3 (`code` is unique with no refusal specified). `allowed_paths`
  enumerated in section 5 and withheld from `ticket.yaml`; `schema_delta` and `requires_adr` written
  back. Questions Q1 to Q5 raised in `99-questions.md`.
- `2026-08-12T16:30:41Z` — all seven sections rewritten. Verdict PASS. Raised by `ba` (Q1, Q2 and Q3
  answered and amended into `01-story.md`), by a human (INV-11 issued, AC-8 to AC-11 cut, Q4 answered),
  and by `tech-lead-design`. Six substantive changes: **(1)** section 1's create contract is no longer
  contingent — `createRoomSchema` stands as it already was, and section 6 gains the code and grid
  inputs. **(2)** AC-6's inversion rewrote the delete path: `deleteRoom` now cascades to seats, ports
  and occupancy and detaches devices, and returns the counts. **(3)** section 3 gains
  `mock/store.ts`, `mock/seats.ts` and `mock/devices.ts`, because the cascade has to be observable
  through `listSeats` and `listDevices` for AC-6 and AC-14 to be verifiable at all. **(4)** section 3.1
  added — the per-ID invariant mechanism table `.ai/registry/invariants.md` requires and R8 reads.
  **(5)** section 2 became a specification of *no* gate, with the two ways to implement that wrongly
  named. **(6)** section 6 re-keyed row testids from id to `code`, without which no test can address a
  room it created. `allowed_paths` written back to `ticket.yaml`; `size` set to `M`. Q6 and Q7 raised
  with `ba` in `99-questions.md` — both must be answered before `/qa`, neither blocks `/implement`.
- `2026-08-21T03:23:13Z` — sections 0, 3, 3.1, 5 and 7. Verdict PASS. Raised by `tech-lead-review`
  (`04-review.md`, R8 / INV-11) and by `developer` (`03-impl-log.md` open question 1, which named the
  defect and correctly routed it rather than editing outside `allowed_paths`). Amended by
  `tech-lead-design`. **One substantive change, and it is a reversal of version 2's own decision:**
  `mock/store.ts` re-exports the `fixtures.ts` arrays instead of cloning them, so there is one array
  per collection and no seam module can diverge. Version 2's third rejected alternative was the right
  design and its rejection cost an IN_PROGRESS and REVIEW cycle; section 7 keeps the rejection struck,
  with the reasoning that failed and why. `allowed_paths` and `size` are unchanged at twelve files and
  `M` — the fix is inside a file already listed. `mock/layout.ts` and `mock/requests.ts` are
  deliberately not added; section 5 says why. Q8 raised with `ba`: whether the cascade should null
  `seatId` on seat requests pointing at destroyed seats, which `prisma/schema.prisma`'s `onDelete:
  SetNull` would do in a database. It blocks neither gate. The reading of INV-11 that `04-review.md`
  puts to a human is not taken here and is not needed — after this change no seam read path returns a
  deleted room, so the invariant holds either way.
- `2026-08-21T09:33:29Z` — sections 0, 5 and 6. Verdict PASS. Raised by `qa` (`06-test-report.md`,
  Q10 and Q11 in `99-questions.md`). Amended by `tech-lead-design`. Two changes, both closing
  omissions in this document and neither touching `src/**`: **(1)** section 6.1 added — the seam
  surface QA may call for AC-14, with arguments and return fields, because version 3 mandated a seam
  test while naming only one of the two functions it needs and RULE-05 forbids QA from finding the
  other. **(2)** `tests/e2e/smoke.spec.ts` added to `allowed_paths` — section 6's row re-keying broke
  two of its assertions and section 5 had put the file beyond every agent on the ticket. The
  re-keying stands and the file is repaired by the ticket that broke it. `size` moves from `M` to
  `L` on the honest count of thirteen files; the ticket is **not** split, and section 5 gives the
  reasoning and records the second instance of the Sizing table having no notion of an amendment to
  an already-implemented design. That is model debt for the steward and is deliberately not acted on
  here. Q6 to Q9 are all answered by `ba`; nothing in this document waits on an answer.
