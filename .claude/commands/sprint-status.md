---
description: Render the board from every ticket.yaml
---

Dispatch `orchestrator` in report-only mode. **No file is written.**

Read every `.ai/board/tickets/*/ticket.yaml` and render:

| Ticket | State | Size | Rework | Gates passed | Chat used | Blocked on |
|---|---|---|---|---|---|---|

Then report, in this order:

1. **Escalations.** Any ticket in `ESCALATED`, with its `blocking_reason`. These come first because
   they halt rather than queue.
2. **WIP** against the limit, counting states SPEC through QA.
3. **Drift.** Any disagreement between `backlog.md` and a `ticket.yaml`. `ticket.yaml` is
   authoritative; name what would be repaired, but do not repair it here.
4. **Budget pressure.** Any `chat_budget` pair at or near its maximum — a pair that always exhausts
   its budget is negotiating rather than clarifying.
5. **DoR failures** among tickets sitting in READY.

This is a read of the board plane. It does not change state, dispatch a stage, or touch the tracker.
