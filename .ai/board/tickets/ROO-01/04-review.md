---
ticket: ROO-01
stage: REVIEW
agent: tech-lead-review
produced_at: 2026-08-21T04:18:29Z
inputs_read: [ .ai/board/tickets/ROO-01/01-story.md, .ai/board/tickets/ROO-01/02-design.md, .ai/board/tickets/ROO-01/03-impl-log.md, .ai/board/tickets/ROO-01/ticket.yaml, .ai/01-operating-model.md, .ai/registry/rules.md, .ai/registry/invariants.md, .ai/templates/review-report.md, git diff ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# ROO-01 — Room CRUD UI — review

Isolated dispatch, fresh session, files only. No message channel to the Developer existed and none was
used; `chat_before_verdict: none` is truthful (RULE-13, RULE-12).

**Second pass.** The first (`2026-08-12T16:56:20Z`) failed R8 on INV-11 and escalated under RULE-07:
`mock/store.ts` cloned the fixture arrays, `mock/layout.ts` was the one consumer of four that nobody
repointed, and a deleted room stayed retrievable through `layout.getRoomLayout`. A human resolved the
escalation by re-running `/design`; version 3 reversed the clone decision, and the Developer applied
it. Every check below was re-run from nothing — the R8 defect is verified gone by **executing the
seam**, not by reading the amendment and believing it.

All nine checks pass with citation.

## Checklist

| # | Check | Verdict | Citation |
|---|---|---|---|
| R1 | `git diff --name-only` is a subset of `allowed_paths` (RULE-03) | PASS | Ten `src/**` files, each enumerated at `ticket.yaml:124-133`: `src/actions/rooms.ts:66`, `src/app/(app)/rooms/page.tsx:10`, `src/app/(app)/rooms/rooms-manager.tsx:64`, `src/lib/data/mock/devices.ts:2`, `src/lib/data/mock/rooms.ts:65`, `src/lib/data/mock/seats.ts:2`, `src/lib/data/mock/store.ts:36`, `src/lib/data/prisma/rooms.ts:42`, `src/lib/data/types.ts:35`, `src/lib/validation/room.ts:33`. `tests/**` is untouched. See the R1 note. |
| R2 | typecheck exit 0 | PASS | `pnpm typecheck` → `tsc --noEmit`, **exit 0**, no output |
| R3 | lint exit 0 | PASS | `pnpm lint` → `eslint .`, **exit 0**, no output. The RULE-02 rule is untouched: `eslint.config.mjs:61` and its four-file exception list at `:75-83`. No `eslint-disable` appears in any of the ten files. |
| R4 | No component imports Prisma or reaches the database directly (RULE-02) | PASS | `src/app/(app)/rooms/page.tsx:5`, `src/app/(app)/rooms/rooms-manager.tsx:21`, `src/actions/rooms.ts:16-17` all import `@/lib/data`. `grep -rn "@prisma/client\|@/lib/data/prisma\|@/lib/data/mock\|PrismaClient" src/app src/components src/actions` returns nothing. |
| R5 | Every contract item in design section 1 is implemented (RULE-04) | PASS | Per-item table below |
| R6 | Permission gating matches design section 2 | PASS | `src/actions/rooms.ts:72-76`, `:98-99`, `:122-124` |
| R7 | Every `data-testid` in design section 6 exists in the markup | PASS | All 31 located; table below |
| R8 | No invariant violated (RULE-07) | PASS | Per-ID table below; INV-11 verified by execution against `src/lib/data/mock/store.ts:36,39,41` |
| R9 | No dependency added without an ADR | PASS | `git status --porcelain package.json pnpm-lock.yaml` is **empty**. No import in the ten files names a package absent from the existing manifest: `next/cache`, `next/navigation`, `react`, `zod` only. |

### R1 note — the working tree carries process-plane edits outside `allowed_paths`

Read literally, `git diff --name-only` is not a subset of `allowed_paths`: nineteen further paths are
dirty. R1 enforces RULE-03, which binds *agents* editing under an active ticket, so each was
attributed before the check was called. None is this ticket's work:

- `.ai/registry/features.md`, `.ai/registry/invariants.md`, `.ai/registry/decisions/ADR-003-member-identity.md` — registry plane, human-only and hook-blocked to agents (RULE-01, `guard-registry.mjs`). `invariants.md:36` is INV-11 itself.
- `.ai/01-operating-model.md`, `.ai/standards/**`, `.ai/templates/ticket.yaml`, `.claude/**`, `scripts/check-docs.mjs`, `scripts/tests/check-docs.test.mjs` — human-owned process surface, and the `/thuki` steward's, not the loop's.
- `.ai/board/backlog.md`, `.ai/board/metrics.md` — the orchestrator's, per the stage-ownership table at `.ai/01-operating-model.md:74`. `.ai/board/model-debt.md`, `.ai/board/model-defects.md` — human.
- `.ai/board/tickets/ROO-01/**` — inside `allowed_paths` (`ticket.yaml:136`).
- `prisma/schema.prisma:72-93` — **comment-only.** The diff adds an INV-11 rationale block above `Seat.room`; the relation line differs from `HEAD` by inter-token whitespace alone and `onDelete: Cascade` is unchanged. `03-impl-log.md:56-58` claims it predates this stage and the diff content bears that out — it is registry-voice prose about the operator's cascade decision, not implementation work. `schema_delta: none` (`ticket.yaml:142`) holds and no migration exists.

The ten `src/**` files are exactly design section 5's list (`02-design.md:462-475`) minus the two
`tests/**` entries, which are QA's. `tests/unit/seam-parity.test.ts` was not edited and still passes,
which is the evidence that the four new names and their arities match on both sides of the seam.

## R5 detail

| Contract item | Implemented at | Matches signature |
|---|---|---|
| §1.1 `NewRoom` | `src/lib/data/types.ts:35` | Yes — `Omit<Room, "id">`, verbatim |
| §1.1 `RoomPatch` | `src/lib/data/types.ts:38-40` | Yes — `{ name: string }` |
| §1.1 `CreateRoomOutcome` | `src/lib/data/types.ts:46-48` | Yes — both arms, `reason: "DUPLICATE_CODE"` |
| §1.1 `DeleteRoomOutcome` | `src/lib/data/types.ts:57-59` | Yes — both arms, `seatsDeleted` and `devicesDetached` |
| §1.2 `listRooms` | `src/lib/data/mock/rooms.ts:4`, `src/lib/data/prisma/rooms.ts:4` | Yes — unchanged signature; source is now `./store` (`mock/rooms.ts:2`) |
| §1.2 `getRoom` | `src/lib/data/mock/rooms.ts:8`, `src/lib/data/prisma/rooms.ts:8` | Yes — arity 1 |
| §1.2 `countSeatsInRoom` | `src/lib/data/mock/rooms.ts:16`, `src/lib/data/prisma/rooms.ts:13` | Yes — `(roomId: string) => Promise<number>` |
| §1.2 `createRoom` | `src/lib/data/mock/rooms.ts:29`, `src/lib/data/prisma/rooms.ts:23` | Yes — `(input: NewRoom) => Promise<CreateRoomOutcome>` |
| §1.2 `updateRoom` | `src/lib/data/mock/rooms.ts:40`, `src/lib/data/prisma/rooms.ts:28` | Yes — arity 2 |
| §1.2 `deleteRoom` | `src/lib/data/mock/rooms.ts:65`, `src/lib/data/prisma/rooms.ts:42` | Yes |
| §1.2 rule 1 — duplicate `code` refused, not thrown | `src/lib/data/mock/rooms.ts:30-32` | Yes — executed: `createRoom({code:"ROOM-B",…})` returns `{created:false,reason:"DUPLICATE_CODE"}` and adds no room |
| §1.2 rule 2 — the seam mints the id | `src/lib/data/mock/rooms.ts:34` | Yes — `crypto.randomUUID()`; executed, the minted id matches the UUIDv4 shape. `createRoomSchema` (`src/lib/validation/room.ts:35-40`) has no `id` key, so a supplied one is dropped at the parse |
| §1.2 rule 3 — whole cascade or none | `src/lib/data/mock/rooms.ts:65-96` | Yes — the function contains **no `await` at all** between the first write at `:76` and the last at `:93` |
| §1.3 `roomNameSchema`, `roomIdSchema` | `src/lib/validation/room.ts:20`, `:22` | Yes |
| §1.3 `updateRoomSchema`, `deleteRoomSchema` | `src/lib/validation/room.ts:42-45`, `:47-49` | Yes |
| §1.3 `UpdateRoomInput`, `DeleteRoomInput` | `src/lib/validation/room.ts:52-53` | Yes |
| §1.3 `createRoomSchema` shape unchanged | `src/lib/validation/room.ts:35-40` | Yes — same four keys, same rules; `name` now references `roomNameSchema:20` |
| §1.3 `.trim()` before `.min(1)` | `src/lib/validation/room.ts:20` | Yes — `"   "` fails (AC-3) |
| §1.3 grid dimensions `.int().min(1).max(200)` | `src/lib/validation/room.ts:33` | Yes — deviation 2, one shared const instead of the rule twice; identical parsed shape |
| §1.3 `z.coerce.number()` not used | `src/lib/validation/room.ts:33`, `src/app/(app)/rooms/rooms-manager.tsx:86-87` | Yes — the client coerces with `Number(...)` |
| §1.4 `RoomFieldName`, `RoomActionError`, `RoomActionResult` | `src/actions/rooms.ts:20`, `:22-25`, `:27` | Yes |
| §1.4 `getRooms` unchanged | `src/actions/rooms.ts:62-64` | Yes |
| §1.4 `createRoom` | `src/actions/rooms.ts:66` | Yes — `(input: unknown) => Promise<RoomActionResult<Room>>` |
| §1.4 `renameRoom` | `src/actions/rooms.ts:92` | Yes |
| §1.4 `deleteRoom` | `src/actions/rooms.ts:116` | Structurally — deviation 1, `DeleteRoomData` (`:29`) names the inline payload; same three fields, same types |
| §1.4 five-step order | `src/actions/rooms.ts:67-89`, `:93-108`, `:117-139` | Yes — parse, permission (absent, commented), seam, `revalidatePath("/rooms")` at `:88`, `:107`, `:131`, typed result |
| §1.4 raw `ZodError` never returned | `src/actions/rooms.ts:49-60` | Yes — `fieldErrors` maps `issues` onto the four-field map; `id` maps to nothing, deliberately and with the reason at `:45-47` |
| §1.4 `revalidatePath` import | `src/actions/rooms.ts:14` | Yes — `from "next/cache"`, one argument |
| §1.5 `RoomsPage` | `src/app/(app)/rooms/page.tsx:10` | Yes — server component, default export, no state; builds `RoomRow[]` from `listRooms` + `countSeatsInRoom` at `:11-14` |
| §1.5 `RoomRow` | `src/app/(app)/rooms/rooms-manager.tsx:23-27` | Yes — `{ room: Room; seatCount: number }` |
| §1.5 `RoomsManager` | `src/app/(app)/rooms/rooms-manager.tsx:64` | Yes — three dialogs, one `pending` flag (`:71`), no copy of the list; `rows` is a prop and every mutation ends in `router.refresh()` (`:100`, `:115`, `:130`) |

Both deviations are declared at `03-impl-log.md:98-111` and neither changes a parameter, a return
shape, or a selector. The clarification at `03-impl-log.md:116-122` is correct and was re-checked:
`Number("")` is `0`, so an empty grid input is refused by `.min(1)` rather than by the `NaN` path §1.3
predicted. The conclusion survives, the stated reason does not, and the Developer flagged it rather
than leaving a future reader to find the discrepancy alone.

## R6 detail

Design section 2 (`02-design.md:318-347`) specifies *no* gate and names the two ways to implement that
wrongly. Neither occurs.

| Design section 2 requirement | Held at |
|---|---|
| No `PermissionGate` on this surface | `grep -rn "PermissionGate\|canManageRooms" src/app src/actions src/lib` returns exactly two lines: `src/actions/rooms.ts:75`, which is prose *inside* the step-3 comment saying the guard must not go there, and `src/lib/auth/permissions.ts:33`, an untouched definition outside `allowed_paths`. No import of either exists in any of the ten files. |
| `canManageRooms` not called | As above — `src/lib/auth/permissions.ts:33` is a definition with no caller |
| Step-3 comment naming what is absent, at the line where the check belongs | `src/actions/rooms.ts:72-76`, `:98-99`, `:122-124` — each names the rank check, out-of-scope item 5, and the AUT group |
| Every operation ungated | `src/actions/rooms.ts:78`, `:102`, `:126` — the seam call follows the parse with no rank comparison between them |

This is the correct R6 finding on this ticket: no gate exists, and design section 2 says so.

## R7 detail

All 31 selectors from design section 6 (`02-design.md:542-574`) are present. Three prefixes resolve
inside shared components used unchanged, which is what section 5 anticipated; each of those forwards
the attribute rather than swallowing it.

| `data-testid` | Exists at |
|---|---|
| `rooms-page` | `src/app/(app)/rooms/page.tsx:17` |
| `rooms-table` | `src/components/shared/DataTable.tsx:29` → `src/components/ui/Table.tsx:6`, via `testIdPrefix="rooms"` at `rooms-manager.tsx:186` |
| `rooms-empty` | `src/components/shared/DataTable.tsx:25` → `src/components/shared/EmptyState.tsx:3`, same prefix |
| `rooms-row-<code>` | `src/components/shared/DataTable.tsx:39` → `src/components/ui/Table.tsx:23`, keyed by `rowKey={(r) => r.room.code}` at `rooms-manager.tsx:185` |
| `rooms-row-<code>-code` | `src/app/(app)/rooms/rooms-manager.tsx:193` |
| `rooms-row-<code>-name` | `src/app/(app)/rooms/rooms-manager.tsx:198` |
| `rooms-row-<code>-grid` | `src/app/(app)/rooms/rooms-manager.tsx:205-207` — renders `{gridWidth} x {gridHeight}` |
| `rooms-row-<code>-edit` | `src/app/(app)/rooms/rooms-manager.tsx:222` |
| `rooms-row-<code>-delete` | `src/app/(app)/rooms/rooms-manager.tsx:233` |
| `rooms-create-open` | `src/app/(app)/rooms/rooms-manager.tsx:174` |
| `room-create-dialog` | `src/components/shared/EntityFormDialog.tsx:35` → `src/components/ui/Dialog.tsx:17`, via `testIdPrefix="room-create"` at `rooms-manager.tsx:249` |
| `room-create-name` | `src/app/(app)/rooms/rooms-manager.tsx:253` |
| `room-create-name-error` | `src/app/(app)/rooms/rooms-manager.tsx:254` → `FieldError` at `:44-51` |
| `room-create-code` | `src/app/(app)/rooms/rooms-manager.tsx:258` |
| `room-create-code-error` | `src/app/(app)/rooms/rooms-manager.tsx:259` → `:47` |
| `room-create-grid-width` | `src/app/(app)/rooms/rooms-manager.tsx:263` |
| `room-create-grid-width-error` | `src/app/(app)/rooms/rooms-manager.tsx:264` → `:47` |
| `room-create-grid-height` | `src/app/(app)/rooms/rooms-manager.tsx:268` |
| `room-create-grid-height-error` | `src/app/(app)/rooms/rooms-manager.tsx:269` → `:47` |
| `room-create-submit` | `src/components/shared/EntityFormDialog.tsx:42`, same prefix |
| `room-create-cancel` | `src/components/shared/EntityFormDialog.tsx:39`, same prefix |
| `room-edit-dialog` | `src/components/shared/EntityFormDialog.tsx:35`, via `testIdPrefix="room-edit"` at `rooms-manager.tsx:279` |
| `room-edit-name` | `src/app/(app)/rooms/rooms-manager.tsx:290` |
| `room-edit-name-error` | `src/app/(app)/rooms/rooms-manager.tsx:292` → `:47` |
| `room-edit-submit` | `src/components/shared/EntityFormDialog.tsx:42`, same prefix |
| `room-edit-cancel` | `src/components/shared/EntityFormDialog.tsx:39`, same prefix |
| `room-delete-dialog` | `src/app/(app)/rooms/rooms-manager.tsx:301` → `src/components/ui/Dialog.tsx:17` |
| `room-delete-message` | `src/app/(app)/rooms/rooms-manager.tsx:304` |
| `room-delete-seat-count` | `src/app/(app)/rooms/rooms-manager.tsx:317-319` — bare integer, `{deleteTarget?.seatCount ?? 0}` |
| `room-delete-confirm` | `src/app/(app)/rooms/rooms-manager.tsx:333` |
| `room-delete-cancel` | `src/app/(app)/rooms/rooms-manager.tsx:323` |

Forwarding verified rather than assumed: `Table.tsx:3,6`, `TR` at `Table.tsx:21,23`, `EmptyState.tsx:1,3`,
`Dialog.tsx:13,17`, and `Input`/`Button` spread props (`Input.tsx:5,8`, `Button.tsx:17,20`). Section 6's
two behavioural notes hold: the `-error` elements are absent until their field is rejected
(`rooms-manager.tsx:44-45`), and `room-delete-seat-count` is a bare integer including `0`, with the
sentence in `room-delete-message` (`:304-310`).

## R8 detail

One row per ID in `invariants_touched` (`ticket.yaml:118`). All seven hold. Every row was checked
against the code and, where a state is reachable, against a run of the seam.

| Invariant | Held by | Citation |
|---|---|---|
| INV-01 — a seat has at most one occupant | The shape of the data. Occupancy is `Seat.occupantId`, a field of the seat object the cascade splices out, so it cannot outlive its seat and a partial cascade is not expressible. Nothing in this ticket assigns an occupant. `Member` rows are never read or written — this destroys an occupancy, not a person. | `src/lib/data/types.ts:88`; `src/lib/data/mock/rooms.ts:84-91`. Executed: after `deleteRoom("room-a")`, `seats.getSeat("seat-a-01")` is `null`. |
| INV-04 — at most one primary device per seat | No code here writes `rank: "PRIMARY"`. The only write to `rank` is the downgrade, and after the cascade no device references a destroyed seat, so no seat is left for a second primary to be counted against. | `src/lib/data/mock/rooms.ts:77`; `src/lib/data/types.ts:118` |
| INV-05 — a primary device is owned by its seat's occupant | Ordering. Devices are detached **before** their seats are removed, so the unrepairable state — a device still `PRIMARY` pointing at a deleted seat whose occupant is gone — is never written. `ownerId` is deliberately untouched: an unassigned device may still be owned (INV-07). | detach `src/lib/data/mock/rooms.ts:73-80`, seats `:84-91` |
| INV-06 — primary downgrades on occupant exit | A real write on the same code path as the delete, not a constraint that merely refuses: every device whose `seatId` is in the doomed set is set to `"SECONDARY"` unconditionally. Executed: `dev-01` and `dev-03` are `PRIMARY` in the fixtures (`src/lib/data/fixtures.ts:78,80`) and both come back `SECONDARY`. | `src/lib/data/mock/rooms.ts:75-78` |
| INV-07 — devices may exist unassigned | `seatId` is set to `null` and the device stays in the store; no path in this ticket removes a device. `listUnassignedDevices` reads the store, so it sees them. Executed: `deleteRoom("room-a")` returns `devicesDetached: 3`, and afterwards `listUnassignedDevices()` is `dev-01, dev-02, dev-03, dev-05` while `dev-04` is untouched at `seat-b-01`. | `src/lib/data/mock/rooms.ts:76-77`; `src/lib/data/mock/devices.ts:13-15` |
| INV-10 — no two seats overlap within a room | `gridDimensionSchema` is `.int().min(1).max(200)` on both dimensions, enforced in the server action before the seam is reached, so no room is created with a grid in which a placement is undefined. The rename path cannot resize a grid: `updateRoomSchema` carries only `id` and `name`, and `updateRoom` writes only `name` — executed, a rename leaves `code`, `gridWidth` and `gridHeight` intact. This ticket places no seat and cannot itself produce an overlap. | `src/lib/validation/room.ts:33`, `:42-45`; `src/actions/rooms.ts:67`; `src/lib/data/mock/rooms.ts:44` |
| **INV-11 — deleting a room deletes its seats; destructive; the interface must obtain explicit confirmation naming the number of seats lost** | **HELD, on all three mechanisms.** Detail below. | `src/lib/data/mock/rooms.ts:65-96`; `src/lib/data/mock/store.ts:36,39,41`; `src/app/(app)/rooms/rooms-manager.tsx:317-319`, `:157-160` |

### INV-11 — the three mechanisms, and the one that failed last pass

**1. The cascade is inside the seam.** `deleteRoom` (`src/lib/data/mock/rooms.ts:65-96`) removes the
room row, its seats, and with each seat its `ports` and `occupantId` — both fields *of* the seat
object — and detaches devices at `:73-80` before splicing seats at `:84-91`. There is no `await`
anywhere in the function, so no caller can observe or interleave with a half-applied cascade.

**2. The confirmation names the seam's own number.** `countSeatsInRoom`
(`src/lib/data/mock/rooms.ts:16`) → `RoomRow.seatCount` (`src/app/(app)/rooms/page.tsx:13`) →
`room-delete-seat-count` (`src/app/(app)/rooms/rooms-manager.tsx:317-319`). Nothing is written before
the confirm control is pressed: `closeDelete` (`:157-160`) only clears state, which is AC-7. Because a
UI affordance is never sufficient on its own (`.ai/registry/invariants.md:70`), `deleteRoom` also
*returns* `seatsDeleted` (`src/lib/data/types.ts:58`), giving R8 and QA a non-UI place to assert it.

**3. The destruction holds on every seam read path.** This is the half that failed last pass and it is
now held by `src/lib/data/mock/store.ts:36,39,41` — `export const rooms: Room[] = seedRooms`, and the
same for `seats` and `devices`. These are re-exports of the fixture arrays, not clones, so there is
exactly one array per collection in the process and no seam module can disagree with another. There is
no list of modules to keep complete, because there is nothing to repoint.

Verified by execution, not by reading the amendment. Object identity first, through the same
extensionless specifier `store.ts:33` uses:

```
store.rooms   === fixtures.rooms     true
store.seats   === fixtures.seats     true
store.devices === fixtures.devices   true
```

Then behaviour, `deleteRoom("room-a") = {"deleted":true,"seatsDeleted":6,"devicesDetached":3}`:

```
                                        before                     after
rooms.listRooms                         ROOM-A, ROOM-B             ROOM-B
rooms.getRoom(room-a)                   room-a                     null
rooms.countSeatsInRoom(room-a)          6                          0
seats.listSeats()                       12 seats                   the six seat-b-* only
seats.getSeat(seat-a-01)                seat-a-01                  null
layout.getRoomLayout(room-a)   <-- R8   ROOM-A with 6 seats        null
layout.listRoomLayouts()       <-- R8   room-a, room-b             room-b
devices.listUnassignedDevices           dev-05                     dev-01, dev-02, dev-03, dev-05
```

`src/lib/data/mock/layout.ts:1` is **unedited and still imports `../fixtures`**, and it observes both
the delete and a subsequent create (`listRoomLayouts()` returns `ROOM-B, R-101` after `R-101` is
created). That is the property working, not an oversight surviving: `layout.ts` reads the same array
object the cascade writes. `src/lib/data/index.ts:51` exports `layout` as part of the seam, which is
why it is in scope for this check at all.

**Two neighbours of the seed, reasoned through rather than waved past.**

- `src/lib/data/mock/requests.ts:1` still reads `../fixtures` and `req-01` still names `seat-a-03` and
  `room-a` after the delete (`src/lib/data/fixtures.ts:86`; confirmed in the run above). This is **not**
  an INV-11 failure and the distinction is not a convenience: `listRequests` returns a request row
  carrying an id *string*, not the deleted `Room` or `Seat` object. Every seam read path that returns a
  room or a seat now returns neither. Walking the ledger, no invariant has a seat request as its
  subject — INV-01 through INV-11 do not mention one. This is `ba`'s Q8 (`02-design.md:123-131`), and
  it correctly blocks no gate.
- `src/lib/data/fixtures.ts:73` computes `ports` with `seats.flatMap(...)` once at module load, so it
  still holds the ports of destroyed seats. No mock module reads it: `grep` over `src/lib/data/mock/`
  finds `ports` only in prose, and `prisma/seed.ts:21` is its sole consumer, in a separate process. No
  seam read path exposes stale ports.

`src/lib/data/mock/groups.ts:1`, `members.ts:1` and `accounts.ts:1` also read `../fixtures`; their
collections are neither written nor cascaded by this ticket.

## Findings

None. All nine checks pass with citation.

There is no "pass with comments", so the items below are recorded as context for the stage that runs
next, not as findings against a check.

**`/qa` is blocked on `ba`, and this verdict does not unblock it.** Q6 and Q7 remain open
(`02-design.md:56-84`, `03-impl-log.md:257-262`) and both must be answered before QA runs. Q7 is the
sharper one: AC-6 (`01-story.md:116-125`) requires a room containing **exactly three seats**, and the
fixture rooms hold six each — `src/lib/data/fixtures.ts:50-51` builds two `seatRow(...)` calls of three
per room, and `deleteRoom("room-a")` reports `seatsDeleted: 6` in the run above. As written, AC-6 is
the one criterion QA cannot execute. Q6 asks whether the destruction of a seat's network ports needs a
criterion. A third item travels with them: `01-story.md:247-251`'s out-of-scope item 3 still describes
a pending `schema_delta` and `requires_adr: true` that were returned to `none` and `false`
(`ticket.yaml:142-143`). One RULE-14 pass covers all three.

**The design's own account of what the last failure cost is accurate.** `02-design.md:616-635` keeps
version 2's rejection struck rather than deleted, with the reasoning that failed. That is worth noting
because R8 last pass could not distinguish "the class of defect is removed" from "this instance is
patched" — the fix that landed is the first, and this pass could check it by executing the module the
previous fix would have edited.

**Two implementation notes, neither a finding.** `03-impl-log.md:246-251` records that a `NOT_FOUND`
from `renameRoom` or `deleteRoom` renders as plain text with no `data-testid`
(`src/app/(app)/rooms/rooms-manager.tsx:294`, `:321`) because design section 6 has no row for it and
`room-edit-name-error` — specified as a message *against the name* — would have mislabelled it. That is
the correct handling of a missing selector: it does not invent one, and no AC reaches the case.
`03-impl-log.md:252-256` records that a `VALIDATION` failure on `id` maps to no field;
`src/actions/rooms.ts:45-47` says why at the line, and `id` never comes from a user.

## Verdict

**PASS.**

Nine of nine checks pass, each citing `file:line`. The R8 defect that escalated this ticket on
2026-08-12 is gone, and gone by removing the condition that produced it rather than by patching the
module it surfaced in — verified by object identity and by executing five seam read paths across a
delete, not by reading `02-design.md` version 3 and taking its word.

`rework_count` stays `0` (`ticket.yaml:144`): the prior failure was R8, which escalates and never
enters REWORK (RULE-07), so there was never anything to increment.

The ticket advances to `QA`. QA runs in a **fresh** session, discarded after its verdict — and it
should not run until `ba` has answered Q6 and Q7, because AC-6 as written names a three-seat room that
does not exist.
