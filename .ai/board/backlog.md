---
doc_version: 1
last_updated: 2026-08-10
governed_by: [RULE-06, RULE-10]
---

# Backlog

**An ordered list, not a scored one.** A human reorders rows; the orchestrator takes the top of
READY. There is deliberately no priority algorithm, no score column, and no estimate-derived ranking.

**This is a view.** `ticket.yaml` is authoritative. On disagreement the orchestrator repairs this
file and does not touch `ticket.yaml` to make the view right.

## READY

Tickets that have been through SPEC and passed the full Definition of Ready. **READY means
specified, sized, and safe to design** — the next stage for a row here is DESIGN, not SPEC.

| # | Ticket | Title | Size | Depends on |
|---|--------|-------|------|------------|

Empty, and empty for a different reason than when this note was written. It read "both tickets that
have existed are `DONE`" when there were two; there are now five, three of them `DONE` and two in
flight past this gate. Nothing sits here because READY is a transient row — a ticket that passes DoR
is dispatched to DESIGN rather than parked. A new row still needs a feature in
`.ai/registry/features.md` first; five of the ten group tables are still bare — AUT, GRP, LAY, REG and DSH.

## BACKLOG

Tickets awaiting SPEC. **Ordered.** A human reorders; the orchestrator takes the top.

Under the current gate placement a ticket sits here until it has been specified — DoR is evaluated
*after* SPEC. A row still at `BACKLOG` has not failed DoR; it has not reached it. A row showing a
later state is in flight and appears here because this file has no in-flight section.

| # | Ticket | Title | State | Blocked on |
|---|--------|-------|-------|------------|
| 1 | SYS-01 | Replace Better Auth with Supabase Auth | IN_PROGRESS | nothing — SPEC and DESIGN passed, `feat/SYS-01` pushed and free |

`DEV-01` returned to the board on 2026-08-23 as the first ticket seeded under the normal path
rather than by Phase C, ran the full loop the same day, and is `DONE`.

`MEM-01` was added the same day, and it is the first registry row written by an agent rather than by
the operator — see ADR-004. **Whether it can share a window with another ticket is not settled**, and
one question at SPEC settles it: if deleting a member who occupies a seat *refuses*, its files stay
disjoint and it parallelises; if it *cascades*, INV-06 fires, the delete writes
`src/lib/data/mock/devices.ts`, and it has to run alone. Its `ticket.yaml` carries the question in
full. That question was written while DEV-01 was still in flight; DEV-01 is now `DONE`, so nothing
collides today — but the answer still decides whether MEM-01 can run beside whatever comes next.

**Repaired 2026-08-24 by `/ship MEM-01`, and the previous paragraph is worth keeping in mind rather
than kept.** It said this view was stale for rows 1 and 2 and was being left that way deliberately,
because only `/ship` commits and nothing had shipped. That reasoning held while the drift was
uncommitted; it stopped holding the moment a ship ran, which is the one command allowed to write this
file. MEM-01 has moved to ARCHIVE, and the two remaining rows now carry their real state instead of
the seeded `BACKLOG`.

**Repaired 2026-08-25 by `/ship SEA-01`.** SEA-01 has moved to ARCHIVE; the row that remains is
SYS-01, and it is `IN_PROGRESS`, which this table still has no column to explain. It is not waiting on
`/spec`: SYS-01 passed SPEC `2026-08-24T07:12:03Z` and DESIGN `2026-08-24T08:47:49Z`, and
`feat/SYS-01` is pushed and held by no worktree. It is queued for `/implement` in the implement lane —
`.ai/standards/session-model.md` lets a second feature into that lane only after the previous one has
**merged**, so SEA-01's pull request now gates it, exactly as MEM-01's gated SEA-01.

**Read MD-16 before `/implement SYS-01`.** `pnpm hooks:test` is red on `main` — ten D12 tests in
`scripts/tests/check-docs.test.mjs` still assert pre-ADR-006 semantics, verified by execution on
2026-08-25 at 69 tests / 59 pass / 10 fail. `node scripts/check-docs.mjs` itself exits 0; the check
works and its tests describe a different check. It belongs to whoever landed ADR-006, which is this
ticket's lane, and a `/review` that opens on a red suite has to separate red-because-of-me from
red-already.

`SYS-01` is the first `SYS` ticket and the first that replaces infrastructure rather than adding a
screen. It exists because ADR-006 was accepted on 2026-08-24; the feature row and this row were
written in the same change as the seed, so no ticket ever existed without its registry row.

`ROO-01` was first deliberately: it measured whether the loop closes, not how hard the domain is. It
closed, on the second attempt at every judging gate. `DEV-01` then closed on the first attempt at
every gate, with no escalation and `rework_count: 0`, which is the result the ROO-01 run was run to
make possible.

## Deseeded — waiting on registry rows

Five tickets were seeded in Phase C and have been **removed from the board**. They are *not*
cancelled. Each is expected back, unchanged, the moment its feature row exists.

**Two have come back**, both on 2026-08-23, by exactly the route described below. Device CRUD UI
returned as `DEV-01` after the operator added the row by hand. Member CRUD UI returned as `MEM-01`
after ADR-004 removed the write guard and the steward added the row itself. **Three remain**, and the
route below is now cheaper than the paragraph describing it suggests — an agent can add the feature
row, so restoring one is a request rather than a chore.

| Title | Group | Waiting on |
|---|---|---|
| Account management UI | AUT | a row in the `AUT` table |
| Role assignment UI | AUT | a row in the `AUT` table |
| User self-release | REG | a row in the `REG` table |

**Why they were removed rather than left visibly failing.** Only `ROO-01` has a registry row. The
other five could not populate `feature_ids` without inventing a feature ID, which is prohibited — so
each produced a standing D1 error in `/docs-audit`, five of them, indefinitely.

An audit that is red for the length of a ticket run stops being read. The findings were true, but
their truth was not the point: they described a human action nobody was going to take this week, and
they sat on top of every real finding that appeared underneath them. A control everyone has learned
to scroll past has already failed, and it fails silently the first time it reports something that
matters.

They are recorded here by title and group rather than by ID, because writing the IDs would recreate
the same five findings from this file. That is not a workaround: those IDs genuinely do not exist
yet, and referring to them as though they do is precisely what D1 exists to catch.

**To restore one:** a human adds its row to `.ai/registry/features.md` (registry plane, RULE-01, no
agent can do it), then the ticket is re-seeded from `.ai/templates/ticket.yaml` with `feature_ids`
populated. Ordering after `ROO-01` is a human decision; the Phase C order was Device, Member,
Account management, Role assignment, self-release. Note that the Device ticket carries INV-04,
INV-05 and INV-06 — running it before the loop is proven would test domain difficulty when what is
being measured is the process.

## BLOCKED

Tickets halted on something outside the loop: an unapproved ADR, an escalation, a missing decision.

| # | Ticket | Blocked on | Since |
|---|--------|------------|-------|

Empty. The R8 / INV-11 escalation that sat here from `2026-08-12T16:56:20Z` was resolved by a human
and verified by execution at the second REVIEW. This row was carried stale for nine days because the
board was not repaired when the escalation ended — the record of what actually happened is in
`metrics.md` and `04-review.md`.

## ARCHIVE (last 20)

Most recent first. Older rows are dropped, not moved elsewhere — the ticket folders and Git are the
record (RULE-10).

| Ticket | Done at | PR | Rework cycles |
|--------|---------|----|---------------|
| SEA-01 | 2026-08-25T01:52:41Z | *pending — `gh` unauthenticated; a prefilled compare URL was handed to the operator at ship time* | 0 |
| MEM-01 | 2026-08-24T09:21:52Z | *pending — `gh` unauthenticated; a prefilled compare URL was handed to the operator at ship time* | 0 |
| DEV-01 | 2026-08-23T08:35:53Z | *pending — see the note below* | 0 |
| ROO-01 | 2026-08-23T05:29:36Z | [#1](https://github.com/didi-code0980/seatseat-aifw/pull/1) — merged 2026-08-23 | 0 |

**SEA-01 took three `/ship` attempts, and the first two stopping is the result worth keeping.**
Attempt 1 found `feat/SEA-01` twenty-five commits behind `origin/main` — cut before MEM-01 merged, so
QA had run against a tree with neither `tests/e2e/members.spec.ts` nor `tests/unit/members.test.ts`.
`06-test-report.md:23` records `45 passed` e2e and 74 unit, which are exactly the pre-MEM-01 counts
against today's 61 and 92. The QA gate was `passed: true` and honestly measured, of a tree that no
longer existed. Merging `origin/main` at ship surfaced the real conflict immediately:
`members.spec.ts:477` (*no other member is changed in any respect*) failed because SEA-01's seat
re-assignment moved `SEAT-B-06` between members mid-assertion, `playwright.config.ts` having set
`fullyParallel: true` against one `webServer` holding the mock store in process memory. Attempt 2
stopped on the same failure and fixed it on `ops/e2e-worker-isolation` — `fullyParallel: false`,
`workers: 1` — which the operator merged. Attempt 3 merged that base in and passed 61/61.

**Both halves are MD-29, and only one is fixed.** The worker isolation is repaired; *a gate can pass
against a base the ticket will never merge into, and nothing re-checks it at ship* is not. It was
handled by hand three times in one ship, and the next ticket cut before a merge reproduces it.
`feat/SYS-01` is that ticket.

**`state: DONE` was written by SEA-01's QA handoff commit `f37236a`, not by `/ship`.** Left as it
stands because it is now true, and recorded rather than repaired silently — a ticket that marks
itself DONE at QA claims a ship that has not happened, and on attempt 1 that claim was false while
the branch was red.

**ROO-01's PR column was wrong and is corrected here.** It read "Not opened" from the 2026-08-23
`/ship` run, when `gh` was absent and the branch had no commits. The PR was opened and merged as
**#1** shortly afterwards; `.ai/registry/features.md` recorded that and this file did not. The
registry was ahead of the board for half a day.

**MEM-01's PR is pending for the same reason DEV-01's is, and that is now three ships in a row.**
`gh auth status` still reports no logged-in host, and `gh auth login` is an interactive TUI that
cannot be driven from a loop session — authenticating is the operator's, once, outside the loop. What
is different this time is that the ship did not stop at naming the branch: `/ship` step 7 now
requires a `compare/main...feat/MEM-01` URL with the title and body percent-encoded into it, so the
operator lands on a filled form. MD-17 is the standing item.

**These board rows travel in a separate pull request from the ship, and that is a defect being
recorded rather than a choice.** `/ship` step 4 puts `backlog.md` and `metrics.md` in the ticket set
precisely so this cannot happen; step 6's `check-allowed-paths` then fails the branch on them, because
they match no `allowed_paths` entry and widening the list is forbidden. The blocked merge outranks the
ordering risk, so they moved to `ops/board-mem-01-ship`. Merge that one **after** `feat/MEM-01`, or
this file will claim a ship that has not landed. MD-20.

MEM-01 also reached DONE with `rework_count: 0` across **two** rework cycles, both opened by a QA
failure — pass 1 raised F-6 and F-7, pass 3 raised F-9 — and neither charged to the Developer, because
RULE-08 counts only Developer-caused failures and both causes were upstream in the design: F-6 was a
defect in version 1, F-9 a cache-behaviour gap version 3 declined and version 4 accepted. The record is
four passes in `04-review.md` and passes 1, 3 and 4 in `06-test-report.md`, none of them edited.

**DEV-01's PR is pending, and for a narrower reason than ROO-01's was.** `gh` is now installed
(2.98.0) but not authenticated — `gh auth status` reports no logged-in host, and OAuth cannot be
run from a non-interactive session. The commit and the push are done and the branch is real; only
`gh pr create` is outstanding. Whoever runs `gh auth login` fills in the column.
