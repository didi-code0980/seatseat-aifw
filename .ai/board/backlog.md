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

Empty. No ticket can reach READY while `.ai/registry/features.md` has no rows: Definition of Ready
requires `feature_ids` to be non-empty and present in the registry.

## BACKLOG

Tickets that exist but have not passed the Definition of Ready.

| # | Ticket | Title | Blocked on |
|---|--------|-------|------------|

Empty until Phase C seeds the bootstrap tickets.

## BLOCKED

Tickets halted on something outside the loop: an unapproved ADR, an escalation, a missing decision.

| # | Ticket | Blocked on | Since |
|---|--------|------------|-------|

## ARCHIVE (last 20)

Most recent first. Older rows are dropped, not moved elsewhere — the ticket folders and Git are the
record (RULE-10).

| Ticket | Done at | PR | Rework cycles |
|--------|---------|----|---------------|
