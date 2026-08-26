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

---

## Last step: sign off

**End your reply with the block in `## Replying` (`CLAUDE.md`).** It is not a footer on the reply —
for most runs it *is* the reply. Do not stop at the step above and leave the operator to work out who
answered, whether it passed, where the repository is, and what runs next.

This command writes no artifact and passes no gate, so the first line ends `gate n/a`. *Tiếp theo* names
a command that runs **in the folder you are in**. If the next move belongs to another
lane, write `không có — <what this folder is waiting on>` instead: a session cannot see the other
worktrees, so naming a command for one is a guess about a branch that may have moved. `CLAUDE.md`
§*Tiếp theo is for the folder you are standing in* carries the rule and the failure that produced it.
Read the three values rather than recalling them:

```
date '+%Y-%m-%d %H:%M %Z'
pwd
git branch --show-current
```

A remembered timestamp, folder or branch is the part of this block that can be wrong while looking
right.
