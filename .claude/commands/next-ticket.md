---
description: Report the top READY ticket without starting it
---

Dispatch `orchestrator` in report-only mode.

**Input:** every `.ai/board/tickets/*/ticket.yaml`, plus `.ai/board/backlog.md`
**Output:** a report to the operator. **No file is written and no stage is dispatched.**

Report:

1. The top row of `## READY` in `backlog.md` whose `ticket.yaml` state is not `DONE`
2. Its full Definition of Ready evaluation, item by item, pass or fail
3. Any ticket in `ESCALATED` — these halt the loop and are reported first
4. Current WIP against the limit
5. Any disagreement between `backlog.md` and a `ticket.yaml`, naming which is authoritative

If the top ticket fails DoR, say which item failed. Do not demote it here; that happens in the
dispatch loop, and this command does not change state.

Definition of Ready is in `.ai/01-operating-model.md`.
