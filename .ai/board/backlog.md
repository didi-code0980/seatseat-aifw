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

Empty. Both tickets that have existed are `DONE` — see ARCHIVE. Nothing else can enter READY until a
human adds a feature row to `.ai/registry/features.md`; eight of the ten group tables are still bare.

## BACKLOG

Tickets awaiting SPEC. **Ordered.** A human reorders; the orchestrator takes the top.

Under the current gate placement a ticket sits here until it has been specified — DoR is evaluated
*after* SPEC. A row still at `BACKLOG` has not failed DoR; it has not reached it. A row showing a
later state is in flight and appears here because this file has no in-flight section.

| # | Ticket | Title | State | Blocked on |
|---|--------|-------|-------|------------|
| 1 | MEM-01 | Member CRUD UI | BACKLOG | nothing — next for `/spec` |
| 2 | SEA-01 | Seat occupancy — assign and release | BACKLOG | nothing — specced parallel to MEM-01's implementation |
| 3 | SYS-01 | Replace Better Auth with Supabase Auth | BACKLOG | nothing — next for `/spec` in the design lane |

`DEV-01` returned to the board on 2026-08-23 as the first ticket seeded under the normal path
rather than by Phase C, ran the full loop the same day, and is `DONE`.

`MEM-01` was added the same day, and it is the first registry row written by an agent rather than by
the operator — see ADR-004. **Whether it can share a window with another ticket is not settled**, and
one question at SPEC settles it: if deleting a member who occupies a seat *refuses*, its files stay
disjoint and it parallelises; if it *cascades*, INV-06 fires, the delete writes
`src/lib/data/mock/devices.ts`, and it has to run alone. Its `ticket.yaml` carries the question in
full. That question was written while DEV-01 was still in flight; DEV-01 is now `DONE`, so nothing
collides today — but the answer still decides whether MEM-01 can run beside whatever comes next.

**This view is stale for rows 1 and 2, and it is left stale deliberately.** `ticket.yaml` is
authoritative and both have moved on — MEM-01 is `IN_PROGRESS` in the build worktree and SEA-01 is
`IN_PROGRESS` in the design worktree, its DESIGN gate passed `2026-08-24T02:10:53Z`. Neither state is
committed anywhere yet, because every stage leaves its worktree dirty and only `/ship` commits.
Repairing this table is the orchestrator's job and the steward does not do it — a status command that
quietly reconciled the two would destroy the evidence that they had drifted.

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
| DEV-01 | 2026-08-23T08:35:53Z | *pending — see the note below* | 0 |
| ROO-01 | 2026-08-23T05:29:36Z | [#1](https://github.com/didi-code0980/seatseat-aifw/pull/1) — merged 2026-08-23 | 0 |

**ROO-01's PR column was wrong and is corrected here.** It read "Not opened" from the 2026-08-23
`/ship` run, when `gh` was absent and the branch had no commits. The PR was opened and merged as
**#1** shortly afterwards; `.ai/registry/features.md` recorded that and this file did not. The
registry was ahead of the board for half a day.

**DEV-01's PR is pending, and for a narrower reason than ROO-01's was.** `gh` is now installed
(2.98.0) but not authenticated — `gh auth status` reports no logged-in host, and OAuth cannot be
run from a non-interactive session. The commit and the push are done and the branch is real; only
`gh pr create` is outstanding. Whoever runs `gh auth login` fills in the column.
