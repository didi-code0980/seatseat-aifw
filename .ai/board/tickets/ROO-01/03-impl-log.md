---
ticket: ROO-01
stage: IN_PROGRESS
agent: developer
produced_at: 2026-08-21T03:51:08Z
inputs_read: [ .ai/board/tickets/ROO-01/02-design.md, .ai/board/tickets/ROO-01/01-story.md, .ai/board/tickets/ROO-01/ticket.yaml, .ai/board/tickets/ROO-01/99-questions.md, .ai/registry/invariants.md, .ai/standards/architecture.md, .ai/standards/coding-standards.md, .ai/standards/ui-design-system.md, .ai/templates/impl-log.md, src/lib/data/types.ts, src/lib/data/index.ts, src/lib/data/fixtures.ts, src/lib/data/derive.ts, src/lib/data/mock/rooms.ts, src/lib/data/mock/seats.ts, src/lib/data/mock/devices.ts, src/lib/data/mock/layout.ts, src/lib/data/mock/requests.ts, src/lib/data/mock/members.ts, src/lib/data/mock/groups.ts, src/lib/data/mock/accounts.ts, src/lib/data/prisma/rooms.ts, src/lib/data/prisma/client.ts, src/actions/rooms.ts, src/lib/validation/room.ts, src/app/(app)/rooms/page.tsx, src/components/shared/DataTable.tsx, src/components/shared/EntityFormDialog.tsx, src/components/shared/EmptyState.tsx, src/components/ui/Dialog.tsx, src/components/ui/Button.tsx, src/components/ui/Input.tsx, src/components/ui/Table.tsx, tests/unit/seam-parity.test.ts, eslint.config.mjs, tsconfig.json, vitest.config.mts, package.json ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: REVIEW
---

# ROO-01 — Room CRUD UI — implementation log

Ten files under `src/**`, two of them new. No test file was written: `tests/unit/rooms.test.ts` and
`tests/e2e/rooms.spec.ts` are in `allowed_paths` because QA writes into them, not because this stage
does. They are untouched and absent from the table below.

**Second version, and it is one line of code.** The first (`2026-08-12T16:45:54Z`) implemented
`02-design.md` version 2 faithfully; REVIEW then failed R8 on INV-11 — after `deleteRoom`,
`mock/layout.ts` still returned the deleted room with all six of its deleted seats, because the store
was a *clone* of the fixture arrays and `layout.ts` was the one consumer of four that nobody
repointed. That escalated to a human under RULE-07 rather than entering REWORK, and the human's
resolution was to re-run `/design`. Version 3 of the design reverses the decision that caused it:
`mock/store.ts` now **aliases** the fixture arrays instead of cloning them. Everything else in this
log stands; the Changelog at the end says exactly what moved.

The fix is not the one `04-review.md` sketched, and the difference matters to whoever reads both.
The review offered "repoint `layout.ts` and `requests.ts` at the store", which fixes the instance.
Design section 7 rejects that in favour of removing the class: with one array per collection there is
no list of modules to keep complete, so `mock/layout.ts` needs no edit and gets the cascade for free.
No file was added to `allowed_paths` and `size` did not move.

Branch discipline, both cycles. The first was dispatched on `main`; this one on
`chore/permissions-allowlist`. `guard-allowed-paths.mjs` resolves the ticket from `feat/<ID>` and
exits 0 on any other branch name, so either would have run the stage with RULE-03 unenforced.
`feat/ROO-01` was checked out before the first edit each time, so every write recorded here was made
with the guard live.

## Files touched

| file | created/modified | why | contract item it satisfies |
|------|------------------|-----|----------------------------|
| `src/lib/data/types.ts` | modified | Adds the four seam DTOs the room write path returns. No existing type altered. | §1.1 |
| `src/lib/data/mock/store.ts` | created, then amended | Names the three arrays the cascade writes to. It re-exports the `fixtures.ts` arrays themselves — no clone — so there is one array per collection and no seam module can disagree with another about what the seam holds. That aliasing is the R8 fix. | §1.2 rule 3, §3 |
| `src/lib/data/mock/rooms.ts` | modified | Adds the four new seam functions and repoints the two existing ones at the store. | §1.2 |
| `src/lib/data/mock/seats.ts` | modified | Reads seats from the store instead of the fixture array, so `listSeats` stops returning seats the cascade destroyed (AC-6). Signatures unchanged. | §3 |
| `src/lib/data/mock/devices.ts` | modified | Reads devices from the store, so `listDevices` shows the detachment (AC-14). Signatures unchanged. | §3 |
| `src/lib/data/prisma/rooms.ts` | modified | Same four names, same arity, each `notWired(...)`, so `seam-parity.test.ts` keeps passing and the eventual swap cannot fail at the import boundary. | §1.2 |
| `src/lib/validation/room.ts` | modified | Adds the name, id, update and delete schemas; `createRoomSchema`'s inline name rule now points at `roomNameSchema` so create and rename cannot drift. | §1.3 |
| `src/actions/rooms.ts` | modified | Adds the three write actions in the five-step order, each narrowing an `unknown` parameter and mapping seam refusals onto the typed error union. | §1.4 |
| `src/app/(app)/rooms/page.tsx` | modified | Becomes the server component that builds `RoomRow[]` from `listRooms` plus `countSeatsInRoom` and holds no state. | §1.5 |
| `src/app/(app)/rooms/rooms-manager.tsx` | created | The client half: three dialogs, the pending flag, the last action error, and every selector in §6. | §1.5, §6 |

`prisma/schema.prisma` also shows as modified in `git status`. That change predates this stage — it
was already in the working tree on `main` before the branch was cut — and nothing here edited it.
`schema_delta` is `none` and this ticket writes no migration.

## Contract items

| § 1 item | Implemented at | Notes |
|----------|----------------|-------|
| §1.1 `NewRoom` | `src/lib/data/types.ts:35` | `Omit<Room, "id">`, verbatim. |
| §1.1 `RoomPatch` | `src/lib/data/types.ts:38` | Name only. |
| §1.1 `CreateRoomOutcome` | `src/lib/data/types.ts:46` | |
| §1.1 `DeleteRoomOutcome` | `src/lib/data/types.ts:57` | |
| §1.2 `listRooms` | `src/lib/data/mock/rooms.ts:4`, `src/lib/data/prisma/rooms.ts:4` | Unchanged signature; source is now the store. |
| §1.2 `getRoom` | `src/lib/data/mock/rooms.ts:8`, `src/lib/data/prisma/rooms.ts:8` | As above. |
| §1.2 `countSeatsInRoom` | `src/lib/data/mock/rooms.ts:16`, `src/lib/data/prisma/rooms.ts:13` | |
| §1.2 `createRoom` | `src/lib/data/mock/rooms.ts:29`, `src/lib/data/prisma/rooms.ts:23` | |
| §1.2 `updateRoom` | `src/lib/data/mock/rooms.ts:40`, `src/lib/data/prisma/rooms.ts:28` | |
| §1.2 `deleteRoom` | `src/lib/data/mock/rooms.ts:65`, `src/lib/data/prisma/rooms.ts:42` | |
| §1.2 rule 1 — duplicate `code` refused, not thrown | `src/lib/data/mock/rooms.ts:30-32` | Returns `{ created: false, reason: "DUPLICATE_CODE" }`. |
| §1.2 rule 2 — the seam mints the id | `src/lib/data/mock/rooms.ts:34` | `crypto.randomUUID()`. No id is read from a form: `createRoomSchema` has no `id` key, so one supplied in the payload is dropped by the parse. |
| §1.2 rule 3 — whole cascade or none | `src/lib/data/mock/rooms.ts:65-96` | No await on anything outside the module between the first write and the last. |
| §1.3 `roomNameSchema`, `roomIdSchema` | `src/lib/validation/room.ts:20`, `:22` | |
| §1.3 `updateRoomSchema`, `deleteRoomSchema` | `src/lib/validation/room.ts:42`, `:47` | |
| §1.3 `UpdateRoomInput`, `DeleteRoomInput` | `src/lib/validation/room.ts:52-53` | |
| §1.3 `createRoomSchema` shape unchanged | `src/lib/validation/room.ts:35` | Same four keys, same rules. `name` now references `roomNameSchema` and the two grid dimensions reference one shared `gridDimensionSchema`; the resulting shape is identical. |
| §1.4 `RoomFieldName`, `RoomActionError`, `RoomActionResult` | `src/actions/rooms.ts:20`, `:22`, `:27` | |
| §1.4 `createRoom` | `src/actions/rooms.ts:66` | |
| §1.4 `renameRoom` | `src/actions/rooms.ts:92` | |
| §1.4 `deleteRoom` | `src/actions/rooms.ts:116` | Return type named `DeleteRoomData` (`src/actions/rooms.ts:29`) — see Deviations. |
| §1.4 step order, all three actions | `src/actions/rooms.ts:66-140` | Parse, permission (absent, commented), seam, `revalidatePath("/rooms")`, typed result. |
| §1.4 raw `ZodError` never returned | `src/actions/rooms.ts:49-60` | `fieldErrors` maps `issues` onto the field map. |
| §1.5 `RoomsPage` | `src/app/(app)/rooms/page.tsx:10` | Server component, default export (framework requirement), no state. |
| §1.5 `RoomRow` | `src/app/(app)/rooms/rooms-manager.tsx:23` | |
| §1.5 `RoomsManager` | `src/app/(app)/rooms/rooms-manager.tsx:64` | Three dialogs, one `pending` flag, one error slot per dialog. Keeps no copy of the list: `rows` is a prop and every mutation ends in `router.refresh()`. |
| §2 no `PermissionGate`, no `canManageRooms` | — | Neither is imported or called by any of the ten files. `grep -rn "PermissionGate\|canManageRooms" src/actions src/app src/lib` returns exactly two lines: `src/actions/rooms.ts:75`, which is prose inside the step-3 comment saying the guard must *not* go there, and `src/lib/auth/permissions.ts:33`, the untouched definition. No import of either exists. |
| §2 step-3 comment naming what is absent | `src/actions/rooms.ts:72`, `:98`, `:122` | Each names the rank check, out-of-scope item 5, and the AUT group, on the line where the check belongs. |

## Deviations from the design

Two, both naming rather than behaviour. Neither changes a signature's parameters, its return shape,
or a selector.

1. **`deleteRoom`'s success payload is given a name.** §1.4 writes the return type inline as
   `RoomActionResult<{ id: string; seatsDeleted: number; devicesDetached: number }>`. It is
   implemented as `RoomActionResult<DeleteRoomData>` with
   `export type DeleteRoomData = { id: string; seatsDeleted: number; devicesDetached: number }` at
   `src/actions/rooms.ts:29` — the same three fields with the same types, structurally identical.
   The alias exists because `src/actions/rooms.ts` carries `"use server"`, and an inline object type
   in that position was the one shape a client caller could not name when it needed to hold the
   result. No field name is invented: all three come from §1.1's `DeleteRoomOutcome` and §1.4.

2. **One shared `gridDimensionSchema` instead of the rule written twice.** §1.3 shows `gridWidth`
   and `gridHeight` each as `z.number().int().min(1).max(200)`. They are implemented as two
   references to one non-exported `gridDimensionSchema` (`src/lib/validation/room.ts:33`) carrying
   exactly those rules. This is the same argument §1.3 makes for extracting `roomNameSchema` —
   duplicated rules drift — applied to the pair beside it. The parsed shape is unchanged.

Everything else is as specified, including the two §1.3 behaviours called out as non-incidental:
`.trim()` before `.min(1)`, and `z.coerce.number()` deliberately not used.

One clarification, not a deviation. §1.3 says the client coerces with `Number(value)` "and lets
`z.number()` reject `NaN`", because `z.coerce.number()` "turns `""` into `0`". `Number("")` is also
`0`, so an empty grid input reaches the schema as `0` on this path too and is refused by `.min(1)`
rather than by the `NaN` check. The observable behaviour is what AC-3 and AC-13 require either way —
no room created, a message against the offending dimension — and the schema is written as §1.3
specifies. It is written down here because the reason given in §1.3 does not survive inspection even
though its conclusion does, and a reader who checks it should find the discrepancy already noted.

## Invariants

| ID | Still holds because |
|----|---------------------|
| `INV-01` | A seat has at most one occupant. Occupancy is `Seat.occupantId`, a field of the seat object the cascade splices out of the store (`src/lib/data/mock/rooms.ts:86-93`), so an occupancy row cannot outlive its seat — a partial cascade is not expressible against this representation. Nothing in this ticket assigns an occupant, so no path can produce a second one. `Member` rows are never read or written: deleting a seat destroys an occupancy, not a person. |
| `INV-04` | A seat has at most one primary device. No code here sets `rank` to `PRIMARY`; the only write to `rank` is the downgrade at `src/lib/data/mock/rooms.ts:77`. After the cascade no device references a destroyed seat at all, so there is no seat left for a second primary to be counted against. |
| `INV-05` | A primary device is owned by its seat's occupant. The failure this could produce is a device still flagged `PRIMARY` while pointing at a deleted seat whose occupant is gone — unrepairable, because the seat no longer exists to name a correct owner. `deleteRoom` detaches *before* it deletes (devices at `:73-80`, seats at `:84-91`), so that state is never written. `ownerId` is left untouched, which is correct: an unassigned device may still be owned (INV-07). |
| `INV-06` | Primary downgrades on occupant exit. Deleting a seat is the most complete occupant exit there is, and the write path INV-06 requires exists at `src/lib/data/mock/rooms.ts:77`: every device whose `seatId` is in the doomed set is set to `rank: "SECONDARY"`, unconditionally, including one that was already secondary. Verified: the fixture's `dev-01` and `dev-03` are `PRIMARY` on room-a seats and both come back `SECONDARY`. |
| `INV-07` | Devices may exist unassigned. `deleteRoom` sets `seatId: null` and leaves the device in the store; no path in this ticket removes a device from `devices`. `listUnassignedDevices` is what makes that resting state a first-class query rather than a leak, and it now reads the store, so it sees the detached devices. |
| `INV-10` | No two seats overlap within a room. This ticket places no seat and cannot itself produce an overlap. What it can do is hand `LAY` a coordinate space in which no placement is well defined, and `gridDimensionSchema` (`src/lib/validation/room.ts:33`) is the mechanism that stops it: `.int().min(1).max(200)` on both dimensions, enforced in the server action before the seam is reached, so a room with a zero, negative or fractional grid is never created. AC-4 keeps the dimensions out of the rename path, so an existing room's grid cannot be resized under placed seats either. |
| `INV-11` | Deleting a room deletes its seats, destructively, behind a confirmation naming the count. Two mechanisms, and the invariant needs both. The cascade is in the seam (`src/lib/data/mock/rooms.ts:65`), where no caller can forget it or get between its writes. The guard is the confirmation dialog, and the number it names comes from `countSeatsInRoom` — the seam's own answer, read at page render and passed down as `RoomRow.seatCount`, never computed in the client. Because the guard is a UI element and a UI affordance is never sufficient on its own, `deleteRoom` also *returns* `seatsDeleted`, which gives R8 and QA a non-UI place to assert the cascade happened. Nothing is written until the confirm control is pressed: `closeDelete` (`src/app/(app)/rooms/rooms-manager.tsx:157`) only clears state, which is AC-7. **The third mechanism is the one the first version lacked: the destruction holds on *every* seam read path, not only the ones this ticket calls.** It is held by `src/lib/data/mock/store.ts:36,39,41` aliasing the fixture arrays rather than cloning them, so there is exactly one array per collection and a module cannot be forgotten during a repoint — there is nothing to repoint. Verified by execution, not by reading: after `deleteRoom("room-a")`, `layout.getRoomLayout("room-a")` is `null` and `layout.listRoomLayouts()` no longer contains `room-a`, with `mock/layout.ts` unedited and still importing `../fixtures`. |

No invariant violation was found. RULE-07 did not fire.

## Verification run

| Command | Exit | Notes |
|---------|------|-------|
| `pnpm typecheck` | 0 | `tsc --noEmit`, `strict` plus `noUncheckedIndexedAccess` and `verbatimModuleSyntax`. |
| `pnpm lint` | 0 | `eslint .`. No `eslint-disable` was added anywhere; the `no-restricted-imports` rule enforcing RULE-02 is untouched. |
| `pnpm test` | 0 | 37 tests, 2 files. `tests/unit/seam-parity.test.ts` passes unedited — it is the check that the four new names and their arities match on both sides. |
| `pnpm build` | 0 | Run beyond the gate, because §1.4 puts exported types in a `"use server"` module and typecheck alone would not catch a Next.js restriction on that. It compiles; `/rooms` builds. The two Better Auth warnings in the log are pre-existing and unrelated. |
| `git diff --name-only` subset of `allowed_paths` | yes | Ten files under `src/**`, every one enumerated in §5. `prisma/schema.prisma` also appears and predates this stage (see Files touched). |

The mock write path was additionally exercised end to end through a throwaway script run with `tsx`,
outside `tests/**` and deleted afterwards, because leaving it would have written QA's file. What it
confirmed, against the real fixture set: `countSeatsInRoom("room-a")` is **6**; a duplicate `ROOM-A`
is refused with `DUPLICATE_CODE` and no room is added; creating `R-101` mints a uuid and reports 0
seats; renaming leaves `code`, `gridWidth` and `gridHeight` intact and a missing id returns `null`;
`deleteRoom("room-a")` returns `{ deleted: true, seatsDeleted: 6, devicesDetached: 3 }`, after which
`listRooms` holds only `ROOM-B` and `R-101`, `listSeats` holds only the six room-b seats, and
`dev-01`, `dev-02` and `dev-03` are all `seatId: null` with `rank: "SECONDARY"` while `dev-04` and
`dev-05` are untouched; a second delete of the same id returns `NOT_FOUND`; deleting the seatless
`R-101` returns `seatsDeleted: 0`. That is AC-2, AC-4, AC-5, AC-12 and AC-14 at the seam, and the
`seatsDeleted: 6` is the number Q7 is asking about. **These are observations, not tests.** Nothing
was left behind and no AC is covered until QA writes it.

The same script was re-run after the store change, extended to the two modules R8 turned on, and it
is the evidence for the R8 fix rather than an argument for it:

| Read path | Before the delete | After `deleteRoom("room-a")` |
|---|---|---|
| `rooms.listRooms()` | `ROOM-A, ROOM-B` | `ROOM-B, R-101` |
| `seats.listSeats()` | 12 seats | the six `seat-b-*` only |
| `layout.getRoomLayout("room-a")` | `ROOM-A` with 6 seats | **`null`** |
| `layout.listRoomLayouts()` | `room-a, room-b` | `room-b` and the created room; **no `room-a`** |
| `devices.listUnassignedDevices()` | `dev-05` | `dev-01, dev-02, dev-03, dev-05` |
| `requests.listRequests()` | `req-01 -> room-a/seat-a-03` | unchanged — Q8, and see open question 2 |

`mock/layout.ts` is unedited and still imports `../fixtures`. That is the point of the alias rather
than a loose end: it observes the cascade because there is only one array to observe.

## Testability contract

Every `data-testid` in design section 6. Three come from shared components that were used unchanged,
and their line is in the component rather than in this ticket's files.

| `data-testid` | Exists at |
|---------------|-----------|
| `rooms-page` | `src/app/(app)/rooms/page.tsx:17` |
| `rooms-table` | `src/components/shared/DataTable.tsx:29`, via `testIdPrefix="rooms"` at `src/app/(app)/rooms/rooms-manager.tsx:186` |
| `rooms-empty` | `src/components/shared/DataTable.tsx:25`, same prefix |
| `rooms-row-<code>` | `src/components/shared/DataTable.tsx:39`, keyed by `rowKey={(r) => r.room.code}` at `src/app/(app)/rooms/rooms-manager.tsx:185` |
| `rooms-row-<code>-code` | `src/app/(app)/rooms/rooms-manager.tsx:193` |
| `rooms-row-<code>-name` | `src/app/(app)/rooms/rooms-manager.tsx:198` |
| `rooms-row-<code>-grid` | `src/app/(app)/rooms/rooms-manager.tsx:205` — renders `{gridWidth} x {gridHeight}` |
| `rooms-row-<code>-edit` | `src/app/(app)/rooms/rooms-manager.tsx:222` |
| `rooms-row-<code>-delete` | `src/app/(app)/rooms/rooms-manager.tsx:233` |
| `rooms-create-open` | `src/app/(app)/rooms/rooms-manager.tsx:174` |
| `room-create-dialog` | `src/components/shared/EntityFormDialog.tsx:35`, via `testIdPrefix="room-create"` at `src/app/(app)/rooms/rooms-manager.tsx:249` |
| `room-create-name` | `src/app/(app)/rooms/rooms-manager.tsx:253` |
| `room-create-name-error` | `src/app/(app)/rooms/rooms-manager.tsx:254` → `FieldError` at `:47` |
| `room-create-code` | `src/app/(app)/rooms/rooms-manager.tsx:258` |
| `room-create-code-error` | `src/app/(app)/rooms/rooms-manager.tsx:259` → `FieldError` at `:47` |
| `room-create-grid-width` | `src/app/(app)/rooms/rooms-manager.tsx:263` |
| `room-create-grid-width-error` | `src/app/(app)/rooms/rooms-manager.tsx:264` → `FieldError` at `:47` |
| `room-create-grid-height` | `src/app/(app)/rooms/rooms-manager.tsx:268` |
| `room-create-grid-height-error` | `src/app/(app)/rooms/rooms-manager.tsx:269` → `FieldError` at `:47` |
| `room-create-submit` | `src/components/shared/EntityFormDialog.tsx:42`, same prefix |
| `room-create-cancel` | `src/components/shared/EntityFormDialog.tsx:39`, same prefix |
| `room-edit-dialog` | `src/components/shared/EntityFormDialog.tsx:35`, via `testIdPrefix="room-edit"` at `src/app/(app)/rooms/rooms-manager.tsx:279` |
| `room-edit-name` | `src/app/(app)/rooms/rooms-manager.tsx:290` |
| `room-edit-name-error` | `src/app/(app)/rooms/rooms-manager.tsx:292` → `FieldError` at `:47` |
| `room-edit-submit` | `src/components/shared/EntityFormDialog.tsx:42`, same prefix |
| `room-edit-cancel` | `src/components/shared/EntityFormDialog.tsx:39`, same prefix |
| `room-delete-dialog` | `src/app/(app)/rooms/rooms-manager.tsx:301` |
| `room-delete-message` | `src/app/(app)/rooms/rooms-manager.tsx:304` |
| `room-delete-seat-count` | `src/app/(app)/rooms/rooms-manager.tsx:317` |
| `room-delete-confirm` | `src/app/(app)/rooms/rooms-manager.tsx:333` |
| `room-delete-cancel` | `src/app/(app)/rooms/rooms-manager.tsx:323` |

All 31 present. Three notes for whoever reads this before QA does:

- **`room-delete-seat-count` is a bare integer, always**, including `0`. The sentence lives in
  `room-delete-message` and adapts: at `0` it says no seats will be lost (AC-5), otherwise it says
  every seat is deleted with the room (AC-6). The number is never parsed out of the sentence.
- **The `-error` elements are absent until their field is rejected**, so a submission with two blank
  fields renders exactly two of them. Assert on the specific ones, not on a count.
- **AC-14 has no selector and is not supposed to.** Devices appear on no surface here. It is a seam
  assertion: call `deleteRoom` and read the device back.

## Open questions

Item 1 is resolved this cycle and kept for the citation trail; items 2 to 5 are open and none blocks
review.

1. **RESOLVED — `mock/layout.ts` not seeing the cascade.** This was open question 1 in the first
   version of this log, it became the R8 failure in `04-review.md`, and design version 3 closed it by
   aliasing rather than cloning in `src/lib/data/mock/store.ts`. `getRoomLayout` and
   `listRoomLayouts` now observe the delete with `mock/layout.ts` untouched. Kept here rather than
   deleted because `04-review.md` and `ticket.yaml` both cite it. Worth recording that the judgement
   the first version made — name it, do not edit outside `allowed_paths` — is what routed it to a
   human and got the design changed; the fix that eventually landed was not the one either the log or
   the review proposed.
2. **`mock/requests.ts` keeps a request pointing at a destroyed room, and this is now `ba`'s Q8.**
   `req-01` names `seat-a-03` and `room-a`; after the delete it still does. The alias did not change
   this and neither would repointing `requests.ts`, because nothing writes the requests array —
   confirmed in the table above. The real question is whether the cascade should null `seatId` on
   requests naming a destroyed seat, which `prisma/schema.prisma`'s `SeatRequest.seat ... onDelete:
   SetNull` would do in a database. That is cascade semantics with no acceptance criterion behind it,
   so `02-design.md` version 3 sent it to `ba` as Q8 rather than inventing it. It blocks neither gate,
   and no invariant covers it — a seat request is not the subject of any of INV-01 through INV-11.
3. **`NOT_FOUND` from `renameRoom` and `deleteRoom` has no element in section 6.** It is rendered as
   plain text with no `data-testid` (`src/app/(app)/rooms/rooms-manager.tsx:294` and `:321`) rather
   than pushed into `room-edit-name-error`, which is specified as a message *against the name* and
   would have mislabelled it. No AC covers the case — it needs a room to vanish between render and
   submit, which nothing in this ticket can cause — so QA is not blocked. If it should be
   assertable, section 6 needs a row.
4. **A `VALIDATION` failure on `id` maps to no field.** `updateRoomSchema` and `deleteRoomSchema`
   validate `id`, but `id` is not a `RoomFieldName`, so `fieldErrors` returns `{}` and the dialog
   shows nothing. `id` always comes from a rendered row, never from a user, so this is unreachable
   through the UI; it is written down because the contract's error union has no shape that could
   express it and a reviewer will notice the gap.
5. **Q6 and Q7 are still open with `ba`**, exactly as `02-design.md` section 0.2 left them, and both
   block `/qa`. The observation that may settle Q7 is in the Verification run above: the fixture
   rooms hold **six** seats each, and `deleteRoom("room-a")` reports `seatsDeleted: 6`. AC-6 as
   written asks for a three-seat room, and none exists. That is `ba`'s call under RULE-14, not this
   stage's, and it did not affect a single line of code — which is why DESIGN was right that it does
   not block `/implement`.

## Changelog

- `2026-08-12T16:45:54Z` — all sections, initial version. Ten files under `src/**` implementing
  `02-design.md` version 2. Gate PASS on typecheck, lint, test and build. Two naming deviations
  declared, five open questions raised, the first of which named the `mock/layout.ts` divergence and
  declined to fix it outside `allowed_paths`. REVIEW then failed R8 on INV-11 against exactly that
  divergence and escalated to a human under RULE-07; `rework_count` was not incremented and this
  ticket never entered REWORK.
- `2026-08-21T03:51:08Z` — sections *Files touched* (the `store.ts` row), *Invariants* (the INV-11
  row), *Verification run* and *Open questions*, plus the header. Raised by a human, who resolved the
  R8 escalation by re-running `/design` rather than by ruling on the invariant. Amended by
  `developer`. **One line of code changed:** `src/lib/data/mock/store.ts` re-exports the `fixtures.ts`
  arrays instead of cloning them (`:36`, `:39`, `:41`), per `02-design.md` version 3 section 3 — one
  array per collection, so no seam module can diverge and `mock/layout.ts` observes the cascade
  unedited. No other file changed, no file was added to `allowed_paths`, no signature or `data-testid`
  moved, and `size` stays `M`. Open question 1 is resolved; open question 2 is restated as `ba`'s Q8.
  Everything the first version recorded about the contract, the permission model, the selectors and
  the other four invariants stands unaltered and was re-verified, not assumed: typecheck, lint, test
  and build were all re-run to exit 0 and the seam was re-executed across five read paths.
