---
description: Push gate state, rework count, and PR URL to ClickUp
argument-hint: <TICKET-ID>
---

Dispatch `orchestrator` for ticket `$ARGUMENTS`.

**Stop immediately if `tracker.sync_enabled` is false.** That is the default and the expected state
for early tickets: a mirror of something not yet proven to work has no value and adds a variable
while the loop is being debugged.

**Push only:** `gate_state`, `rework_count`, `pr_url`.

**Never read state back.** Git is the source of truth (RULE-10). A mirror that is also an input is a
second source of truth that can disagree with the repository, and no gate may depend on it.

Resolution is by ID against `.ai/registry/tracker.yaml` (RULE-18). If `custom_fields` are still
blank, the fields have not been created in the ClickUp UI — report that and stop rather than
guessing field IDs, which produces failures that look like a permissions problem.

If ClickUp is unreachable, report it and continue. Sync is never on the critical path.

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
