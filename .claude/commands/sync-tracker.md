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
