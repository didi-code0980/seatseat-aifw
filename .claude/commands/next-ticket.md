---
description: Report the top READY ticket without starting it
---

Run in the **orchestrator session — the lead session**, in report-only mode. The orchestrator is not
a subagent and does not invoke a stage owner; see `.ai/standards/session-model.md`.

**Input:** every `.ai/board/tickets/*/ticket.yaml`, plus `.ai/board/backlog.md`
**Output:** a report to the operator. **No file is written and nothing is invoked.**

Report:

1. The top row of `## READY` in `backlog.md` whose `ticket.yaml` state is not `DONE`
2. Its full Definition of Ready evaluation, item by item, pass or fail
3. Any ticket in `ESCALATED` — these halt the loop and are reported first
4. Current WIP against the limit
5. Any disagreement between `backlog.md` and a `ticket.yaml`, naming which is authoritative

If the top ticket fails DoR, say which item failed. Do not demote it here; that happens in the
orchestrator loop, and this command does not change state.

Finish by **printing the next command and the session it belongs in**, exactly one line:

```
ROO-01 is READY. Run /spec ROO-01 in the BA session.
```

If nothing is runnable, say what is blocking instead. Never invoke the stage owner — a printed
instruction the operator runs is a real session boundary, and that boundary is what RULE-13 relies
on.

Definition of Ready is in `.ai/01-operating-model.md`. Session lifetimes are in
`.ai/standards/session-model.md`.
