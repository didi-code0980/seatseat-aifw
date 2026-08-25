---
ticket: SEA-01
stage: QA
agent: qa
produced_at: 2026-08-24T10:45:00Z
inputs_read: [ .ai/board/tickets/SEA-01/01-story.md, .ai/board/tickets/SEA-01/02-design.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# SEA-01 — test plan

## What this plan was written from, and what it was not

`01-story.md` in full, and **section 6 of `02-design.md`** — the testability contract and its subsections. `src/**` was not read (RULE-05), and no file under `src/` appears in `inputs_read`. `03-impl-log.md` and `04-review.md` were not opened: a QA agent that has seen the reviewer's verdict is testing the reviewer's conclusions rather than the story.

One pointer outside section 6 was followed, and is declared rather than left implicit: Section 6.1 says of the seam's refusal codes: *"The exact reason strings are in section 1.1 and the action messages are in the table in 1.4. Both are part of the contract — assert on them by value."* Section 6 therefore incorporates the refusal codes in section 1.1 by reference (`SEAT_OCCUPIED`, `SEAT_NOT_OCCUPIED`).

## What the seed is, and why this plan never names it

`01-story.md` A-5 records assumptions about the seeded fixture. `02-design.md` section 6.2 resolves this: every Given is discoverable and constructible through the surface and seam methods without hardcoding seeded identifiers.

Both suites are written to that rule and neither quotes a seeded identifier. Seats and members are discovered dynamically through `seats.listSeats()` / `members.listMembers()` or the rendered UI table and dialog options. Devices needed for AC-6, AC-7, and AC-11 are created by the tests and cleaned up afterwards.

## Coverage map

Every AC maps to at least one named test, and every test name contains its AC ID.

| AC | Test name | Level | Selectors used |
|---|---|---|---|
| AC-1 | `AC-1: every seat is listed with occupant, status, and correct action controls` | e2e | `seats-page`, `seats-table`, `seats-empty`, `seats-row-<code>`, `-code`, `-room`, `-ports`, `-occupant`, `-status`, `-assign`, `-release` |
| AC-2 | `AC-2: an occupant is assigned to a vacant seat without reloading` | e2e | `seats-row-<code>-assign`, `seat-assign-dialog`, `seat-assign-seat`, `seat-assign-occupant`, `seat-assign-submit`, `-occupant`, `-status`, `-release` |
| AC-2 | `AC-2: assigns occupant to vacant seat, updates status, and leaves other seats untouched` | unit | `seats.assignSeatOccupant`, `seats.deriveSeatStatus`, `seats.listSeats`, `members.listMembers` |
| AC-3 | `AC-3: refused with SEAT_OCCUPIED, occupant unchanged, and target member occupies no new seat` | unit | `seats.assignSeatOccupant` reason (6.1 → 1.1), `seats.listSeats` |
| AC-4 | `AC-4: one member is assigned to multiple seats without refusal — INV-02` | e2e | `seats-row-<code>-assign`, `seat-assign-dialog`, `seat-assign-occupant`, `seat-assign-submit`, `-occupant`, `-status` |
| AC-4 | `AC-4: member A is assigned to a second seat and occupies both without refusal` | unit | `seats.assignSeatOccupant`, `seats.deriveSeatStatus`, `seats.listSeats` |
| AC-5 | `AC-5: an occupant is released from a seat without reloading` | e2e | `seats-row-<code>-release`, `-occupant`, `-status`, `-assign` |
| AC-5 | `AC-5: vacates the seat, status becomes VACANT, member still exists, other seats unchanged` | unit | `seats.releaseSeatOccupant`, `seats.deriveSeatStatus`, `seats.listSeats`, `members.listMembers` |
| AC-6 | `AC-6: releasing an occupant on /seats downgrades primary device to SECONDARY on /devices — INV-06` | e2e | `seats-row-<code>-release`, `devices-create-open`, `device-create-dialog`, `device-create-tag`, `device-create-model`, `device-create-owner`, `device-create-submit`, `devices-row-<tag>-assign`, `device-assign-dialog`, `device-assign-seat`, `device-assign-submit`, `devices-row-<tag>-primary`, `devices-row-<tag>-rank`, `devices-row-<tag>-seat`, `devices-row-<tag>-owner`, `devices-row-<tag>-delete`, `device-delete-confirm` |
| AC-6 | `AC-6: primary device on the seat is downgraded to SECONDARY, remains on seat, returns downgradedDeviceId` | unit | `seats.releaseSeatOccupant` (`downgradedDeviceId`), `devices.listDevices`, `devices.createDevice`, `devices.assignDeviceToSeat`, `devices.designatePrimaryDevice` |
| AC-7 | `AC-7: primary is downgraded, secondary device remains secondary, neither deleted or detached` | unit | `seats.releaseSeatOccupant`, `devices.listDevices`, `devices.createDevice`, `devices.assignDeviceToSeat`, `devices.designatePrimaryDevice` |
| AC-8 | `AC-8: refused with SEAT_NOT_OCCUPIED, no seat changes, and no device rank changes` | unit | `seats.releaseSeatOccupant` reason (6.1 → 1.1), `seats.listSeats`, `devices.listDevices` |
| AC-9 | `AC-9: assignment is refused when no member is chosen` | e2e | `seats-row-<code>-assign`, `seat-assign-dialog`, `seat-assign-occupant`, `seat-assign-submit`, `seat-assign-occupant-error`, `seat-assign-cancel`, `-occupant`, `-status` |
| AC-10 | `AC-10: seat status is derived and never set directly across transitions — INV-03` | e2e | `seats-row-<code>-status`, action buttons check |
| AC-10 | `AC-10: deriveSeatStatus accurately reflects occupancy across multiple transitions` | unit | `seats.deriveSeatStatus`, `seats.assignSeatOccupant`, `seats.releaseSeatOccupant`, `seats.listSeats` |
| AC-11 | `AC-11: assigning new occupant leaves previous occupant's secondary devices secondary without promotion` | unit | `seats.assignSeatOccupant`, `devices.listDevices` |

Eleven criteria, seventeen tests (7 e2e, 10 unit + 4 invariant probe blocks).

## Refusal cases

| Refusal | Where it is asserted | What deleting the check would do |
|---|---|---|
| Assign to already occupied seat (AC-3) | unit seam reason `SEAT_OCCUPIED` | INV-01 violated (second occupant permitted) |
| Release a vacant seat (AC-8) | unit seam reason `SEAT_NOT_OCCUPIED` | invalid downgrade and phantom writes on empty seats |
| Submit assign with no member selected (AC-9) | e2e `seat-assign-occupant-error` | assignment of null/empty occupant or runtime crash |
| Promote foreign devices on assign (AC-11) | unit device rank assertions | INV-05 violated (primary device owned by non-occupant) |

## Invariant probes

For each ID in `invariants_touched`.

| Invariant | Probe test | If absent, why |
|---|---|---|
| INV-01 — at most one occupant per seat | `INV-01: no seat holds more than one occupant` (unit), plus AC-3 refusal | present |
| INV-02 — one person may occupy multiple seats | `INV-02: one member may occupy multiple seats concurrently` (unit), plus AC-4 (e2e & unit) | present |
| INV-03 — seat status is derived, never stored | `INV-03: status is derived and consistent across all seats` (unit), `smoke.spec.ts` INV-03 test, AC-10 | present |
| INV-04 — at most one primary device per seat | AC-6, AC-7, AC-11 device rank assertions | present |
| INV-05 — primary device owned by current occupant | `INV-05 & INV-06: release auto-downgrades primary device, holding INV-05` (unit), AC-6, AC-11 | present |
| INV-06 — occupant exit auto-downgrades primary device | `AC-6` (e2e & unit), `AC-7` (unit), `INV-05 & INV-06` probe | present |
| INV-07 — devices may exist unassigned in inventory | AC-6 & AC-7 assert devices stay on seat as secondary without detach or delete | present |

## Fixtures

No fixtures are named or quoted directly from `src/lib/data/fixtures.ts`.
Seats and members are discovered dynamically at runtime via `seats.listSeats()` / `members.listMembers()` and rendered UI options.

## `tests/e2e/smoke.spec.ts` — the repair

Per `02-design.md` section 6.2, `smoke.spec.ts` was updated from quoting hardcoded seat ids (`seats-status-seat-a-01`) to fixture-blind status assertions over `data-testid` prefix and suffix (`seats-row-*-status`), verifying that both `OCCUPIED` and `VACANT` states occur across the table.

## Out of scope for this plan

- **Seat placement and spatial layout (INV-10).** Out-of-scope item 1.
- **Seat CRUD (creating/deleting seats).** Out-of-scope item 2.
- **Permissions and authentication guards.** Out-of-scope item 5 (`AUT` group).
- **Database constraints under mock mode.** Out-of-scope item 9.
- **Empty table state (`seats-empty`).** Seed holds seats, so table is non-empty.

## Selector gaps

**None.** Every testid specified in `02-design.md` section 6 is present and functional.
