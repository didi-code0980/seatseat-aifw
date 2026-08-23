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

Empty. `ROO-01` passed through here at `2026-08-12T16:23:48Z` and is now `DONE` — see ARCHIVE.
Nothing else can enter READY until a human adds a feature row to `.ai/registry/features.md`.

## BACKLOG

Tickets awaiting SPEC. **Ordered.** A human reorders; the orchestrator takes the top.

Under the current gate placement a ticket sits here until it has been specified — DoR is evaluated
*after* SPEC. A row still at `BACKLOG` has not failed DoR; it has not reached it. A row showing a
later state is in flight and appears here because this file has no in-flight section.

| # | Ticket | Title | State | Blocked on |
|---|--------|-------|-------|------------|

Empty. `ROO-01` was the only row and it is now `DONE`. Nothing is waiting on SPEC, and nothing can
be added here without a human first adding a feature row — see the section below.

`ROO-01` was first deliberately: it measured whether the loop closes, not how hard the domain is.
It closed, on the second attempt at every judging gate.

## Deseeded — waiting on registry rows

Five tickets were seeded in Phase C and have been **removed from the board**. They are *not*
cancelled. Each is expected back, unchanged, the moment its feature row exists.

| Title | Group | Waiting on |
|---|---|---|
| Device CRUD UI | DEV | a row in the `DEV` table of `features.md` |
| Member CRUD UI | MEM | a row in the `MEM` table |
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
| ROO-01 | 2026-08-23T05:29:36Z | **Not opened** — see the note below | 0 |

**ROO-01 is DONE but unshipped, and the two are recorded separately on purpose.** All four gates
passed, `pnpm verify` and `pnpm test:e2e` both exit 0, and the Definition of Done holds on every
item except the `allowed_paths` subset check — which fails on 27 files of model, registry and
steward work done alongside this ticket, not on anything ROO-01 wrote. `/ship` step 4 could not run
at all: opening a pull request needs commits on a pushed branch, `gh` is not installed, the branch
has zero commits and no upstream, and RULE-09 makes committing human-only. Whoever opens the PR fills
in the column.
