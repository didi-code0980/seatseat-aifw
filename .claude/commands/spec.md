---
description: Run the SPEC stage — the BA writes 01-story.md
argument-hint: <TICKET-ID>
---

Dispatch `ba` for ticket `$ARGUMENTS`.

**Artifacts in:** `.ai/board/tickets/$ARGUMENTS/ticket.yaml`, `.ai/registry/**`
**Artifact out:** `.ai/board/tickets/$ARGUMENTS/01-story.md`
**Template:** `.ai/templates/story.md`

**Gate:** acceptance criteria in Given/When/Then, each with an ID; `invariants_touched` populated in
`ticket.yaml`; Out-of-scope non-empty.

On PASS, advance the ticket to `DESIGN` and record the transition in `.ai/board/metrics.md`. On FAIL
or BLOCKED, record the reason and stop.

The BA does not read `src/**` and does not take a story from a ClickUp description (RULE-05,
RULE-17). Policy is in `.ai/01-operating-model.md`.
