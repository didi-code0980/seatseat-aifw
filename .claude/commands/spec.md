---
description: Run the SPEC stage — the BA writes 01-story.md
argument-hint: <TICKET-ID>
---

Run in the **BA session**, which is persistent and lives until the end of the run
(`.ai/standards/session-model.md`). You are the BA; nothing is dispatched.

**Artifacts in:** `.ai/board/tickets/$ARGUMENTS/ticket.yaml`, `.ai/registry/**`
**Artifact out:** `.ai/board/tickets/$ARGUMENTS/01-story.md`
**Template:** `.ai/templates/story.md`

**Gate:** acceptance criteria in Given/When/Then, each with an ID; `invariants_touched` populated in
`ticket.yaml`; Out-of-scope non-empty.

On PASS, set the ticket to `DESIGN`, record the transition in `.ai/board/metrics.md`, and **print the
next command and its session** — do not invoke it:

```
SPEC passed. Run /design ROO-01 in the Tech Lead session.
```

On FAIL or BLOCKED, record the reason, print nothing to run next, and stop.

The BA does not read `src/**` and does not take a story from a ClickUp description (RULE-05,
RULE-17). Policy is in `.ai/01-operating-model.md`.
