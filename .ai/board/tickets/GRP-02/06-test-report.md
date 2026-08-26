---
ticket: GRP-02
stage: QA
agent: qa
produced_at: 2026-08-26T06:43:59Z
inputs_read: [ .ai/board/tickets/GRP-02/01-story.md, ".ai/board/tickets/GRP-02/02-design.md — section 6 only", .ai/board/tickets/GRP-02/05-test-plan.md, .ai/board/tickets/GRP-02/99-questions.md, .ai/board/tickets/GRP-02/ticket.yaml ]
consulted:
  - with: tech-lead-design
    asked: "F-1 in 99-questions.md — section 6 names no seam call, so `tests/unit/member-groups.test.ts` cannot be written under RULE-05."
    answer: "Not answered, and the gate does not wait on it. Non-blocking: all eleven criteria are covered at e2e."
    resulted_in_amendment: false
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: DONE
---

# GRP-02 — test report

**Isolated dispatch** (RULE-13). This session was fresh, read files only, and held no message
channel to `developer` or `tech-lead-review`; it wrote to neither. `03-impl-log.md` and `04-review.md`
are both in the ticket folder and neither was opened, so this report tests the story rather than the
reviewer's conclusions. `chat_before_verdict: none` is an attestation under RULE-12 and is true as
written. The one channel used is `99-questions.md` to `tech-lead-design`, which the topology allows,
which points backwards, and which is recorded in `consulted`.

**`src/**` was not read** (RULE-05). Section 6 of `02-design.md` was read; sections 0 to 5 and 7 were
not.

**`ticket.yaml` is not touched by this stage and this report does not mark the ticket `DONE`.**
`next_state: DONE` in the front-matter above is what this gate permits, not a transition this session
performed. `DONE` belongs to `orchestrator` at `/ship`, after the full Definition of Done and the
pull request.

Everything below stands alone (RULE-16). This is pass 1.

## Results

| Suite | Command | Exit code | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| unit | `pnpm test` | 0 | 126 | 0 | 0 |
| e2e | `pnpm test:e2e` | 0 | 96 | 0 | 0 |

Both exit codes were read from the shell, not inferred from the summary line. 8 unit files, 126 tests,
2.1s. 96 e2e tests in 43.6s against a production build in mock mode, `workers: 1`, run with `CI=1` so
`forbidOnly` is on and the reporter is deterministic.

**14 of the 96 e2e tests are this ticket's**, all in `tests/e2e/member-groups.spec.ts`: eleven
criteria and three section-6.3 guards. The other 82 are the suites this ticket did not write, and they
are reported here because they are the evidence for AC-8, AC-10 and AC-11 not being asserted only by
this ticket's own snapshots — `tests/e2e/members.spec.ts`, `tests/e2e/seats.spec.ts` and
`tests/e2e/devices.spec.ts` all pass unchanged alongside the new column and the new dialog.

`pnpm typecheck` and `pnpm lint` were also run: typecheck clean, lint 0 errors and 3 warnings, all
three pre-existing in `tests/e2e/groups.spec.ts` and `tests/unit/groups.test.ts` and none in a file
this stage wrote.

**No test is skipped.** A skipped test would count as absent coverage rather than as a pass, and there
are none.

## AC coverage

Every AC from the story appears here. All are `tests/e2e/member-groups.spec.ts`.

| AC | Test name | Result |
|---|---|---|
| AC-1 | `AC-1: the members list shows each member's group by name, never its identifier` | PASS (607ms) |
| AC-2 | `AC-2: a member who belongs to no group is shown as belonging to no group` | PASS (312ms) |
| AC-3 | `AC-3: a member with no group is assigned to one, and the list shows it without a reload` | PASS (586ms) |
| AC-4 | `AC-4: a member is re-assigned between groups, and no other member's group changes` | PASS (1.2s) |
| AC-5 | `AC-5: every group in the tree is offered including nested ones, nothing else is, and the chooser is not free text` | PASS (796ms) |
| AC-6 | `AC-6: assignment is refused when the chosen group no longer exists, and the member is unchanged` | PASS (684ms) |
| AC-7 | `AC-7: a member belongs to at most one group, and no surface offers a way to hold both` | PASS (879ms) |
| AC-8 | `AC-8: assigning a member changes nothing else about that member` | PASS (845ms) |
| AC-9 | `AC-9: nothing on this surface deletes a Member (INV-12)` | PASS (670ms) |
| AC-10 | `AC-10: nothing on this surface creates, renames, moves or deletes a group` | PASS (703ms) |
| AC-11 | `AC-11: nothing on this surface touches a seat, a device, a room or an occupancy` | PASS (847ms) |

Three tests carry no AC and guard a section-6.3 sentence each.

| Section 6.3 | Test name | Result |
|---|---|---|
| item 2 | `F-4 (section 6.3 item 2): submitting with the placeholder chosen is refused and does not unassign` | PASS (743ms) |
| item 3 | `F-5 (section 6.3 item 3): assigning a member to the group they already belong to succeeds` | PASS (630ms) |
| item 6 | `F-3 (section 6.3 item 6): a group rename is visible on /members, which is what the revalidation buys` | PASS (703ms) |

**Four behavioural claims are worth naming as confirmed rather than left inside a row**, because each
is a thing the design asserted and QA measured:

- **The chooser labels options with the full path**, `Engineering/Platform` and not `Platform`
  (section 6.3 item 1). AC-5 builds a nested pair and asserts the chooser's non-placeholder labels
  equal the set of `groups-row-<path>` paths exactly.
- **AC-6's Given is constructible exactly as section 6.3 item 4 describes it** — open the dialog,
  delete the group from a second page on the same context, return and submit. The refusal renders in
  `member-assign-group-error`, the dialog stays open, and the cell still reads `none`.
- **The placeholder does not unassign** (section 6.3 item 2). F-4 tests the half that matters: a
  member who *is* in a group, submitted with the placeholder chosen, gets `A group is required.` and
  keeps their group. The *remove from group* verb the story declined to grant has not appeared by
  accident.
- **The three `revalidatePath("/members")` lines are load-bearing** (section 6.3 item 6). F-3 renames
  a group on `/groups` and reads the new name on `/members`. MEM-01's F-6 was the same test failing.

## Failures

| # | Test | Expected | Actual | Routes to | Increments rework_count |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

**None.** Nothing routes to `developer`, nothing routes to `ba`, `rework_count` stays at 0, and RULE-06
is not engaged.

## Invariant observations

`invariants_touched` is `[]` — considered, none engaged. The story's argument is that no relation
exists from a Group to a Seat, a Device or a Room for a cascade to travel along, because the glossary
states group membership is independent of seat occupancy. **This report does not accept that on
trust**; it measured the surfaces a cascade would have to show up on.

| Invariant | Held | Evidence |
|---|---|---|
| INV-12 — a Member may not be deleted while occupying a seat or owning a device | Held, not engaged | AC-9: the set of listed emails is identical across every control this ticket adds, `member-assign-dialog` contains no `[data-testid*="delete"]`, and `member-delete-confirm` is absent while it is open. Nothing on this surface deletes a member, so INV-12 is never reached. |
| INV-01, INV-02 — seat occupancy | Held, not engaged | AC-8 and AC-11: the whole `seats-row-<code>-occupant` map is identical before and after an assignment. AC-11 first asserts at least one seat is occupied, so the comparison is not vacuous. |
| INV-03 — seat status is derived, never stored | Held, not engaged | AC-11: the whole `seats-row-<code>-status` map is identical across the assignment. |
| INV-04, INV-05, INV-06, INV-07 — device ownership and designation | Held, not engaged | AC-8 and AC-11: `devices-row-<assetTag>-{owner,seat,rank}` identical across the assignment, `-rank` included, so a silently downgraded primary would show. AC-11 asserts at least one device is owned first. |
| INV-08 — there is no self-signup | Held, not engaged | Not probed by this file and it does not need to be: this ticket creates no account. `members-row-<email>-signin` is asserted unchanged in AC-8, and `tests/e2e/self-signup.spec.ts` — four tests, all passing in this run — owns the invariant. |
| INV-10, INV-11 — room geometry and the room cascade | Held, not engaged, and probed indirectly | No room selector reaches QA through section 6, so the probe is the unchanged seat table plus the absence of any room control inside `member-assign-dialog` (AC-10's dialog sweep). INV-11 makes seats the only thing that travels from a room. Stated as indirect rather than claimed as direct. |

**No violation.** RULE-07 is not engaged and nothing escalates.

## Selector gaps encountered

**None, and no test was written against a selector absent from section 6.** Every control the eleven
criteria need is in section 6's first table or in the three tables section 6.4 restates.

Three things that could be mistaken for gaps in review, each stated so the reader does not have to
reconstruct it:

1. **The dialog-wrapper testids were deliberately not used.** `member-create-dialog`,
   `member-delete-dialog`, `group-create-dialog` and `group-delete-dialog` all exist in the markup and
   are used by `tests/e2e/members.spec.ts` and `tests/e2e/groups.spec.ts`, but section 6.4 does not
   restate them — so per section 6's own opening line they do not exist as far as this session is
   concerned. Every wait in the new file is on a control section 6.4 *does* list. This is the same
   technique `tests/e2e/members.spec.ts` records for `device-create-dialog`.
2. **AC-6's refusal message is asserted for existence, not by value.** The story says *a message
   saying the group no longer exists*; the string itself is a section 1 fact and section 6 does not
   restate it. The test asserts the element is visible and non-empty and puts the weight on the two
   things it can state exactly — the dialog does not close, and the member's group does not move.
   F-4's string *is* asserted by value, `A group is required.`, because section 6.3 item 2 gives it
   verbatim.
3. **AC-11's *a room* has no room selector.** Covered as the unchanged seat table plus the absence of
   a room control in the dialog. `05-test-plan.md` carries the full argument.

### F-1 — the one real gap, and it is not a selector gap

**`tests/unit/member-groups.test.ts` is an enumerated `allowed_path` and this stage left it empty.**
Section 6 is a `data-testid` contract and names no seam call, so a unit test has no function to
address, and RULE-05 forbids going to `src/**` to find one. Section 6.4's closing line points at
*"section 3.1"*, which `/qa` does not dispatch. `tests/unit/members.test.ts` and
`tests/unit/groups.test.ts` each open by recording that their design's section 6 named the seam calls
they were permitted to make; this one does not, which makes it a regression against two worked
precedents rather than a novel omission.

Raised as `99-questions.md` F-1, routed to `tech-lead-design`, non-blocking, and to be fixed by
amending section 6 rather than by answering in place (RULE-14).

**It does not cost coverage. It costs strength, and the cost is specific.** All eleven criteria are
covered — an acceptance criterion is by definition observable from outside the system, and each one is
observed. What is weaker is the four *nothing else changed* criteria: AC-8, AC-9, AC-10 and AC-11 are
asserted by reading rendered tables, so a write that changed a field no column renders would pass
them. Section 6.4 concedes the same point in its own words.

**Nothing was guessed to close it.** No export name was invented and no assumed field was asserted.

## One thing outside the gate, recorded because nobody asked and nobody would otherwise notice

**Anyone who can reach this application can now move any person into any department.** That is the
story's own Permissions section, not a finding — there is no session, no `Member.role` to compare
against and no `AUT` feature, so no row of that table is enforced anywhere. Before this ticket the
worst an unauthenticated caller could do to group membership was lose it, via GRP-01's delete path.
This ticket makes the field writable in the direction that carries information, which is the point of
it, and simultaneously makes the missing gate matter for the first time.

`Q-2` — *may a Manager assign a member to a group* — is open and is the operator's. It is not a QA
finding and it does not affect this gate: out-of-scope item 11 says no rank gate is built here, and
none was expected. It is written down because the risk changed shape today and the artifact that
records it should say so.

## Verdict

**`PASS`.**

Every `AC-n` from `01-story.md` maps to at least one named test, `pnpm test` exits 0 and
`pnpm test:e2e` exits 0. No invariant is violated. Nothing routes to `developer` and nothing routes to
`ba`; `rework_count` stays at 0.

One non-blocking finding is open — F-1, the absent seam-level unit file — routed to
`tech-lead-design` in `99-questions.md`. It is stated in full above rather than only there.
