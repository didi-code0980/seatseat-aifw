---
ticket: DEV-01
stage: QA
agent: qa
produced_at: 2026-08-23T08:06:50Z
inputs_read: [ .ai/board/tickets/DEV-01/ticket.yaml, .ai/board/tickets/DEV-01/01-story.md, .ai/board/tickets/DEV-01/02-design.md, .ai/board/tickets/DEV-01/99-questions.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# DEV-01 — test plan

## What this plan was written from, and what it was not

`01-story.md` in full, and **section 6 of `02-design.md`** — the testability contract and its two
subsections. `src/**` was not read (RULE-05), and no file under `src/` appears in `inputs_read`.
`03-impl-log.md` and `04-review.md` were not opened: a QA agent that has seen the reviewer's verdict
is testing the reviewer's conclusions rather than the story.

**One pointer outside section 6 was followed, and it is declared rather than left implicit.** Section
6.1 says of the seam's refusal codes: *"The exact reason strings are in section 1.1 and are part of
the contract — assert on them by value."* Section 6 therefore incorporates the type block in section
1.1 by reference, and the union members quoted in `tests/unit/devices.test.ts`
(`OWNER_IS_NOT_OCCUPANT`, `SEAT_HAS_NO_OCCUPANT`, `NOT_ASSIGNED`, `PRIMARY_OWNER_MUST_BE_OCCUPANT`,
`DUPLICATE_ASSET_TAG`) were read there. Nothing else in sections 0 to 5 or 7 was read.

`ticket.yaml` and `99-questions.md` were read for state and routing, not for behaviour. Neither
supplied an acceptance criterion.

## What the seed is, and why this plan never names it

`01-story.md` warns that AC-7 through AC-11 cannot construct their own Given from the seed, and A-5
records the seat composition as an inference from counts rather than a fact. `02-design.md` section
6.2 resolves this: every Given is reachable through the surface itself, and the seat picker's option
label — `<SEAT-CODE> (<ROOM-CODE>) — <occupant full name>`, or `— no occupant` — is what makes an
occupied seat and a vacant one identifiable without disclosing a fixture.

**Both suites are written to that rule and neither quotes a seeded identifier.** Members come from
the owner picker, seats from the assign picker, and every device asserted on is one the test created.
This is stricter than `tests/unit/rooms.test.ts`, which quotes `ROOM-A`, `dev-01` and `dev-04`
because `01-story.md` for ROO-01 named them as setup data. DEV-01's story names none, so this plan
quotes none.

## Coverage map

Every AC maps to at least one named test, and every test name contains its AC ID.

| AC | Test name | Level | Selectors used |
|---|---|---|---|
| AC-1 | `AC-1: every device is listed with its owner, its seat, its designation and that seat's occupant` | e2e | `devices-page`, `devices-table`, `devices-empty`, `devices-create-open`, `devices-row-<tag>`, `-tag`, `-model`, `-owner`, `-seat`, `-rank`, `-occupant` |
| AC-2 | `AC-2: a device is created into unassigned inventory, owned by the member chosen` | e2e | `devices-create-open`, `device-create-dialog`, `device-create-tag`, `device-create-model`, `device-create-owner`, `device-create-submit`, `devices-row-<tag>`, `-tag`, `-model`, `-owner`, `-seat`, `-rank` |
| AC-2 | `AC-2: the new device is listed, owned by the member chosen, unassigned and not primary` | unit | `createDevice`, `listDevices`, `listUnassignedDevices` (6.1) |
| AC-3 | `AC-3: creation is refused when a required field is missing or blank` | e2e | `device-create-tag-error`, `device-create-model-error`, `device-create-owner-error`, `device-create-dialog`, `device-create-cancel` |
| AC-4 | `AC-4: an existing device's attributes are changed, and its seat and designation are not` | e2e | `devices-row-<tag>-edit`, `device-edit-dialog`, `device-edit-tag`, `device-edit-model`, `device-edit-submit`, row cells |
| AC-4 | `AC-4: the new value is stored, and seat, designation and device count are untouched` | unit | `updateDevice`, `listDevices` (6.1) |
| AC-5 | `AC-5: assigning an unassigned device lands it secondary, and leaves the seat's primary alone — INV-04` | e2e | `devices-row-<tag>-assign`, `-unassign`, `device-assign-dialog`, `device-assign-seat`, `device-assign-submit`, `-seat`, `-rank`, `-owner` |
| AC-5 | `AC-5: assignment does not confer primacy, and does not disturb the seat's existing primary` | unit | `assignDeviceToSeat`, `designatePrimaryDevice`, `listDevices` (6.1) |
| AC-6 | `AC-6: unassigning returns a device to inventory and strips its primary designation — INV-07, INV-04` | e2e | `devices-row-<tag>-unassign`, `-seat`, `-rank`, `-owner`, `-occupant` |
| AC-6 | `AC-6: a PRIMARY device unassigned keeps existing, loses its seat and loses its rank` | unit | `unassignDevice`, `listDevices` (6.1) |
| AC-7 | `AC-7: designating a primary demotes the incumbent — INV-04, INV-05` | e2e | `devices-row-<tag>-primary`, `-rank`, `-seat`, `-owner`, `device-assign-seat` labels |
| AC-7 | `AC-7: designating the second demotes the first, and touches no other seat` | unit | `designatePrimaryDevice` incl. `demotedDeviceId` (6.1) |
| AC-8 | `AC-8: designation is refused when the owner is not the seat's occupant — INV-05` | e2e | `devices-row-<tag>-primary`, `devices-action-error`, `-rank`, `-owner`, `-occupant` |
| AC-8 | `AC-8: refused with OWNER_IS_NOT_OCCUPANT, and nothing moves` | unit | `designatePrimaryDevice` reason (6.1 → 1.1) |
| AC-9 | `AC-9: designation is refused for a device assigned to no seat — INV-04, INV-05` | e2e | `devices-row-<tag>-primary`, `devices-action-error`, `-seat`, `-rank` |
| AC-9 | `AC-9: refused with NOT_ASSIGNED, the device stays unassigned, the list is otherwise unchanged` | unit | `designatePrimaryDevice` reason (6.1 → 1.1) |
| AC-10 | `AC-10: designation is refused when the seat has no occupant, and not for AC-8's reason — INV-05` | e2e | `devices-row-<tag>-primary`, `devices-action-error`, `-occupant`, `-rank`, `-seat` |
| AC-10 | `AC-10: refused with SEAT_HAS_NO_OCCUPANT, not with AC-8's reason` | unit | `designatePrimaryDevice` reason (6.1 → 1.1) |
| AC-11 | `AC-11: the owner of a seat's primary device may not become a non-occupant — INV-05` | e2e | `devices-row-<tag>-edit`, `device-edit-owner`, `device-edit-owner-error`, `device-edit-submit`, `device-edit-cancel`, `-owner`, `-rank` |
| AC-11 | `AC-11: refused with PRIMARY_OWNER_MUST_BE_OCCUPANT, and the device is still primary and still owned by the occupant` | unit | `updateDevice` reason (6.1 → 1.1) |
| AC-11 | `AC-11: the same edit is accepted once the device is no longer the seat's primary` | unit | `updateDevice`, `unassignDevice` (6.1) |
| AC-12 | `AC-12: a device in inventory is deleted, behind a confirmation` | e2e | `devices-row-<tag>-delete`, `device-delete-dialog`, `device-delete-message`, `device-delete-seat`, `device-delete-confirm` |
| AC-12 | `AC-12: the device is gone, it was primary of no seat, and no other device is affected` | unit | `deleteDevice` incl. `wasPrimaryOfSeatId` (6.1) |
| AC-13 | `AC-13: deleting a seat's primary device names the seat, and leaves the seat with none — INV-04` | e2e | `device-delete-seat`, `device-delete-message`, `device-delete-confirm`, `-rank`, `-seat`, `-owner`, `-occupant` |
| AC-13 | `AC-13: the outcome names the seat, the seat ends with no primary, and the seat's other devices are intact` | unit | `deleteDevice`, `listSeats` (6.1) |
| AC-14 | `AC-14: deletion is not performed until it is confirmed` | e2e | `devices-row-<tag>-delete`, `device-delete-dialog`, `device-delete-cancel`, row cells |

Fourteen criteria, twenty-six tests. Nine of the fourteen are covered from both sides — the seam
proves the state transition, the surface proves a person can reach it and see it. AC-1, AC-3 and
AC-14 are e2e only and the reason is in each case the same: they are assertions about what is
rendered and what a dialog does, and section 6.1's seam surface has nothing to say about either.

## Refusal cases

Eight of the fourteen criteria are refusals, and they carry sixteen of the twenty-six tests. A suite
with no refusal tests passes when the check is deleted, and here the checks *are* the invariants —
`01-story.md` says four of the eight refusals are INV-04 or INV-05 stated as a behaviour.

| Refusal | Where it is asserted | What deleting the check would do |
|---|---|---|
| Blank or missing create field (AC-3) | e2e, three `-error` elements plus a whitespace-only pass | a device with an empty asset tag or no owner |
| Primary designation on a foreign-owned device (AC-8) | seam reason string, and `devices-action-error` | INV-05 violated in one move |
| Primary designation with no seat (AC-9) | seam `NOT_ASSIGNED`, and the row staying `n/a` | a primary device INV-04 and INV-05 cannot be evaluated against |
| Primary designation on a vacant seat (AC-10) | seam `SEAT_HAS_NO_OCCUPANT`, plus a message that differs from AC-8's | INV-05 violated, and INV-06's downgrade left nothing coherent to act on |
| Owner change out from under a primary (AC-11) | seam `PRIMARY_OWNER_MUST_BE_OCCUPANT`, and `device-edit-owner-error` | INV-05 violated in two moves rather than one |
| Delete before confirmation (AC-12, AC-13) | the row still present with the dialog open | data loss one mis-click away |
| Delete after dismissal (AC-14) | the row and all three of its fields unchanged | the same, with the cancel button lying |

**Two of these are asserted more sharply than "it was refused".**

`AC-10` asserts that the message it raises is **not the same string** as the one AC-8 raises. This is
the plan's answer to the defect `01-story.md` says lives here: *the owner does not match the
occupant* and *there is no occupant to match* are the same refusal only if the comparison treats an
absent occupant as a non-match. A single shared message makes the two indistinguishable from outside
the system, which is how that bug survives a passing suite. At the seam the same distinction is made
by reason code.

`AC-11` carries a **control** — `AC-11: the same edit is accepted once the device is no longer the
seat's primary`. Without it the criterion is satisfied by an `updateDevice` that refuses every owner
change, which is a different behaviour and a wrong one, since AC-4 requires the edit to work.

## Invariant probes

For each ID in `invariants_touched`.

| Invariant | Probe test | If absent, why |
|---|---|---|
| INV-04 — at most one primary device per seat | `INV-04: no seat holds more than one primary device, after every act above` (unit), and the per-seat count inside `AC-7` and `AC-13` (e2e) | present |
| INV-05 — a seat's primary device is owned by that seat's occupant | `INV-05: every primary device is owned by the occupant of the seat it sits on` (unit), swept over every device the store holds after every act in the file; reached from both directions by AC-8/AC-10 and AC-11 | present |
| INV-06 — an occupant exit downgrades that seat's primary | `INV-04, INV-06: no device carries a primary designation without a seat to hold it` (unit) | **Partial, and deliberately so.** DEV-01 builds no occupant-exit path — out-of-scope items 2 and 7 — so the downgrade itself is not reachable from anything this ticket ships and cannot be tested here. `01-story.md` calls DEV-01's obligation to INV-06 *negative*: do not create a state the downgrade cannot find or cannot act on coherently. That negative obligation is what the probe asserts, together with AC-6 and AC-10. The positive direction belongs to the `SEA` or `REG` ticket that ends occupancy. |
| INV-07 — devices may exist unassigned in inventory | `INV-07: inventory is a state a device can be in, and it is exactly the set with no seat` (unit), plus AC-2, AC-6 and the re-keyed INV-07 test in `tests/e2e/smoke.spec.ts` | present |

The INV-04 and INV-05 probes are **sweeps, not spot checks**: they run over every device in the
store after all sixteen unit acts have executed, so a write path that leaks a second primary or an
owner mismatch anywhere in this file is caught even if the test that caused it passed.

## Fixtures

**None are named, and that is the plan.** The template asks which fixtures from
`src/lib/data/fixtures.ts` are used; QA may not read that file, and for DEV-01 it does not need to.
`01-story.md`'s note on setup data and `02-design.md` section 6.2 between them make every Given
constructible through the surface, and both suites take that route:

| Given | How it is built |
|---|---|
| a member to own a device | read from `device-create-owner` (e2e) or `members.listMembers()` (unit) |
| a seat with an occupant | the assign picker's option label, or `seats.listSeats()` where `occupantId !== null` |
| a seat with no occupant | the label ending `— no occupant`, or `occupantId === null` |
| a device owned by the occupant | created, then pointed at the occupant through the edit dialog |
| a device owned by someone else | created owned by any other member the picker lists |
| a seat that already has a primary device | built by the test, never found |

That last row is the one worth stating twice. `02-design.md` section 6.2 forbids the e2e suite from
mutating any device that was already there when it started, and demoting a seeded primary in order
to reach AC-5's or AC-7's Given would be exactly that. Both tests therefore look for an occupied seat
that holds **no** primary — the picker labels identify the occupancy, the list's `-seat` and `-rank`
cells confirm the absence — and build their own incumbent on it. **Every e2e test deletes the devices
it created**, so the surface each one leaves behind is the surface it found.

The unit file has no such constraint: vitest gives each test file its own module graph, so the store
`tests/unit/devices.test.ts` mutates is not the one `tests/unit/rooms.test.ts` mutates, and neither
reaches the e2e server.

## `tests/e2e/smoke.spec.ts` — the repair this ticket owes

`02-design.md` section 5 puts this file in `allowed_paths` because the design breaks it: rows are
re-keyed by `assetTag`, and `smoke.spec.ts:56` addressed `devices-row-dev-05`.

The obvious repair — swap the id for the seeded device's asset tag — **is not available to QA**, for
the same reason the id was: an asset tag from `fixtures.ts` is a value RULE-05 puts out of reach, and
no artifact reaching QA discloses one. The test was rewritten instead to assert over the `-seat`
cells that **at least one device in the list reports itself unassigned**, which is what INV-07
actually says and what the test was always for. It is stronger than what it replaces, not weaker: it
no longer passes by accident if the seeded device is renamed. It is also stable against
`tests/e2e/devices.spec.ts` running concurrently — that spec creates unassigned devices and deletes
what it creates, so it can add to this set but never empty it.

## Out of scope for this plan

- **`devices-empty`.** The seed holds devices, so the empty state is unreachable from outside the
  system without deleting every device — which would destroy seeded rows that `smoke.spec.ts`
  asserts on. AC-1's Given says the system holds devices, so the selector is asserted *absent* rather
  than visible, and the empty state itself is untested. Same treatment as `rooms-empty` on ROO-01.
- **The duplicate-asset-tag refusal.** `device-create-tag-error` is marked *pending F-1* in section 6
  and the seam carries a `DUPLICATE_ASSET_TAG` reason, but `01-story.md` has no criterion for it —
  F-1 is open and routed to `ba`. QA may not invent one (RULE-05), so nothing here tests it. See the
  test report's coverage section; this is a real behaviour with no acceptance criterion, and it stays
  that way until the story is amended.
- **Permissions.** `01-story.md` enforces no role guard and says why: the `AUT` table in
  `features.md` is empty, there is no session and no rank to compare. No test asserts a permission,
  and `tests/unit/permissions.test.ts` is untouched.
- **The database mechanisms for INV-04 and INV-05.** The partial unique index and the constraint
  trigger are a schema change and out-of-scope item 6. Under `DATA_SOURCE=mock` there is nothing to
  test them against; the seam is the only thing holding both invariants and the only thing probed.
- **Prisma parity beyond names and arity.** `tests/unit/seam-parity.test.ts` already asserts that
  both implementations export the same functions with the same arity; it is not in this ticket's
  `allowed_paths` and was not modified. No test executes the Prisma path — there is no database in
  this run.
- **Accessibility, performance, and visual design.** Nothing in the story turns on them.
- **Device ergonomics and history.** Out-of-scope items 9 and 10.

## Selector gaps

**None.** Every control the fourteen criteria need is in section 6, including the three that were
easy to omit and are not: `devices-row-<tag>-primary` present on unassigned rows (without it AC-9's
refusal is unreachable and the criterion could only assert a missing button), `devices-action-error`
for refusals raised with no form open, and `device-delete-seat` as a bare code rather than a phrase
to be parsed out of `device-delete-message`.

Two format contracts in section 6 were relied on and both held: the seat option label, and the three
literals `unassigned`, `no occupant` and `n/a`. Nothing was raised with `tech-lead-design`, and
`consulted` is empty.
