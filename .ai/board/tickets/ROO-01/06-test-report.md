---
ticket: ROO-01
stage: QA
agent: qa
produced_at: 2026-08-21T17:06:00Z
inputs_read: [ .ai/board/tickets/ROO-01/01-story.md, .ai/board/tickets/ROO-01/02-design.md#6, .ai/board/tickets/ROO-01/02-design.md#6.1, .ai/board/tickets/ROO-01/05-test-plan.md, .ai/board/tickets/ROO-01/ticket.yaml, .ai/board/tickets/ROO-01/99-questions.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: DONE
---

# ROO-01 — Room CRUD UI — test report (third QA pass)

**`chat_before_verdict: none`.** No channel to `developer` or `tech-lead-review` was opened and
neither is addressed anywhere in `99-questions.md` (RULE-12). No question was raised this pass at
all: `consulted` is empty, and every question from the first two passes — Q6 through Q12 — is
answered and closed.

**Provenance.** `src/**` was not read (RULE-05) and `04-review.md` was not read. Section 6 supplied
every selector and section 6.1 every seam call. `ticket.yaml` was read for `allowed_paths` and
`chat_budget`; it also narrates the earlier DESIGN and REVIEW verdicts, and nothing in this report
depends on that narration.

## Results

| Suite | Command | Exit code | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| unit | `pnpm test` | **0** | 45 | 0 | 0 |
| e2e | `pnpm test:e2e` | **0** | 24 | 0 | 0 |

`pnpm typecheck` and `pnpm lint` both exit 0.

Both gate commands exit 0. Nothing is skipped, so no row of the coverage table is a pass standing in
for absent coverage.

## AC coverage

| AC | Test name | Level | Result |
|---|---|---|---|
| AC-1 | `AC-1: every room the system holds is listed, with a control to create one` | e2e | **pass** |
| AC-2 | `AC-2: a room is created from all four of its required fields` | e2e | **pass** |
| AC-3 | `AC-3: creation is refused when a required field is missing or blank` | e2e | **pass** |
| AC-4 | `AC-4: an existing room is renamed, and nothing else about it changes` | e2e | **pass** |
| AC-4 | `AC-4 (refusal): a rename to a blank name is refused` | e2e | **pass** |
| AC-5 | `AC-5: a room containing no seats is deleted, after a confirmation naming zero` | e2e | **pass** |
| AC-6 | `AC-6: the confirmation names the seat count, and nothing is destroyed until it is confirmed — INV-11` | e2e | **pass** |
| AC-6 | `AC-6: confirming the delete destroys the room and all N of its seats` | unit | **pass** |
| AC-6 | `AC-6: the deleted room no longer appears, and no other room is affected` | unit | **pass** |
| AC-6 | `AC-6: the deletion cannot be undone from this surface` | unit | **pass** |
| AC-7 | `AC-7: deletion is not performed until it is confirmed` | e2e | **pass** |
| AC-12 | `AC-12: creation is refused when the code is already in use` | e2e | **pass** |
| AC-13 | `AC-13: creation is refused when a grid dimension is not a positive whole number` | e2e | **pass** |
| AC-14 | `AC-14: a primary device on a destroyed seat survives, unassigned and not primary` | unit | **pass** |
| AC-14 | `AC-14: a device assigned to a seat in a different room is untouched` | unit | **pass** |
| AC-14 | `AC-14: the cascade detaches devices and destroys none — INV-07` | unit | **pass** |
| AC-14 | `AC-14: every device the cascade detached was on a seat in the deleted room` | unit | **pass** |
| AC-14 | `AC-14: no surviving device points at a seat that no longer exists — INV-04, INV-05` | unit | **pass** |

Ten live criteria, eighteen tests, every criterion mapped and every test passing. AC-8 to AC-11 are
withdrawn and their numbers retired, so their absence is the scope cut and not a coverage hole.

The remaining 21 tests in the run belong to Phase B — `smoke.spec.ts` (6, including the two rows this
ticket re-pointed), `seam-parity.test.ts` and `permissions.test.ts`. All pass, unedited except for
the two selector strings in `smoke.spec.ts` that section 6's re-key required.

## Failures

**None.**

| # | Test | Expected | Actual | Routes to | Increments `rework_count` |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

The one failure of the second pass — `AC-14: a primary device on a seat in a different room is
untouched` — is resolved and did not recur. It was not a defect in the implementation: AC-14's
control clause asserted `dev-04` was primary, and no device in the seed is both primary and seated
outside `ROOM-A`, so the clause was unsatisfiable by construction. It routed to `ba` under the "AC
ambiguous or untestable" row (RULE-08), `ba` answered with resolution (a) at `2026-08-21T10:12:00Z`,
and the clause now reads "`dev-04` is unchanged in every respect — still assigned to the same seat,
with no field of it altered". The test drops the withdrawn assertion, keeps its deep-equality
comparison against the pre-delete snapshot, and is renamed to match. `rework_count` stays **0**.

## Invariant observations

**No invariant was observed to be violated.** Nothing escalates under RULE-07.

| Invariant | Held | Evidence |
|---|---|---|
| INV-01 — a seat has at most one occupant | not probed | Occupancy has no surface on this ticket and no call in section 6.1 returns one. No observation is possible either way. |
| INV-04 — at most one primary device per seat | **held** | `AC-14: no surviving device points at a seat that no longer exists` passes: after the cascade, no device has `rank: "PRIMARY"` with `seatId: null`. |
| INV-05 — a primary device is owned by the seat's occupant | **held** | Same probe. A primary with no seat has no occupant to be owned by, and none survives. |
| INV-06 — primary downgrades when the occupant exits | **held** | `dev-01` is `PRIMARY` with a seat before the delete and `SECONDARY` with `seatId: null` after it. Destroying the seat is the most complete occupant exit there is. |
| INV-07 — devices may exist unassigned | **held** | Two probes pass: the detached device still exists with `seatId: null`, and the set of device ids is identical before and after — the cascade destroys no device. |
| INV-10 — no two seats overlap within a room | **held** | `AC-13` passes across six cases: zero, negative and fractional on each dimension. No room can be created with a grid in which placement is undefined. |
| INV-11 — deleting a room deletes its seats behind a confirmation naming how many | **held** | Both halves. E2E: the confirmation for `ROOM-A` names `6`, and after a dismissal the room is still listed and still names `6`. Unit: `deleteRoom` reports `seatsDeleted: 6` with `deleted: true`, and `listRooms()` afterwards is the prior list minus `ROOM-A` alone. The number named and the number destroyed are checked against one story datum from opposite sides. |

Six of seven invariants are probed and every one of the six holds. INV-01 is unprobed, structurally:
nothing on this ticket reads an occupancy. That is recorded here rather than omitted so it is not
mistaken for coverage.

## Residual coverage

Neither item is a gate failure; both are stated so nobody has to rediscover them.

**AC-6's confirm through the UI, on a room that holds seats, is covered at the seam rather than in the
browser.** `pnpm test:e2e` drives one server holding one mutable store and runs spec files in
parallel against it. Confirming the delete of `ROOM-A` in `rooms.spec.ts` would destroy the rows and
seats `smoke.spec.ts` asserts on — `rooms-row-ROOM-A`, and `seats-status-seat-a-01` and `seat-a-03`,
which are `ROOM-A`'s seats — and whichever spec lost the race would fail. Making the ordering
deterministic means `workers: 1` or a project dependency in `playwright.config.ts`, which is not in
`allowed_paths`. What goes unobserved is narrow: AC-5 already exercises the full browser round trip
on a confirmed delete, so what is untested is the interaction of that render path with a non-zero
cascade. Worth raising against the e2e harness rather than against this ticket.

**`rooms-empty` is asserted absent and never asserted present.** The empty state is unreachable — the
seed always holds rooms — and no AC specifies it.

## Selector gaps encountered

**None**, and no non-selector gap either — which is the difference between this pass and both that
came before it. Section 6 and section 6.1 supplied every selector and every seam call the plan
needed. No test was written against anything absent from them, and `src/lib/data/fixtures.ts` was not
imported.

The four values quoted rather than discovered — `ROOM-A`, six, `dev-01`, `dev-04` — are setup data
AC-6 and AC-14 name on purpose, for the reason both criteria state: QA can neither build that state
(out-of-scope items 1 and 7) nor look it up (RULE-05). Nothing is quoted about `dev-04` beyond its
id; its seat and its rank are read at run time and compared against themselves, which is what
Q12 settled.

## Artifacts produced

| Path | What it is |
|---|---|
| `tests/unit/rooms.test.ts` | 8 tests. One test amended for Q12 resolution (a) and renamed; the other seven unchanged. |
| `tests/e2e/rooms.spec.ts` | 10 tests. Unchanged from the second pass. |
| `tests/e2e/smoke.spec.ts` | Unchanged from the second pass — the two re-pointed row selectors, no behaviour. |
| `.ai/board/tickets/ROO-01/05-test-plan.md` | Rewritten for this pass |
| `.ai/board/tickets/ROO-01/06-test-report.md` | This file |

`ticket.yaml` is set to `state: DONE` with `gates.qa.passed: true`, per the `/qa` command's PASS
branch. Nothing outside `allowed_paths` was touched.

## Verdict

**PASS.**

Both halves of the gate are met. Every live `AC-n` maps to at least one named test — ten criteria,
eighteen tests — and `pnpm test` and `pnpm test:e2e` both exit 0, 45 and 24 tests respectively with
nothing skipped. Six of the seven touched invariants are probed and all six hold; the seventh is
unobservable from this ticket's surface and is recorded as such. No invariant violation, so nothing
escalates under RULE-07. No route reaches `developer` and `rework_count` stays **0** — the two
failures this ticket saw at QA were a missing seam contract and an unsatisfiable Given, both design
and story defects, both fixed where they were made.

Next command: `/ship ROO-01`, in the orchestrator session.

## Changelog

- `2026-08-21T09:20Z` — first pass. **FAIL**, two blockers, both to `tech-lead-design`: AC-14 had no
  seam surface to be written against (Q10), and `smoke.spec.ts` was broken by section 6's row re-key
  while sitting outside `allowed_paths` (Q11). `pnpm test:e2e` exited non-zero.
- `2026-08-21T09:49:30Z` — second pass. **FAIL**, one clause of one criterion, to `ba` (Q12). Both
  first-pass blockers resolved; `pnpm test:e2e` exited 0 for the first time and INV-11 was fully
  probed for the first time. 17 of 18 ticket tests passed.
- `2026-08-21T17:06:00Z` — third pass. **PASS**. Q12 resolution (a) applied; both suites exit 0.
