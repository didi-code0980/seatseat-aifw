---
ticket: DEV-01
stage: QA
agent: qa
produced_at: 2026-08-23T08:06:50Z
inputs_read: [ .ai/board/tickets/DEV-01/01-story.md, .ai/board/tickets/DEV-01/05-test-plan.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: DONE
---

# DEV-01 — test report

`chat_before_verdict: none` is an attestation (RULE-12) and it is true: this session opened no
message channel, asked nothing of `ba` or `tech-lead-design`, and reached its verdict from files
alone. `03-impl-log.md` and `04-review.md` were not read.

## Results

| Suite | Command | Exit code | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| unit | `pnpm test` | 0 | 61 | 0 | 0 |
| e2e | `pnpm test:e2e` | 0 | 38 | 0 | 0 |

Sixteen of the 61 unit tests and 14 of the 38 e2e tests are DEV-01's; the rest are ROO-01's suites
and the smoke suite, run unchanged except for the one repair this ticket owed
(`tests/e2e/smoke.spec.ts`, below). Nothing is skipped, and no test is marked `fixme` or `only` —
`forbidOnly` is on under CI and the run was made with `CI=1`.

**The e2e suite was run twice, from a cold build both times**, because a suite that mutates a shared
store can pass once by leaving state that the next run needs. Both runs: 38 passed, exit 0. That is
the check that the teardown in `tests/e2e/devices.spec.ts` actually restores the surface, and it is
worth more here than a single green run.

`pnpm typecheck` and `pnpm lint` also exit 0. Neither is the QA gate; both were run because a test
file that does not compile is not evidence of anything.

## AC coverage

| AC | Test name | Result |
|---|---|---|
| AC-1 | `AC-1: every device is listed with its owner, its seat, its designation and that seat's occupant` (e2e) | PASS |
| AC-2 | `AC-2: a device is created into unassigned inventory, owned by the member chosen` (e2e) | PASS |
| AC-2 | `AC-2: the new device is listed, owned by the member chosen, unassigned and not primary` (unit) | PASS |
| AC-3 | `AC-3: creation is refused when a required field is missing or blank` (e2e) | PASS |
| AC-4 | `AC-4: an existing device's attributes are changed, and its seat and designation are not` (e2e) | PASS |
| AC-4 | `AC-4: the new value is stored, and seat, designation and device count are untouched` (unit) | PASS |
| AC-5 | `AC-5: assigning an unassigned device lands it secondary, and leaves the seat's primary alone — INV-04` (e2e) | PASS |
| AC-5 | `AC-5: assignment does not confer primacy, and does not disturb the seat's existing primary` (unit) | PASS |
| AC-6 | `AC-6: unassigning returns a device to inventory and strips its primary designation — INV-07, INV-04` (e2e) | PASS |
| AC-6 | `AC-6: a PRIMARY device unassigned keeps existing, loses its seat and loses its rank` (unit) | PASS |
| AC-7 | `AC-7: designating a primary demotes the incumbent — INV-04, INV-05` (e2e) | PASS |
| AC-7 | `AC-7: designating the second demotes the first, and touches no other seat` (unit) | PASS |
| AC-8 | `AC-8: designation is refused when the owner is not the seat's occupant — INV-05` (e2e) | PASS |
| AC-8 | `AC-8: refused with OWNER_IS_NOT_OCCUPANT, and nothing moves` (unit) | PASS |
| AC-9 | `AC-9: designation is refused for a device assigned to no seat — INV-04, INV-05` (e2e) | PASS |
| AC-9 | `AC-9: refused with NOT_ASSIGNED, the device stays unassigned, the list is otherwise unchanged` (unit) | PASS |
| AC-10 | `AC-10: designation is refused when the seat has no occupant, and not for AC-8's reason — INV-05` (e2e) | PASS |
| AC-10 | `AC-10: refused with SEAT_HAS_NO_OCCUPANT, not with AC-8's reason` (unit) | PASS |
| AC-11 | `AC-11: the owner of a seat's primary device may not become a non-occupant — INV-05` (e2e) | PASS |
| AC-11 | `AC-11: refused with PRIMARY_OWNER_MUST_BE_OCCUPANT, and the device is still primary and still owned by the occupant` (unit) | PASS |
| AC-11 | `AC-11: the same edit is accepted once the device is no longer the seat's primary` (unit) | PASS |
| AC-12 | `AC-12: a device in inventory is deleted, behind a confirmation` (e2e) | PASS |
| AC-12 | `AC-12: the device is gone, it was primary of no seat, and no other device is affected` (unit) | PASS |
| AC-13 | `AC-13: deleting a seat's primary device names the seat, and leaves the seat with none — INV-04` (e2e) | PASS |
| AC-13 | `AC-13: the outcome names the seat, the seat ends with no primary, and the seat's other devices are intact` (unit) | PASS |
| AC-14 | `AC-14: deletion is not performed until it is confirmed` (e2e) | PASS |

Fourteen ACs, fourteen rows accounted for, twenty-six tests. `01-story.md` retires no AC number:
AC-1 to AC-14 are all live and all covered.

## Failures

| # | Test | Expected | Actual | Routes to | Increments rework_count |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

**None.** `rework_count` stays 0 and nothing routes to `developer`.

## What was checked hardest, and what it found

Recorded because a table of green rows is not evidence and a report that only shows one is not worth
reading.

**The AC-8 / AC-10 split held.** `01-story.md` says in terms that the defect lives in folding
"the owner is not the occupant" and "there is no occupant" into one refusal. Both are asserted at
both levels: at the seam by reason code — `OWNER_IS_NOT_OCCUPANT` against `SEAT_HAS_NO_OCCUPANT` —
and at the surface by asserting that the two messages `devices-action-error` renders are **not the
same string**. They differ. An implementation that compared an absent occupant with `!==` and got
the right answer by accident would have produced one message for both, and that assertion would have
failed.

**INV-04 was checked as a count, not as a flag.** AC-7 asserts the demoted device is `SECONDARY`,
which a designation that *added* a second primary would also satisfy. Both the e2e and unit AC-7
tests therefore count the primaries on the seat afterwards and require exactly one, and the unit file
sweeps every seat in the store at the end.

**Every "nothing else changed" clause was taken literally.** AC-6, AC-8, AC-9 and AC-12 compare the
full visible state of every other row — model, owner, seat, rank, occupant — against a snapshot taken
immediately before the act, rather than checking the fields the criterion happens to name. AC-9's
`toEqual(before)` over the whole device list is the strictest of them and passed unchanged.

**AC-11 carries a control and it passed.** `AC-11: the same edit is accepted once the device is no
longer the seat's primary` distinguishes a targeted INV-05 refusal from an `updateDevice` that
refuses every owner change. The refusal is targeted.

**AC-13's sibling device is intact.** Deleting a seat's primary removed one device and left the other
device on that seat assigned, secondary and owned by the same member — the failure this control
exists to catch is a delete that takes or demotes every device on the seat, and it did not happen.

## Invariant observations

| Invariant | Held | Evidence |
|---|---|---|
| INV-04 — a seat has at most one primary device | Held | `INV-04: no seat holds more than one primary device, after every act above` sweeps every seat in the store after all sixteen unit acts and finds none with two. AC-7 counts the primaries on the seat it acted on, at both levels, and finds exactly one. AC-5 confirms assignment does not add a second by the side door; AC-9 confirms one cannot exist without a seat. |
| INV-05 — a seat's primary device must be owned by that seat's occupant | Held | `INV-05: every primary device is owned by the occupant of the seat it sits on` sweeps every primary device in the store and finds no mismatch and no primary on a vacant seat. Reached from both directions: AC-8 and AC-10 refuse the designation with the owner held still, AC-11 refuses the owner change with the designation held still. The mock has no constraint trigger, so the seam is the only thing holding this, exactly as `01-story.md` and out-of-scope item 6 say. |
| INV-06 — an occupant exit downgrades that seat's primary | Held, in the one direction DEV-01 can reach | `INV-04, INV-06: no device carries a primary designation without a seat to hold it` finds none. DEV-01 builds no occupant-exit path (out-of-scope items 2 and 7), so the downgrade itself is not reachable from anything this ticket ships and no test asserts it. The story calls DEV-01's obligation here *negative* — do not create a designation the exit path cannot find, or a state it cannot coherently act on — and AC-6 and AC-10 discharge it. **This is a partial observation and is recorded as one rather than reported as a clean pass.** |
| INV-07 — devices may exist unassigned in inventory | Held | AC-2 lands every new device in inventory and `listUnassignedDevices()` agrees; AC-6 returns a device there without deleting it; `INV-07: inventory is a state a device can be in, and it is exactly the set with no seat` asserts the two views of inventory are the same set; and the re-keyed INV-07 test in `tests/e2e/smoke.spec.ts` confirms it is visible on the surface. |

**Nothing escalates under RULE-07.** No invariant was observed violated, and no test needed to be
weakened to pass.

## Selector gaps encountered

**None.** Every control the fourteen criteria need is in section 6, and no test was written against a
selector that is not. Three of them were load-bearing in a way that is worth naming, because omitting
any of the three would have made a criterion untestable rather than merely awkward:
`devices-row-<tag>-primary` present on unassigned rows (AC-9's refusal is otherwise unreachable),
`devices-action-error` (AC-8, AC-9 and AC-10 raise their messages with no form open), and
`device-delete-seat` as a bare seat code (AC-13's "names the seat" is otherwise a string parsed out
of a sentence).

The two format contracts in section 6 were relied on and both held: the seat picker's option label
`<SEAT-CODE> (<ROOM-CODE>) — <occupant full name>` / `— no occupant`, and the three cell literals
`unassigned`, `no occupant` and `n/a`. The label is what makes AC-7's, AC-8's and AC-10's Givens
constructible without reading the seed, and it is the single point of failure if the wording ever
changes; `tests/e2e/devices.spec.ts` parses it in exactly one function for that reason.

**One pointer outside section 6 was followed and is declared here as it is in the plan.** Section 6.1
says the seam's refusal reason strings are in section 1.1 and are to be asserted by value, which
incorporates that type block by reference. The five reason codes quoted in
`tests/unit/devices.test.ts` were read there. Nothing else outside section 6 was opened. Saying so is
more useful than leaving it to be inferred from the test file.

## `tests/e2e/smoke.spec.ts` — the repair, and what changed about it

`02-design.md` section 5 assigned this repair to QA and put the file in `allowed_paths`: the design
re-keys device rows by `assetTag`, and `smoke.spec.ts:56` addressed `devices-row-dev-05`.

**The obvious repair was not available.** Substituting the seeded device's asset tag for its id
requires knowing a value from `src/lib/data/fixtures.ts`, which RULE-05 puts out of QA's reach and
which no artifact reaching QA discloses — section 6 gives the *shape* of a seed asset tag as advice
about test data, not any particular one. The test now asserts over the `-seat` cells that at least
one device in the list reports itself unassigned. That is what INV-07 says, and what the test was
always checking; it no longer depends on any identifier, and it no longer passes by accident if the
seeded device is renamed. It is stable under concurrency for the reason section 6.2 gives:
`tests/e2e/devices.spec.ts` creates unassigned devices and deletes what it creates, so it can only
add to that set.

The other four assertions in `smoke.spec.ts` are untouched.

## One behaviour with no acceptance criterion — F-1, routed to `ba`

**This does not fail the gate and does not increment `rework_count` (RULE-08).** It is recorded
because a coverage table that does not mention it would read as complete when it is not.

The seam refuses a duplicate asset tag (`DUPLICATE_ASSET_TAG`, sections 1.1 and 6.1) and section 6
carries the selector for the message, marked *pending F-1*. `01-story.md` has no criterion for it:
A-3 assumes device fields carry no uniqueness constraint, `02-design.md` finding F-1 records that
`Device.assetTag` is `@unique` and that A-3 is therefore false, and `99-questions.md` routes the
missing criterion to `ba`. It is still open — `01-story.md`'s changelog has two entries and neither
amends AC-3.

**QA may not invent the criterion** (RULE-05, and the no-invention working agreement), so no test
asserts that refusal. The consequence, stated plainly: **a real refusal in the shipped code has no
acceptance criterion and no test**, and deleting the check would not fail this suite. Both suites
work *around* it — every asset tag either suite creates is made unique per run precisely so the
untested refusal is never triggered by accident.

The fix is one RULE-14 amendment to `01-story.md` adding the criterion `ROO-01`'s AC-12 already
models for `Room.code`, and one test against `device-create-tag-error`. It is a coverage gap, not a
defect: nothing observed suggests the refusal is missing or wrong, only that nothing here proves it.

F-2, F-3 and F-5 were reachable without amendment and cost this stage nothing: F-2's field set is in
section 6 as three create inputs with three error elements, F-3's `unowned` literal is in section 6's
owner-cell row and AC-4 was tested by editing the model rather than the owner, and F-5's constructed
Given is section 6.2's own route. F-4 asked for nothing. **F-1 is the only one of the five that
leaves a hole**, and `99-questions.md`'s claim that all five are unsafe to carry into QA is broader
than what this stage actually found.

## Verdict

**PASS.**

Fourteen acceptance criteria, each mapped to at least one named test carrying its ID. `pnpm test`
exits 0 with 61 passed and none skipped; `pnpm test:e2e` exits 0 with 38 passed and none skipped, on
two cold runs. All four invariants in `invariants_touched` were probed; INV-04, INV-05 and INV-07
hold, and INV-06 holds in the one direction DEV-01 can reach, which is the direction the story
assigns it. No failure, so nothing routes to `developer` and `rework_count` stays 0. No invariant
violation, so nothing escalates under RULE-07.

Carried forward, and neither is a gate failure: **F-1** leaves the duplicate-asset-tag refusal with
no criterion and no test, routed to `ba` (RULE-08, no increment); and **INV-06's positive direction**
is untested here by design and belongs to whichever `SEA` or `REG` ticket ends occupancy.

State moves to `DONE`. This session is discarded (RULE-13); a re-run would open a new one.
