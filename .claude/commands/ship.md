---
description: Build, mark the ticket DONE, and open a pull request
argument-hint: <TICKET-ID>
---

Run in the **orchestrator session — the lead session**
(`.ai/standards/session-model.md`). Nothing is dispatched.

**Preconditions — all four gates `passed: true` with timestamps.** Verify against `ticket.yaml`, not
against a summary.

Steps:

1. `pnpm verify` — typecheck, lint, unit, build. Any non-zero exit stops here.
2. Confirm the full Definition of Done in `.ai/01-operating-model.md`, item by item.
3. Set `state: DONE`, move the row to `## ARCHIVE` in `backlog.md`, append to `metrics.md`.
4. `gh pr create` against `main`, body linking `.ai/board/tickets/$ARGUMENTS/` and listing the four
   gate timestamps.
5. If `tracker.sync_enabled` is true, push `gate_state` and `pr_url`. If it is false, skip silently —
   that is the expected state for early tickets.

6. **Print the next action and its session** — do not invoke it:

```
ROO-01 is DONE, PR opened. Run /next-ticket in the orchestrator session.
```

**The output is an open pull request. Never a merge.** RULE-09 makes merging permanently human, and
`gh pr merge` is denied in settings.

Agents do not commit; a human commits and merges.
