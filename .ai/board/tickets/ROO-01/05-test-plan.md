---
ticket: ROO-01
stage: QA
agent: qa
produced_at: 2026-08-21T17:04:00Z
inputs_read: [ .ai/board/tickets/ROO-01/01-story.md, .ai/board/tickets/ROO-01/02-design.md#6, .ai/board/tickets/ROO-01/02-design.md#6.1, .ai/board/tickets/ROO-01/ticket.yaml, .ai/board/tickets/ROO-01/99-questions.md, .ai/standards/testing-standards.md, .ai/standards/session-model.md, .ai/01-operating-model.md, tests/e2e/smoke.spec.ts, tests/unit/seam-parity.test.ts, tests/unit/permissions.test.ts ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: DONE
---

# ROO-01 — Room CRUD UI — test plan (third QA pass)

`src/**` was not read (RULE-05). Every selector comes from `02-design.md` section 6 and every seam
call from section 6.1; nothing else was used. `04-review.md` was not read.

**What changed since the second pass.** One thing. Q12 was answered by `ba` with resolution (a) and
amended into `01-story.md` at `2026-08-21T10:12:00Z`: AC-14's control clause no longer names fields,
and now reads "`dev-04` is unchanged in every respect — still assigned to the same seat, with no
field of it altered". The test that asserted the withdrawn `still primary` half is amended to match
and is renamed accordingly. `consulted` is empty this pass because no question was raised — every
question from the first two passes is answered and closed.

The suite is otherwise the second pass's, unchanged: ten e2e tests in `rooms.spec.ts`, six in
`smoke.spec.ts`, eight unit tests in `rooms.test.ts`.

## Coverage map

Ten criteria are live. AC-8 to AC-11 are withdrawn and their numbers retired.

| AC | Test name | Level | Selectors / seam calls used |
|---|---|---|---|
| AC-1 | `AC-1: every room the system holds is listed, with a control to create one` | e2e | `rooms-page`, `rooms-table`, `rooms-create-open`, `rooms-empty`, `rooms-row-<code>`, `-name`, `-code` |
| AC-2 | `AC-2: a room is created from all four of its required fields` | e2e | `rooms-create-open`, `room-create-dialog`, the four inputs, `room-create-submit`, `rooms-row-<code>`, `-name`, `-code`, `-grid` |
| AC-3 | `AC-3: creation is refused when a required field is missing or blank` | e2e | the four inputs, all four `-error` testids, `room-create-cancel` |
| AC-4 | `AC-4: an existing room is renamed, and nothing else about it changes` | e2e | `rooms-row-<code>-edit`, `room-edit-dialog`, `room-edit-name`, `room-edit-submit`, `rooms-row-<code>-name`, `-code`, `-grid` |
| AC-4 | `AC-4 (refusal): a rename to a blank name is refused` | e2e | `room-edit-name`, `room-edit-name-error`, `room-edit-cancel` |
| AC-5 | `AC-5: a room containing no seats is deleted, after a confirmation naming zero` | e2e | `rooms-row-<code>-delete`, `room-delete-dialog`, `-message`, `-seat-count`, `-confirm` |
| AC-6 | `AC-6: the confirmation names the seat count, and nothing is destroyed until it is confirmed — INV-11` | e2e | `rooms-row-<code>-delete`, `room-delete-dialog`, `-message`, `-seat-count`, `-cancel` |
| AC-6 | `AC-6: confirming the delete destroys the room and all N of its seats` | unit | `rooms.listRooms()`, `rooms.deleteRoom(id)` → `deleted`, `seatsDeleted` |
| AC-6 | `AC-6: the deleted room no longer appears, and no other room is affected` | unit | `rooms.listRooms()` |
| AC-6 | `AC-6: the deletion cannot be undone from this surface` | unit | the `rooms` namespace's exported names |
| AC-7 | `AC-7: deletion is not performed until it is confirmed` | e2e | `rooms-row-<code>-delete`, `room-delete-dialog`, `-seat-count`, `-cancel`, `rooms-row-<code>` |
| AC-12 | `AC-12: creation is refused when the code is already in use` | e2e | `room-create-code`, `room-create-code-error`, `room-create-submit`, `room-create-cancel` |
| AC-13 | `AC-13: creation is refused when a grid dimension is not a positive whole number` | e2e | `room-create-grid-width`, `-height`, and their two `-error` testids |
| AC-14 | `AC-14: a primary device on a destroyed seat survives, unassigned and not primary` | unit | `devices.listDevices()` → `id`, `seatId`, `rank` |
| AC-14 | `AC-14: a device assigned to a seat in a different room is untouched` | unit | `devices.listDevices()` |
| AC-14 | `AC-14: the cascade detaches devices and destroys none — INV-07` | unit | `devices.listDevices()` |
| AC-14 | `AC-14: every device the cascade detached was on a seat in the deleted room` | unit | `devices.listDevices()`, `deleteRoom` → `devicesDetached` |
| AC-14 | `AC-14: no surviving device points at a seat that no longer exists — INV-04, INV-05` | unit | `devices.listDevices()` |

Every live AC has at least one named test. No AC is unmapped.

## AC-14's control, after Q12

The control test is renamed from *a **primary** device on a seat in a different room is untouched* to
*a device assigned to a seat in a different room is untouched*, because the story no longer claims a
rank for it. What the test asserts is unchanged in substance and stronger than the clause it
replaces:

- **The Given is still asserted, not assumed** — `dev-04.seatId` is non-null before the delete. That
  is the half of the Given the seed does have, and dropping it would leave a control that could pass
  against an already-unassigned device while distinguishing nothing.
- **The Then is deep equality against the pre-delete snapshot.** AC-14 names no field on purpose, and
  `toEqual(before)` fails if any field moves — including one the story never thought to name. The
  explicit `seatId` assertion after it exists so the failure message names the clause AC-14 does
  state in words, "still assigned to the same seat".

The withdrawn assertion was `dev-04.rank === "PRIMARY"`, and it was unsatisfiable by construction:
the only two devices that were assigned *and* primary before the delete are `dev-01` and `dev-03`,
and the cascade detaches both, so no device in the seed is both primary and seated outside `ROOM-A`.
That evidence is in `99-questions.md` under Q12 and it is what closed resolution (c).

## Why AC-6 is split across two levels

AC-6 is the INV-11 criterion and the only one on this ticket that both destroys seeded data and is
specified through the UI. It is covered by an e2e test up to the confirmation, and by unit tests
through it.

The reason is not preference. `pnpm test:e2e` drives **one** server process holding **one** mutable
store, and Playwright runs spec files in parallel against it. Confirming the delete of `ROOM-A` in
`tests/e2e/rooms.spec.ts` would destroy the rows and the seats that `tests/e2e/smoke.spec.ts` asserts
on — `rooms-row-ROOM-A`, and `seats-status-seat-a-01` and `seat-a-03`, which are `ROOM-A`'s seats.
Whichever spec lost the race would fail. Making the ordering deterministic means `workers: 1` or a
project dependency in `playwright.config.ts`, which is not in `allowed_paths`.

What the split preserves and what it costs is stated under *Residual coverage* below rather than
buried. The UI confirm path itself is exercised — by AC-5, against a room holding no seats.

## The one destructive act

`tests/unit/rooms.test.ts` calls `rooms.deleteRoom` exactly once, in a `beforeAll`, and every test in
the file asserts against snapshots taken around that call. Section 6.1: mock state is process-global
and has no reset hook, so a second delete would run against a room that is already gone. Vitest
isolates per file, so this cannot reach `seam-parity.test.ts` or `permissions.test.ts`.

The device snapshots are `structuredClone`d. The seam hands back the live fixture objects, so a
shallow snapshot would be mutated by the delete and every before/after comparison would compare a
value with itself and pass.

## How rooms are addressed

Section 6 keys rows by `code`, not by id, because ids are minted with `crypto.randomUUID()`. The e2e
suite reads the listed codes out of the `rooms-row-<code>-code` cells rather than hardcoding any
seeded identifier:

```ts
page.locator('[data-testid^="rooms-row-"][data-testid$="-code"]')
```

The `-code` suffix is unambiguous: it is lowercase and a room code matches `^[A-Z0-9-]+$`.

Four values *are* quoted rather than discovered — `ROOM-A`, six seats, `dev-01`, `dev-04` — and all
four are setup data AC-6 and AC-14 name on purpose. Seat creation and device assignment are
out-of-scope items 1 and 7, so QA cannot build that state; `fixtures.ts` is `src/**`, so it cannot
look it up. In the unit test `rooms.listRooms()` is the bridge from the code the story names to the
id `deleteRoom` takes, exactly as section 6.1 describes.

## Refusal cases

| Refusal | Test | Asserts |
|---|---|---|
| Blank or whitespace name, blank code, absent dimensions | AC-3 | four `-error` elements individually; dialog stays open; list unchanged |
| Whitespace-only code | AC-3 | `room-create-code-error`; list unchanged |
| Blank rename | AC-4 (refusal) | `room-edit-name-error`; the original name survives |
| Duplicate code | AC-12 | `room-create-code-error` containing "already in use"; list unchanged |
| Zero, negative, fractional width and height — six cases | AC-13 | the offending dimension's error each time; list unchanged |
| Delete dismissed | AC-7 | room still listed; its seat count unchanged |
| Delete not performed before confirmation | AC-6 (e2e) | the room and its six seats both survive a cancel |
| Delete cannot be undone | AC-6 (unit) | the permitted seam exposes no restore, undelete or undo |
| Cascade detaches nothing outside the deleted room | AC-14 (control) | `dev-04` deep-equal to its pre-delete snapshot |

Error elements are asserted individually, never by count: section 6 states each `-error` is absent
until its field has been rejected.

## Invariant probes

`invariants_touched` is `[INV-01, INV-04, INV-05, INV-06, INV-07, INV-10, INV-11]`.

| Invariant | Probe test | If absent, why |
|---|---|---|
| INV-01 — a seat has at most one occupant | **none** | Occupancy has no surface on this ticket and no call in section 6.1 returns one. There is no observation QA can make either way. Recorded rather than omitted. |
| INV-04 — at most one primary device per seat | `AC-14: no surviving device points at a seat that no longer exists` | Covered in the direction this ticket can break it: a device left primary with its seat destroyed is an INV-04 row that cannot be repaired. |
| INV-05 — a primary device is owned by the seat's occupant | same test | Same. A primary with no seat has no occupant to be owned by. |
| INV-06 — primary downgrades when the occupant exits | `AC-14: a primary device on a destroyed seat survives, unassigned and not primary` | Covered. Destroying the seat is the most complete occupant exit there is, and the assertion is `PRIMARY` before, `SECONDARY` after. |
| INV-07 — devices may exist unassigned | `AC-14: … survives, unassigned and not primary` and `AC-14: the cascade detaches devices and destroys none` | Covered from both sides: the detached device still exists with `seatId: null`, and no device id disappears from the ledger. |
| INV-10 — no two seats overlap within a room | `AC-13` | Covered. Six cases across both dimensions. A room cannot be created with a grid in which no placement is well defined. |
| INV-11 — deleting a room deletes its seats behind a confirmation naming how many | `AC-6` (e2e) and `AC-6: confirming the delete destroys the room and all N of its seats` (unit) | Covered on both halves: the confirmation names six for `ROOM-A` and nothing is destroyed until it is confirmed; the delete reports `seatsDeleted: 6` and the room is gone. The number named and the number destroyed are checked against the same story datum from opposite sides. |

Six of seven are probed. INV-01 is the one that is not, and its absence is structural rather than an
oversight — nothing on this ticket reads an occupancy.

## Fixtures

No entity is invented inline and `src/lib/data/fixtures.ts` is not imported. The suite uses:

- **Seeded room codes**, read from `rooms-row-<code>-code` in e2e and from `rooms.listRooms()` in
  unit.
- **Seat counts**, read from `room-delete-seat-count` by opening and dismissing each confirmation —
  which is AC-7's own specified behaviour — and from `deleteRoom`'s `seatsDeleted`.
- **`ROOM-A`, six, `dev-01`, `dev-04`**, quoted from AC-6 and AC-14 as setup data. Nothing is quoted
  about `dev-04` beyond its id: which seat it occupies and what rank it holds are read from
  `listDevices()` at run time and compared against themselves, which is what survived Q12.
- **Rooms the suite creates**, codes `QA-<AC>-<run>-<retry>`, matching `^[A-Z0-9-]+$`. The run
  component derives from the clock so a re-run against a reused server never collides with its own
  earlier rooms.
- **`R-101`**, named by AC-12. Created by the test if the seed does not already hold it.

## Residual coverage

Stated rather than left for someone to discover.

- **AC-6's confirm through the UI, on a room that holds seats.** Covered at the seam instead, for the
  test-isolation reason above. What is not observed is the browser round trip on a destructive
  delete: that the table re-renders without the room after a real confirm. AC-5 observes exactly that
  round trip on a room with no seats, so what is unobserved is narrowly the interaction of that
  render path with a non-zero cascade. Closing it needs `workers: 1` or a project dependency in
  `playwright.config.ts` — outside `allowed_paths`, and worth raising against the e2e harness rather
  than against this ticket.
- **INV-01.** No probe exists, per the table above.
- **`rooms-empty`.** Section 6 lists it and AC-1 asserts it is *absent*, but the state is unreachable:
  the seed always holds rooms and no test deletes them all. No AC specifies the empty state.

## Out of scope for this plan

- **Permissions and roles.** This ticket enforces no guard and no session exists. `permissions.test.ts`
  already covers `canManageRooms` and nothing here re-asserts it.
- **Seats, layout, groups, members.** Out-of-scope items 1, 2 and 7.
- **Network ports destroyed by the cascade.** Out-of-scope item 7 records this as intended and
  deliberately uncriterioned, with the condition that reverses it — a port gaining a seam read path of
  its own. There is no AC to map, and QA does not write criteria.
- **Seat requests left naming a destroyed seat.** Out-of-scope item 7, owned by `REG`.
- **Accessibility and performance.** No standard states a baseline for either.
- **`DATA_SOURCE=prisma`.** The e2e server pins `mock` and `schema_delta` is `none`.
  `seam-parity.test.ts` covers name and arity parity and is untouched.

## Selector gaps

**None**, and unlike the previous two passes there is no non-selector gap either. Section 6 and 6.1
supplied every selector and every seam call this plan needed, and Q6 to Q12 are all answered and all
of them landed in the story or the design.

## Changelog

- `2026-08-21T09:20Z` — first pass. Ten e2e tests, no unit tests. Blocked on Q10 (no seam surface for
  AC-14) and Q11 (`smoke.spec.ts` broken by the row re-key and outside `allowed_paths`).
- `2026-08-21T09:49:30Z` — second pass. Section 6.1 and the amended AC-6/AC-14 landed;
  `tests/unit/rooms.test.ts` written, `smoke.spec.ts` repaired, invariant probes went from two to six.
  Blocked on Q12, one clause of AC-14.
- `2026-08-21T17:04:00Z` — third pass. Q12 resolution (a) applied: AC-14's control test drops the
  withdrawn `still primary` assertion, keeps deep equality, and is renamed. No other test changed.
