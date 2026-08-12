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

Tickets that pass the full Definition of Ready. The orchestrator dispatches the top row.

| # | Ticket | Title | Size | Depends on |
|---|--------|-------|------|------------|

Empty. `ROO-01` is at `BACKLOG` and has not been through SPEC; DoR also requires a size, which only
DESIGN can judge.

## BACKLOG

Tickets that exist but have not passed the Definition of Ready. **Ordered.** A human reorders; the
orchestrator takes the top.

| # | Ticket | Title | Blocked on |
|---|--------|-------|------------|
| 1 | ROO-01 | Room CRUD UI | Nothing. Needs `/spec` — its `feature_ids` resolves against the registry. |

`ROO-01` is first deliberately: it measures whether the loop closes, not how hard the domain is.

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

## ARCHIVE (last 20)

Most recent first. Older rows are dropped, not moved elsewhere — the ticket folders and Git are the
record (RULE-10).

| Ticket | Done at | PR | Rework cycles |
|--------|---------|----|---------------|
