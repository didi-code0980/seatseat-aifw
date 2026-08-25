---
ticket: SEA-01
stage: QA
agent: qa
produced_at: 2026-08-24T10:45:00Z
inputs_read: [ .ai/board/tickets/SEA-01/01-story.md, .ai/board/tickets/SEA-01/05-test-plan.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: DONE
---

# SEA-01 — test report

`chat_before_verdict: none` is an attestation (RULE-12) and it is true: this session opened no message channel, asked nothing of `ba` or `tech-lead-design`, and reached its verdict from files alone. `03-impl-log.md` and `04-review.md` were not read.

## Results

| Suite | Command | Exit code | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| unit | `pnpm test` | 0 | 74 | 0 | 0 |
| e2e | `pnpm test:e2e` | 0 | 45 | 0 | 0 |

Thirteen of the 74 unit tests (`tests/unit/seats.test.ts`) and 7 of the 45 e2e tests (`tests/e2e/seats.spec.ts`) belong to SEA-01. The remainder are the previous suites (`rooms`, `devices`, `permissions`, `seam-parity`, `smoke`), all passing cleanly with exit code 0. No test is skipped, fixme, or only.

`pnpm typecheck` and `pnpm lint` also exit 0 with 0 errors and 0 warnings.

## AC coverage

| AC | Test name | Result |
|---|---|---|
| AC-1 | `AC-1: every seat is listed with occupant, status, and correct action controls` (e2e) | PASS |
| AC-2 | `AC-2: an occupant is assigned to a vacant seat without reloading` (e2e) | PASS |
| AC-2 | `AC-2: assigns occupant to vacant seat, updates status, and leaves other seats untouched` (unit) | PASS |
| AC-3 | `AC-3: refused with SEAT_OCCUPIED, occupant unchanged, and target member occupies no new seat` (unit) | PASS |
| AC-4 | `AC-4: one member is assigned to multiple seats without refusal — INV-02` (e2e) | PASS |
| AC-4 | `AC-4: member A is assigned to a second seat and occupies both without refusal` (unit) | PASS |
| AC-5 | `AC-5: an occupant is released from a seat without reloading` (e2e) | PASS |
| AC-5 | `AC-5: vacates the seat, status becomes VACANT, member still exists, other seats unchanged` (unit) | PASS |
| AC-6 | `AC-6: releasing an occupant on /seats downgrades primary device to SECONDARY on /devices — INV-06` (e2e) | PASS |
| AC-6 | `AC-6: primary device on the seat is downgraded to SECONDARY, remains on seat, returns downgradedDeviceId` (unit) | PASS |
| AC-7 | `AC-7: primary is downgraded, secondary device remains secondary, neither deleted or detached` (unit) | PASS |
| AC-8 | `AC-8: refused with SEAT_NOT_OCCUPIED, no seat changes, and no device rank changes` (unit) | PASS |
| AC-9 | `AC-9: assignment is refused when no member is chosen` (e2e) | PASS |
| AC-10 | `AC-10: seat status is derived and never set directly across transitions — INV-03` (e2e) | PASS |
| AC-10 | `AC-10: deriveSeatStatus accurately reflects occupancy across multiple transitions` (unit) | PASS |
| AC-11 | `AC-11: assigning new occupant leaves previous occupant's secondary devices secondary without promotion` (unit) | PASS |

Eleven criteria, eleven rows accounted for, seventeen tests. Every AC is covered.

## Failures

| # | Test | Expected | Actual | Routes to | Increments rework_count |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

**None.** `rework_count` remains 0.

## What was checked hardest, and what it found

- **INV-06 downgrade verified at the seam and on the UI:** `seats.releaseSeatOccupant` returns `downgradedDeviceId` and demotes the seat's primary device to `SECONDARY` while keeping it assigned to the seat. The E2E test confirmed that releasing on `/seats` updates the device rank to `SECONDARY` on `/devices`.
- **INV-01 & INV-02 occupancy rules:** AC-3 verifies `SEAT_OCCUPIED` rejection when attempting to assign an already-occupied seat, while AC-4 proves that a single member can hold multiple seats simultaneously without constraint refusal.
- **INV-03 derived status integrity:** Proved that status strictly reflects occupancy (`OCCUPIED` when `occupantId !== null`, `VACANT` when `occupantId === null`) through assign/release cycles with no direct status manipulation affordances.
- **State isolation and teardown:** Every E2E test restores the seat and device states it altered, leaving seeded fixtures intact for subsequent tests.

## Invariant observations

| Invariant | Held | Evidence |
|---|---|---|
| INV-01 — a seat has at most one occupant | Held | `INV-01: no seat holds more than one occupant` unit probe and AC-3 `SEAT_OCCUPIED` refusal. |
| INV-02 — one person may occupy multiple seats | Held | AC-4 (e2e and unit) and `INV-02: one member may occupy multiple seats concurrently` probe. |
| INV-03 — seat status is derived and rendered | Held | AC-1, AC-10, `smoke.spec.ts` INV-03 test, and unit probe. |
| INV-04 — a seat has at most one primary device | Held | AC-6, AC-7, AC-11 assert no multiple primaries exist. |
| INV-05 — primary device owned by current occupant | Held | `INV-05 & INV-06: release auto-downgrades primary device, holding INV-05` unit probe and AC-11. |
| INV-06 — occupant exit auto-downgrades primary device | Held | AC-6 (e2e and unit) verifies primary device becomes `SECONDARY` upon release. |
| INV-07 — devices may exist unassigned in inventory | Held | AC-6 and AC-7 confirm release leaves devices on the seat as secondary without detaching into inventory or deleting. |

**Nothing escalates under RULE-07.**

## Selector gaps encountered

**None.** Every testid from `02-design.md` section 6 was present and verified.

## Verdict

**PASS.**

All 11 acceptance criteria map to passing named tests. `pnpm test` (74 passed) and `pnpm test:e2e` (45 passed) exit 0. All 7 touched invariants hold. `rework_count` is 0.

State moves to `DONE`.
