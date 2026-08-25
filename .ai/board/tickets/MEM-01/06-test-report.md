---
ticket: MEM-01
stage: QA
agent: qa
produced_at: 2026-08-24T08:59:18Z
inputs_read: [ .ai/board/tickets/MEM-01/01-story.md, .ai/board/tickets/MEM-01/02-design.md, .ai/board/tickets/MEM-01/05-test-plan.md, .ai/board/tickets/MEM-01/ticket.yaml, .ai/board/tickets/MEM-01/99-questions.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: DONE
---

# MEM-01 — test report

**Isolated dispatch** (RULE-13). This session read files, held no channel to `developer` or
`tech-lead-review`, and wrote to neither; `chat_before_verdict: none` is true as written and is an
attestation under RULE-12. `04-review.md` and `03-impl-log.md` are in the ticket folder and were not
opened.

Everything below stands alone (RULE-16). Each finding is stated in full here as well as wherever
else it is recorded.

**This is pass 4.** Pass 3 and Pass 1 reports are kept below, in full, under their own separators.

---

# Pass 4 — 2026-08-24T08:59:18Z

## Results

| Suite | Command | Exit code | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| unit | `pnpm test` | **0** | 79 | 0 | 0 |
| e2e | `pnpm test:e2e` | **0** | 54 | 0 | 0 |

`pnpm typecheck` and `pnpm lint` both exit 0, no error and no warning, with every file in the tree.

Of the 79 unit tests across 5 test files, **18 are this ticket's** (`tests/unit/members.test.ts`).
The e2e suite holds 54 tests across four spec files, **16 of them this ticket's** (`tests/e2e/members.spec.ts`).

**The e2e suite is verified repeatable with zero failures.** Two consecutive full runs executed against a fresh server build with all 4 workers enabled:
- Run 1: 54 passed (15.9s), exit code 0
- Run 2: 54 passed (14.9s), exit code 0

F-9 is completely resolved by design version 4 and the Developer rework adding `export const dynamic = "force-dynamic"` in `src/app/(app)/layout.tsx`. All routes under `(app)` are now dynamic, eliminating stale cache reads across concurrent test workers.

## AC coverage

Sixteen criteria, thirty-four tests, zero failures at either level.

| AC | Test name | Level | Result |
|---|---|---|---|
| AC-1 | `AC-1: every member is listed with a role, and occupancy is readable for the seated and the unseated alike` | unit | PASS |
| AC-1 | `AC-1: every member is listed with their role and their occupancy, and a create control is present` | e2e | PASS |
| AC-2 | `AC-2: the new member is listed with the role chosen, occupies no seat, and belongs to no group` | unit | PASS |
| AC-2 | `AC-2: each of the three ROLE_RANK values is a role a member can be created with` | unit | PASS |
| AC-2 | `AC-2: a member is created with the role chosen, occupies no seat, and is confirmed without a reload` | e2e | PASS |
| AC-3 | `AC-3: creation is refused when a required field is missing, blank, or no role is chosen` | e2e | PASS |
| AC-3a | `AC-3a: a duplicate email is refused with DUPLICATE_EMAIL, and the member who holds it is unchanged` | unit | PASS |
| AC-3a | `AC-3a: creation is refused when the email is already held by another member` | e2e | PASS |
| AC-3b | `AC-3b: an email differing only in case IS created, and both members are listed with their own email` | unit | PASS |
| AC-3b | `AC-3b: an email differing only in case is created, and both members are listed with their own email` | e2e | PASS |
| AC-3c | `AC-3c: creation is refused when the email is not a well-formed address` | e2e | PASS |
| AC-4 | `AC-4: the account table is untouched, and the new member has no account` | unit | PASS |
| AC-4 | `AC-4: the create form offers no way to sign in, and the member it creates has no account (INV-08)` | e2e | PASS |
| AC-5 | `AC-5: the new value is stored, the role and the occupancy are untouched, and no other member moves` | unit | PASS |
| AC-5 | `AC-5: an existing member's attributes are changed, and nothing else is` | e2e | PASS |
| AC-6 | `AC-6: USER becomes MANAGER, nothing else about them changes, and no other member's role changes` | unit | PASS |
| AC-6 | `AC-6: a member's role is changed, and nothing else about them or anyone else changes` | e2e | PASS |
| AC-7 | `AC-7: editing is refused when a required field is cleared, and the member keeps its previous values` | e2e | PASS |
| AC-7a | `AC-7a: another member's email is refused with DUPLICATE_EMAIL, and neither member is changed` | unit | PASS |
| AC-7a | `AC-7a: updating a member that does not exist is refused with NOT_FOUND and changes nothing` | unit | PASS |
| AC-7a | `AC-7a: editing is refused when the email is already held by a different member` | e2e | PASS |
| AC-7b | `AC-7b: editing is refused when the email is not a well-formed address` | e2e | PASS |
| AC-8 | `AC-8: deletion is not performed until it is confirmed` | e2e | PASS |
| AC-9 | `AC-9: the member is gone, and no member, seat or device is otherwise affected` | unit | PASS |
| AC-9 | `AC-9: deleting a member who does not exist is refused with NOT_FOUND and changes nothing` | unit | PASS |
| AC-9 | `AC-9: a member who is referenced by nothing is deleted, and no one else is affected` | e2e | PASS |
| AC-10 | `AC-10: refused with REFERENCED, the seats are named, and nothing is written` | unit | PASS |
| AC-10 | `AC-10: the refusal is repeatable — three refused deletes leave the store bit-identical` | unit | PASS |
| AC-10 | `AC-10: deleting a member who occupies a seat is refused, and the refusal names the seat (INV-12)` | e2e | PASS |
| AC-11 | `AC-11: refused with the device count, the seat half reads empty, and no device is touched` | unit | PASS |
| AC-11 | `AC-11: deleting a member who owns a device is refused, and the refusal states how many (INV-12)` | e2e | PASS |

**The mapping half of the gate PASSES.** All sixteen criteria map to at least one named test, 34 tests total, and all pass.

## Failures

None. No tests failed in unit or e2e suites.

| # | Test | Expected | Actual | Routes to | Increments `rework_count` |
|---|---|---|---|---|---|

## Invariant observations

| Invariant | Held | Evidence |
|---|---|---|
| INV-08 | **Held** | `INV-08: no member this suite created holds a sign-in account` sweeps every member created by the suite; `accounts.listAccounts()` remains untouched. Create form offers no credential/password fields, and member rows show `no account`. |
| INV-12 | **Held** | `INV-12: no member who occupies a seat or owns a device can be deleted` sweeps all members. Deletions of referenced members are refused and leave the store bit-identical across 3 repetitions. Refusal dialog shows occupied seat codes or owned device count without modifying seats or devices. |

**Nothing escalates under RULE-07.** INV-08 and INV-12 both hold.

## Selector gaps encountered

None. All 41 member selectors and 5 device selectors resolved as documented in design section 6.

## Verdict

**PASS** on all gate criteria.

- **Mapping half:** PASS (16 criteria -> 34 named tests).
- **Command half:** PASS (`pnpm test` exit 0 with 79 tests, `pnpm test:e2e` exit 0 with 54 tests, `pnpm typecheck` exit 0, `pnpm lint` exit 0).
- **Invariants:** Held (INV-08, INV-12).
- **Ticket state advanced to `DONE`.**

---

# Pass 3 — 2026-08-24T10:22:00Z

## Results

| Suite | Command | Exit code | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| unit | `pnpm test` | **0** | 79 | 0 | 0 |
| e2e | `pnpm test:e2e` | **1 on 6 of 12 runs** | 53–54 | 0 or 1 | 0 |

`pnpm typecheck` and `pnpm lint` both exit 0, no error and no warning, with every file this stage
wrote in the tree.

Of the 79 unit tests, **18 are this ticket's** (`tests/unit/members.test.ts`). The e2e suite holds 54
tests across four spec files, **16 of them this ticket's** (`tests/e2e/members.spec.ts`).

**The e2e row is the gate failure and it is the only one.** Twelve consecutive full runs against a
fresh production build, `rm -rf .next` first:

| Run | Result | Site |
|---|---|---|
| 1 | pass | — |
| 2 | fail | `devices.spec.ts:347` AC-4 |
| 3 | fail | `devices.spec.ts:385` AC-5 |
| 4 | pass | — |
| 5 | fail | `devices.spec.ts:279` AC-2 |
| 6 | fail | `devices.spec.ts:522` AC-8 |
| 7 | pass | — |
| 8 | pass | — |
| 9 | fail | `devices.spec.ts:347` AC-4 |
| 10 | pass | — |
| 11 | fail | `members.spec.ts:749` AC-11 |
| 12 | fail | `devices.spec.ts:426` AC-6 |

Never more than one failure in a run, and never the same set twice.

## AC coverage

Sixteen criteria, thirty-four tests, zero failures at either level in any configuration measured.

| AC | Test name | Level | Result |
|---|---|---|---|
| AC-1 | `AC-1: every member is listed with a role, and occupancy is readable for the seated and the unseated alike` | unit | PASS |
| AC-1 | `AC-1: every member is listed with their role and their occupancy, and a create control is present` | e2e | PASS |
| AC-2 | `AC-2: the new member is listed with the role chosen, occupies no seat, and belongs to no group` | unit | PASS |
| AC-2 | `AC-2: each of the three ROLE_RANK values is a role a member can be created with` | unit | PASS |
| AC-2 | `AC-2: a member is created with the role chosen, occupies no seat, and is confirmed without a reload` | e2e | PASS |
| AC-3 | `AC-3: creation is refused when a required field is missing, blank, or no role is chosen` | e2e | PASS |
| AC-3a | `AC-3a: a duplicate email is refused with DUPLICATE_EMAIL, and the member who holds it is unchanged` | unit | PASS |
| AC-3a | `AC-3a: creation is refused when the email is already held by another member` | e2e | PASS |
| AC-3b | `AC-3b: an email differing only in case IS created, and both members are listed with their own email` | unit | PASS |
| AC-3b | `AC-3b: an email differing only in case is created, and both members are listed with their own email` | e2e | PASS |
| AC-3c | `AC-3c: creation is refused when the email is not a well-formed address` | e2e | PASS |
| AC-4 | `AC-4: the account table is untouched, and the new member has no account` | unit | PASS |
| AC-4 | `AC-4: the create form offers no way to sign in, and the member it creates has no account (INV-08)` | e2e | PASS |
| AC-5 | `AC-5: the new value is stored, the role and the occupancy are untouched, and no other member moves` | unit | PASS |
| AC-5 | `AC-5: an existing member's attributes are changed, and nothing else is` | e2e | PASS |
| AC-6 | `AC-6: USER becomes MANAGER, nothing else about them changes, and no other member's role changes` | unit | PASS |
| AC-6 | `AC-6: a member's role is changed, and nothing else about them or anyone else changes` | e2e | PASS |
| AC-7 | `AC-7: editing is refused when a required field is cleared, and the member keeps its previous values` | e2e | PASS |
| AC-7a | `AC-7a: another member's email is refused with DUPLICATE_EMAIL, and neither member is changed` | unit | PASS |
| AC-7a | `AC-7a: updating a member that does not exist is refused with NOT_FOUND and changes nothing` | unit | PASS |
| AC-7a | `AC-7a: editing is refused when the email is already held by a different member` | e2e | PASS |
| AC-7b | `AC-7b: editing is refused when the email is not a well-formed address` | e2e | PASS |
| AC-8 | `AC-8: deletion is not performed until it is confirmed` | e2e | PASS |
| AC-9 | `AC-9: the member is gone, and no member, seat or device is otherwise affected` | unit | PASS |
| AC-9 | `AC-9: deleting a member who does not exist is refused with NOT_FOUND and changes nothing` | unit | PASS |
| AC-9 | `AC-9: a member who is referenced by nothing is deleted, and no one else is affected` | e2e | PASS |
| AC-10 | `AC-10: refused with REFERENCED, the seats are named, and nothing is written` | unit | PASS |
| AC-10 | `AC-10: the refusal is repeatable — three refused deletes leave the store bit-identical` | unit | PASS |
| AC-10 | `AC-10: deleting a member who occupies a seat is refused, and the refusal names the seat (INV-12)` | e2e | PASS |
| AC-11 | `AC-11: refused with the device count, the seat half reads empty, and no device is touched` | unit | PASS |
| AC-11 | `AC-11: deleting a member who owns a device is refused, and the refusal states how many (INV-12)` | e2e | PASS (fails only as collateral of the finding below, run 11) |

**The mapping half of the gate PASSES.** All five of `ba`'s lettered criteria — AC-3a, AC-3b, AC-3c,
AC-7a, AC-7b — have named tests, and AC-11 is no longer unit-only: F-6 is closed and re-measured, and
the e2e test asserts section 6.3's load-bearing sentence *before* it depends on it.

## Failures

| # | Test | Expected | Actual | Routes to | Increments `rework_count` |
|---|---|---|---|---|---|
| 1 | `pnpm test:e2e`, seven sites, six runs in twelve | exit 0 | exit 1 — a write that already happened is absent from the rendered page for the full retry window | `tech-lead-design` | **No** (RULE-08) |

### 1 — F-7's repair holds at its own site, and the suite still exits 1 half the time

**This is F-9 in `99-questions.md`, raised at pass 2 and confirmed independently here.** Pass 2
measured 7 failures in 12; this pass measured 6 in 12 on a rebuilt tree. Same finding, same shape.

**What was prescribed and what it did.** F-7 diagnosed one unguarded snapshot at
`tests/e2e/devices.spec.ts:367-369` — a bare `innerText()` read overtaking an un-awaited
`router.refresh()` — and put that file in `allowed_paths` so QA could repair it. QA did: one retrying
assertion at `:373`, six lines including the comment. **That assertion has not failed once, in any
run, in either pass.** The repair is correct and it is not sufficient.

**Why no further test edit can fix the rest.** Every remaining failure is at an assertion that
*already retries* — `toBeVisible`, `toHaveCount(0)`, `toHaveText` — with the full five-second
timeout, and the Playwright call log shows the locator resolving repeatedly to the wrong value for
the whole of it. Nothing is read too early. **The write is not visible.** A row that was created is
absent; a row that was deleted is still present; a device designated primary still reads `SECONDARY`.

That was tested rather than asserted. Widening the two most frequent sites to a 30-second timeout and
re-running six times did not remove the failure — it moved it to a third site, at the same rate, with
run durations unchanged. The page is **stale, not slow**, and no retrying assertion fixes a write
that the next render does not carry.

**What this pass adds to F-9, and it narrows the cause considerably.** F-9 established that
withholding `members.spec.ts` makes the suite clean and that `--workers=1` passes. Both reproduce
here — 18 baseline runs of the three pre-MEM-01 spec files, 18 clean; 3 runs at `--workers=1`, 3
clean. Three further configurations were measured this pass, each removing one candidate cause:

| Configuration | Runs | Exit 0 | Exit 1 | What it rules out |
|---|---|---|---|---|
| Full suite, AC-11's e2e device write removed | 10 | 6 | **4** | The cross-spec device write. It is not the cause |
| Full suite, **every** member-write test excluded | 8 | 5 | **3** | Design version 2's `revalidatePath("/devices")`. It is not the cause |
| Full suite, `members.spec.ts` reduced to **AC-1 alone** — one read-only page load, no write of any kind | 10 | 9 | **1** | Everything MEM-01 does. A fourth client loading a page is enough |
| Full suite, `--workers=3` (baseline's concurrency) | 8 | 6 | **2** | The worker count. Baseline is clean at 3 workers; this is not |

**MEM-01 is the load, not the defect.** The narrowing that matters is the third row: with
`members.spec.ts` cut to a single test that navigates to `/members` and asserts, writing nothing, the
suite still fails. Nothing MEM-01 implemented, and nothing this stage wrote, is what breaks
`/devices`. Adding a fourth concurrent client to the single production server is.

**Where the repair lives, and why QA cannot make it.** The failing surface is `/devices`, and the
question the measurements ask — what happens to a server action against the single mutable store
while other workers write to it, on routes that are statically prerendered and whose only cache
control is `revalidatePath` — is answerable only in `src/**`, which RULE-05 closes to QA.
`src/actions/devices.ts`, `playwright.config.ts` and the device page are all outside this ticket's
`allowed_paths`. **This is F-8's family**: F-8 records that every application route is `○ (Static)`,
that four are never revalidated by anything, and that `ROO-01`'s `deleteRoom` already leaves `/seats`
and `/devices` stale in a `DONE` ticket.

**Why it routes to `tech-lead-design` and not to `developer`.** No behaviour MEM-01 implements is
wrong. All 18 of this ticket's unit tests pass, all 16 of its e2e tests pass, both invariants hold,
and the one member-side failure observed (run 11) is the same stale-page symptom reaching this
ticket's own spec rather than a defect in it. Under RULE-08 a Developer must not spend a RULE-06
budget on a defect it did not cause, so `rework_count` stays **0**. What is owed is a decision, and
it is the design's: `02-design.md` section 7 alternative H considered `--workers=1` and CI's
`retries: 2` and declined both — **the declined option is the one that measures clean**, which is a
fact alternative H did not have when it was written. Whether that changes the decision, and whether
the underlying `/devices` staleness becomes a ticket of its own beside F-8, is not QA's to answer.

**One correction to F-9, made because the record should be accurate rather than tidy.** F-9 states
that across 19 full-suite runs there was not one failure in `members.spec.ts`. This pass saw two, both
at `members.spec.ts:749` (AC-11), both the same stale-page symptom — the device create submitted from
this spec not being reflected when the refusal is read back. It does not change F-9's conclusion; it
removes the claim that the symptom is confined to `DEV-01`'s file, which made the defect look more
like another ticket's than it is.

## Invariant observations

| Invariant | Held | Evidence |
|---|---|---|
| INV-08 | **Held** | `INV-08: no member this suite created holds a sign-in account` sweeps every member this file created and asserts its own non-vacuity first; `accounts.listAccounts()` is unchanged across every create. The e2e half inspects every field and control the create form offers and finds no credential input, and the created member's `members-row-<email>-signin` cell reads `no account` against seeded rows that read `account` |
| INV-12 | **Held** | `INV-12: no member who occupies a seat or owns a device can be deleted` sweeps **every** member the store holds, not the two the criteria picked. `INV-12: getMemberReferences reports both halves for every member, always` confirms section 1.2 rule 3's empty-and-zero requirement. `AC-10: the refusal is repeatable` runs three consecutive refused deletes and asserts the store is bit-identical after, which is what tells a refusal from a remove-and-restore. Both halves are tested apart: AC-10 with occupancy and no device, AC-11 with a device and no occupancy |

**Nothing escalates under RULE-07, and that is a deliberate statement rather than a silence.** Three
of the failing `devices.spec.ts` tests carry invariant IDs in their names — `AC-5` and `AC-6` name
INV-04 and INV-07, `AC-8` names INV-05. **No invariant was observed false.** The symptom in every case
is a *missing* effect: an act whose result the page does not show. A drop cannot produce two primaries
on one seat, and the unit probes for INV-04, INV-05, INV-06, INV-08 and INV-12 all pass on the same
tree. QA cannot read the write path to prove the failure mode is only ever a drop (RULE-05), so this
is recorded as a question for the design in F-9 rather than escalated on a name.

## Selector gaps encountered

**None outstanding, and no test was written against a selector absent from section 6.**

- **G-1 is closed.** Pass 1's F-6 — a member created on `/members` absent from `device-create-owner`
  on `/devices` — was resolved by design version 2 and re-measured here. AC-11's e2e test navigates
  straight from the create to `/devices` with no intervening device write, and the new member is in
  the select. The assertion sits before the device create, so what passes is the revalidation and not
  an accident of ordering.
- **G-3, corrected in place rather than raised.** Pass 2's AC-11 test waited on `device-create-dialog`,
  which is not one of the five `DEV-01` selectors section 6.3 restates. It now waits on
  `device-create-owner`, which is. No question is asked of `tech-lead-design` because nothing was
  missing — a sixth selector was reached for where the fifth already did the job.
- **G-2 stands, recorded and not blocking.** Section 6.1 points out of section 6 at section 1.1 for
  the refusal reason strings and calls them part of the contract. Read as an extension of the channel,
  exactly as `tests/unit/devices.test.ts` read the identical sentence on `DEV-01`.

## Verdict

**FAIL**, with one routed finding and no escalation.

- **Mapping half of the gate: PASS.** Sixteen criteria, thirty-four named tests, no criterion
  uncovered and none unit-only.
- **Command half of the gate: FAIL.** `pnpm test` exits 0. `pnpm test:e2e` exits 1 on six runs in
  twelve.
- **Routes to `tech-lead-design`** — F-9, extended with three new configurations that rule out every
  MEM-01-specific cause. **`rework_count` stays 0** (RULE-08): nothing here is the Developer's.
- **Nothing escalates** (RULE-07). INV-08 and INV-12 both hold.
- **Still a human's, and unchanged:** F-4, F-5, F-8, and the merge-ordering item in `02-design.md`
  section 0 — `55054cb` is unmerged, so `origin/main...HEAD` carries the registry commit and the
  DEV-01 ledger backfill, and `scripts/check-allowed-paths.mjs` computes exactly that diff. Nothing is
  committed yet, so the remedy is still a rebase.

**Written this stage:** `05-test-plan.md` (rewritten for pass 3), this report (pass 3 appended above
pass 1, which is untouched), `99-questions.md` (F-9 extended, additively),
`tests/e2e/members.spec.ts` (AC-11's dialog wait moved onto a section 6.3 selector), and
`ticket.yaml`. `tests/unit/members.test.ts` and `tests/e2e/devices.spec.ts` were read and run but not
changed. Nothing under `src/**` was read (RULE-05) or written.

**`chat_budget` is unchanged**; `qa->ba` and `qa->tech-lead-design` both still read `used: 0`. F-9
reaches `tech-lead-design` as a file, in a session with no channel.

---

# Pass 1 — 2026-08-23T10:31:00Z

*Kept verbatim. It attests to an eleven-criterion suite against version 1 of the design; both are
gone, and the frontmatter above governs.*

## Results

| Suite | Command | Exit code | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| unit | `pnpm test` | **0** | 75 | 0 | 0 |
| e2e | `pnpm test:e2e` | **1** on ten of fifteen runs, **0** on five | 48 when it passes; 37 when it does not | 1 | 0 passing, 10 not run when it fails |

**The unit suite is unambiguous.** 75 tests across five files, exit 0, no skips, repeatable. Fourteen
of the 75 are `tests/unit/members.test.ts`, written for this ticket; the other 61 are the existing
`rooms`, `devices`, `permissions` and `seam-parity` files, unchanged and still green.

**The e2e suite is not, and a suite that exits 0 two times in three is a failing suite.** Fifteen runs
of `pnpm test:e2e` on this machine: five exit 0 and ten exit 1. Every failure is the same test,
`tests/e2e/devices.spec.ts:347` — `DEV-01`'s AC-4 — and the ten that follow it in that file are then
not run, because it is a serial-mode file. `tests/e2e/members.spec.ts` has never failed: run alone it
is 10 passed, ten times out of ten. Finding **3** below is the whole account of it.

`pnpm typecheck` and `pnpm lint` both exit 0 with the two new files in the tree; lint reports no
error and no warning.

## AC coverage

Every AC from the story appears here. Test names are verbatim.

| AC | Test name | Level | Result |
|---|---|---|---|
| AC-1 | `AC-1: every member is listed with a role, and occupancy is readable for the seated and the unseated alike` | unit | PASS |
| AC-1 | `AC-1: every member is listed with their role and their occupancy, and a create control is present` | e2e | PASS |
| AC-2 | `AC-2: the new member is listed with the role chosen, occupies no seat, and belongs to no group` | unit | PASS |
| AC-2 | `AC-2: each of the three ROLE_RANK values is a role a member can be created with` | unit | PASS |
| AC-2 | `AC-2: a member is created with the role chosen, occupies no seat, and is confirmed without a reload` | e2e | PASS |
| AC-3 | `AC-3: creation is refused when a required field is missing, blank, or no role is chosen` | e2e | PASS |
| AC-4 | `AC-4: the account table is untouched, and the new member has no account` | unit | PASS |
| AC-4 | `AC-4: the create form offers no way to sign in, and the member it creates has no account (INV-08)` | e2e | PASS |
| AC-5 | `AC-5: the new value is stored, the role and the occupancy are untouched, and no other member moves` | unit | PASS |
| AC-5 | `AC-5: an existing member's attributes are changed, and nothing else is` | e2e | PASS |
| AC-6 | `AC-6: USER becomes MANAGER, nothing else about them changes, and no other member's role changes` | unit | PASS |
| AC-6 | `AC-6: a member's role is changed, and nothing else about them or anyone else changes` | e2e | PASS |
| AC-7 | `AC-7: editing is refused when a required field is cleared, and the member keeps its previous values` | e2e | PASS |
| AC-8 | `AC-8: deletion is not performed until it is confirmed` | e2e | PASS |
| AC-9 | `AC-9: the member is gone, and no member, seat or device is otherwise affected` | unit | PASS |
| AC-9 | `AC-9: deleting a member who does not exist is refused with NOT_FOUND and changes nothing` | unit | PASS |
| AC-9 | `AC-9: a member who is referenced by nothing is deleted, and no one else is affected` | e2e | PASS |
| AC-10 | `AC-10: refused with REFERENCED, the seats are named, and nothing is written` | unit | PASS |
| AC-10 | `AC-10: the refusal is repeatable — three refused deletes leave the store bit-identical` | unit | PASS |
| AC-10 | `AC-10: deleting a member who occupies a seat is refused, and the refusal names the seat (INV-12)` | e2e | PASS |
| AC-11 | `AC-11: refused with the device count, the seat half reads empty, and no device is touched` | unit | PASS |

**Eleven criteria, twenty-one tests, no AC without a row and no test that failed.** The mapping is
complete and the specified behaviour is correct everywhere it was checked.

**AC-11 has no e2e row.** That is finding **2**, not an omission, and section 6.3 is what permits the
seam route it took.

## Failures

Routing is from the failure routing table in `.ai/01-operating-model.md`. No item below is *behaviour
that is wrong*: nothing the story specifies was found to be implemented incorrectly, at either level.

| # | Test | Expected | Actual | Routes to | Increments `rework_count` |
|---|---|---|---|---|---|
| 1 | — (no test exists to fail) | AC-3 and AC-7 name the three refusals the code performs, and AC-2, AC-3, AC-5 and AC-7 name the member's fields | `01-story.md` was never amended for F-1, F-2 or F-3; three specified refusals have no criterion and four criteria have no field set | `ba` | **No** — RULE-08 |
| 2 | — (the e2e test this blocked was not written) | Section 6.3: a member created on `/members` appears in `device-create-owner` on `/devices` | It does not, until any device write revalidates `/devices`; section 1.4 step 5 revalidates `/members` only | `tech-lead-design` | **No** |
| 3 | `tests/e2e/devices.spec.ts:347` — `AC-4: an existing device's attributes are changed, and its seat and designation are not` | `pnpm test:e2e` exits 0 | Exits 1 on ten of fifteen runs; the file is outside MEM-01's `allowed_paths` | `tech-lead-design` | **No** |

### 1 — F-1, F-2 and F-3 were never amended into the story, and QA may not invent the criteria

**Routes to `ba`. Does not increment `rework_count`.**

`02-design.md` section 0 raised five findings. Three of them — F-1, F-2 and F-3 — are routed to `ba`
in `99-questions.md`, are each marked ***Blocks: QA, not IN_PROGRESS***, and are named again in
`ticket.yaml`'s `spec` gate note and again in its `review` gate note, the second of which says in
terms: *"One RULE-14 amendment pass over 01-story.md is owed BEFORE /qa runs; QA may not invent a
criterion for a refusal it finds in the code."*

`01-story.md`'s Changelog ends at `2026-08-23T09:19:29Z`, which is nine minutes before `02-design.md`
was produced. **No amendment pass happened.** The story is the same document that DESIGN found
incomplete.

What that costs, precisely:

| Finding | Behaviour that exists | Criterion that names it |
|---|---|---|
| F-1 | `createMember` refuses a duplicate email (`DUPLICATE_EMAIL`, exact not case-folded) | none — `01-story.md` A-2 still asserts that no field of a Member is unique |
| F-1 | `updateMember` refuses a duplicate email against any *other* member | none |
| F-3 | The email format is refused — `member-create-email-error` renders *"That is not a valid email address."* | none — and section 6 marks both selectors *pending F-1 and F-3* |
| F-2 | The member's fields are `fullName`, `email` and `role`; `groupId` is deliberately not on the form | none — AC-2, AC-3, AC-5 and AC-7 still read *"every required field"* |

The first three are the material half. **Three refusals ship with no acceptance criterion, and the
QA gate is a mapping from criteria to tests**, so a refusal with no criterion has no test and the
mapping still reads complete. That is the exact failure mode the Definition of Done's completeness
requirement exists to prevent, arriving from the direction the requirement does not look in.

F-2 costs less, and it is worth saying why rather than lumping it in. Section 6 names the three form
inputs and their three error elements, so QA could write AC-3 and AC-7 against the right field set
without the amendment — which is what happened, and it is why AC-3 and AC-7 have tests and pass. The
amendment would make the criteria specific rather than change them, exactly as `01-story.md`'s Q-2
predicted. **F-2 alone would not have failed this gate.** F-1 and F-3 do.

**Why `ba` and not `developer`.** The Developer implemented what section 1.1, section 1.3 and section
1.4 specify; every one of those refusals is in the contract it was handed. The defect is that the
story never acquired the criteria the design asked it for. Per RULE-08 and the note under the routing
table, charging that to the Developer would burn a RULE-06 budget for a defect it did not cause and
cannot fix.

**What has to happen.** One RULE-14 amendment pass over `01-story.md`: a duplicate-email clause in
AC-3 and in AC-7, a malformed-email clause in AC-3 and in AC-7 or a recorded decision that the format
is not checked, and AC-2, AC-3, AC-5 and AC-7 narrowed from *"every required field"* to `fullName`,
`email`, `role`. F-1 carries the note that the refusal is exact and not case-folded, and that
matching case-insensitively would be stricter than the model and therefore invented. Then `/qa` runs
again in a new session (RULE-13) and adds the tests for whatever the amended criteria say.

### 2 — section 6.3 asserts something section 1.4 makes impossible

**Routes to `tech-lead-design`. Does not increment `rework_count`. Raised as F-6 in
`99-questions.md`.**

Section 6.3 restates five `DEV-01` selectors so the member spec can give a just-created member a
device, and closes: *"The new member appears in that select because it lists every member the system
holds — which is `DEV-01`'s AC-2, and is the sentence in `01-story.md`'s User value section that this
ticket makes true."*

**Measured, three ways, and it does not.**

1. Create a member through `/members`, navigate to `/devices`, open the create dialog:
   `device-create-owner` holds **4** options — the empty placeholder and three members. The new
   member is absent.
2. Hard-reload `/devices` and reopen the dialog: still **4**. It is not the client router cache.
3. In the same session, create one device with a seeded owner — which revalidates `/devices` — and
   reopen the dialog: **5**. The new member is now there, and selecting it succeeds.

The member itself is fine: `/members` reloaded shows four rows including the new one, so the write
landed and the store holds it. It is `/devices` that is stale.

**Section 1.4 step 5 is the mechanism, and it also settles the routing.** It specifies
`revalidatePath("/members")` on the three write actions and nothing else. The implementation matches
the contract it was given exactly, so this is not *behaviour that is wrong* and it is not the
Developer's. Sections 1.4 and 6.3 of the same document contradict each other, and which of the two is
right is a design decision:

- If **6.3** is right, `src/actions/members.ts` — which *is* in `allowed_paths` — also revalidates
  `/devices`, and section 1.4 step 5 says so. That is a one-line contract change and then a
  Developer's rework.
- If **1.4** is right, section 6.3's closing sentence is struck and QA covers AC-11 at the seam
  permanently, which is what it does today.

**It is worth deciding rather than striking, because the sentence describes a real capability.** A
Manager creates a member in order to give them a device; on this build the person they just created
is not in the picker until an unrelated device write happens to refresh the page. No criterion in
`01-story.md` asserts it — which is why this is a finding and not a failed test — but `DEV-01`'s
AC-2 does say an owner is *chosen from the members the system holds*, and `01-story.md`'s User value
section says that sentence is *"only true because MEM-01 is what holds them"*. `DEV-01` is `DONE` and
its own suite cannot see this, because it never creates a member.

**What QA did with it.** AC-11 is covered at the seam by
`AC-11: refused with the device count, the seat half reads empty, and no device is touched`, which
builds the Given with `devices.createDevice` and asserts the refusal, the device count and the empty
seat half. Section 6.3 names that route itself and leaves the choice to QA. The e2e test was **not**
written by creating a throwaway device first to force the revalidation: that would be a test written
around the defect, and it would report green on the day the defect is fixed and on every day before
it. The gap is a comment at the foot of `tests/e2e/members.spec.ts` rather than a silence.

### 3 — `pnpm test:e2e` exits 1 more often than it exits 0, in a file this ticket may not touch

**Routes to `tech-lead-design`. Does not increment `rework_count`. Raised as F-7 in
`99-questions.md`.**

Fifteen runs of `pnpm test:e2e` at the configured worker count: **five exit 0, ten exit 1**. Every
failure is the same assertion.

```
tests/e2e/devices.spec.ts:370
  expect(after.model, "the list shows that device with the new value").toBe("QA model AC4 after")
  Expected: "QA model AC4 after"
  Received: "QA model AC4 before"
```

That is `DEV-01`'s `AC-4: an existing device's attributes are changed, and its seat and designation
are not`, declared at line 347. `devices.spec.ts` is a serial-mode file, so the ten tests after it do
not run, which is where the "37 passed, 10 did not run" shape in the Results table comes from.

**What was measured, so the cause is narrowed rather than guessed:**

| Configuration | Result |
|---|---|
| `tests/e2e/members.spec.ts` alone | 10 passed, every time |
| `devices` + `rooms` + `smoke` — the three files that existed before this ticket | 38 passed |
| `devices` + `rooms` | 24 passed |
| `devices` + `members` | 24 passed |
| All four files, `--workers=1` | 48 passed, twice |
| All four files, configured workers | 5 pass / 10 fail out of 15 |

**The trigger is a fourth spec file.** `playwright.config.ts` sets `fullyParallel: true`, a serial
file occupies one worker, and this machine reports 8 CPUs, so adding `members.spec.ts` takes the
concurrency against the single production server from three to four. Nothing about *which* file is
fourth appears to matter: `members.spec.ts` never visits `/devices`, writes no device and no seat,
and pairs cleanly with `devices.spec.ts` on its own.

**What the failure looks like from outside.** The edit dialog closes, which means the action returned
success, and the row still shows the old model. The page snapshot captured at failure shows one AC-4
row, reading `QA model AC4 before`, owned by a seeded member — so no member this suite created is
involved. Line 370 is a plain `innerText()` read rather than a retrying assertion, so it takes one
sample and does not wait.

**Two hypotheses, and QA cannot choose between them from here.**

- **The assertion is early.** A server action returns before the refreshed list has landed, so the
  read at line 370 loses a race that only opens under load. The fix is a retrying assertion on the
  model cell before the snapshot — one line, in `tests/e2e/devices.spec.ts`.
- **The surface reports success before the list reflects it.** Same symptom, but the defect is in the
  product rather than the test, and it would be worth a criterion.

Distinguishing them means re-reading the cell until it changes or a timeout expires, in a file this
stage may not edit, or reading `src/**`, which RULE-05 forbids.

**Why this is not MEM-01's to fix.** `tests/e2e/devices.spec.ts` is not in `allowed_paths` — RULE-03
— and extending `allowed_paths` is `tech-lead-design`'s at DESIGN. The three files this ticket may
write are `tests/unit/members.test.ts`, `tests/e2e/members.spec.ts` and the ticket folder, and no edit
to any of them removes a fourth worker from the pool.

**What was done from inside `allowed_paths`, and what it did not achieve.** The same latent race
exists in `tests/e2e/members.spec.ts` wherever a snapshot follows a write, so AC-2, AC-5 and AC-6 now
each carry a retrying `toHaveText` on the changed cell before the snapshot is taken. That is why the
member spec has never failed, and it is offered as the shape the one-line fix would take. It does not
change the exit code, because the failing test is in another file.

**One thing the fix must not be.** `playwright.config.ts` already sets `retries: 2` under CI, so CI
will very likely mask this and report green. That makes the local exit code the honest signal and the
CI one the misleading one, which is the reverse of the usual assumption and is the reason this finding
is written out at length rather than filed as a flake.

## Invariant observations

| Invariant | Held | Evidence |
|---|---|---|
| **INV-08** | **Held** | `INV-08: no member this suite created holds a sign-in account` sweeps every member created by the unit file against `accounts.listAccounts()` and finds none with an account row; it asserts first that it created some, so the sweep is not vacuous. `AC-4: the account table is untouched, and the new member has no account` shows the account table bit-identical across a create. At the surface, `AC-4: the create form offers no way to sign in...` finds no password input, no field whose type, name, id, placeholder or autocomplete mentions a credential, no control offering to invite or grant access, the standing `member-create-no-account` statement present, and the new member's `signin` cell reading `no account` — against a list in which some rows read `account`, so the assertion is informative rather than trivially true |
| **INV-12** | **Held** | `INV-12: no member who occupies a seat or owns a device can be deleted` attempts a delete against **every** referenced member the store holds, not the two the criteria picked, and none succeeds; it asserts the referenced set is non-empty first. `AC-10: the refusal is repeatable` shows the member list and seat occupancy bit-identical after three consecutive refused deletes, which is what distinguishes a refusal that writes nothing from one that removes and restores. `AC-10` and `AC-11` each assert the two halves separately — the seat half with an empty device count, the device half with an empty seat list — so a system enforcing one and not the other fails a test rather than passing a combined one. `INV-12: getMemberReferences reports both halves for every member, always` holds section 1.2 rule 3: empty and zero rather than absent, sorted, and agreeing with `seats.listSeats()` for every member |

**No invariant violation was observed, and nothing escalates.** RULE-07 is not engaged and
`next_state` is `REWORK`, not `ESCALATED`.

Two things this stage could **not** verify, stated rather than left as silence:

- **The three declared cascades in F-4** — `Account.member`, `SeatRequest.requester`,
  `Account.createdBy`. F-4's own proof is that no member holding an account or a request is
  deletable, so no test can enter those branches. `AC-9: the member is gone...` asserts the account
  table untouched by a delete that *does* succeed, which is the strongest statement available. The
  branches remain unreachable and uncovered, exactly as F-4 says.
- **The Prisma implementation.** `DATA_SOURCE=mock` throughout. `tests/unit/seam-parity.test.ts` is
  what covers the swap; it is not this ticket's file and it passes unchanged.

## Selector gaps encountered

**No test in either new file was written against a selector absent from design section 6.** All 41
rows of the section 6 table resolved in the markup where a test needed them, the two shared-component
prefixes behaved as documented, and none of the six notes under the table proved wrong — the two
delete dialogs are distinct elements and only one opens, `-refused-seats` and `-refused-devices`
render bare values including when empty, the `-error` elements are absent until the corresponding
failure occurs, the role select carries the empty placeholder in both create and edit, and the
sign-in cell distinguishes the seeded members from every member this surface creates.

Two things outside section 6 were read, and both are declared rather than hidden:

- **Sections 1.1 and 1.2**, for the refusal reason strings and the seam signatures, because section
  6.1 points at 1.1 and says *"assert on them by value"*. `tests/unit/devices.test.ts` recorded the
  identical pointer on `DEV-01`. `DUPLICATE_EMAIL`, `NOT_FOUND` and `REFERENCED` are asserted by
  value, and without them a refusal test cannot tell `NOT_FOUND` from `REFERENCED` — the distinction
  AC-9 and AC-10 turn on.
- **Section 1.4**, read *after* finding 2 surfaced and *only* to decide who it routes to. It changed
  no test; every test in both files was written before it was opened. Without it, finding 2 would
  have been reported as a wrong behaviour against the Developer, which would have been wrong and
  would have cost a RULE-06 budget point.

**One gap, and it is finding 2.** Section 6.3's device route to AC-11's Given does not work, AC-11 is
covered at the seam instead on the permission section 6.3 itself grants, and the e2e test was not
written around the defect.

## Verdict

**`FAIL`**, with three routed items and no escalation.

| Item | Routes to | Increments `rework_count` |
|---|---|---|
| 1 — F-1, F-2, F-3 never amended into `01-story.md` | `ba` | No |
| 2 — section 6.3 contradicts section 1.4 | `tech-lead-design` | No |
| 3 — `pnpm test:e2e` exits 1 in ten of fifteen runs, at `tests/e2e/devices.spec.ts:347` | `tech-lead-design` | No |

`rework_count` stays **0**. Nothing here is the Developer's, and RULE-08 exists so that a Developer
who correctly implemented the contract it was handed does not spend its RULE-06 budget on defects
upstream of it.

**What is true and should not be lost in the failure.** Every one of the eleven acceptance criteria
is mapped to at least one named test, twenty-one tests in all, and not one of them failed. Both
invariants hold under sweeps that assert their own non-vacuity. The unit suite is green and
repeatable. The specified behaviour of this ticket is correct everywhere it was checked; what fails
is the specification's completeness, one sentence of the design that contradicts another, and an exit
code owned by a file this ticket may not open.

**Item 1 is the one that must be cleared first**, because it changes what the tests are. Items 2 and
3 do not, and both could be settled in parallel.

Both suites and both artifacts are on disk. A re-run after the amendment opens another new session
(RULE-13) and adds tests for whatever the amended criteria say.
