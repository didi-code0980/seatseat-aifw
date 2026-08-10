---
description: Run the REVIEW stage — R1 to R9 in isolated dispatch, verdict to 04-review.md
argument-hint: <TICKET-ID>
---

Dispatch `tech-lead-review` for ticket `$ARGUMENTS` **in isolated dispatch: fresh context, files
only, no message channel** (RULE-13).

Tear down any team session before dispatching. That transition is a context boundary, not just a
state change — a reviewer that inherits the developer's session has inherited its framing.

**Artifacts in:** `01-story.md`, `02-design.md`, `03-impl-log.md`, `git diff`, `.ai/registry/**`
**Artifact out:** `.ai/board/tickets/$ARGUMENTS/04-review.md`
**Template:** `.ai/templates/review-report.md`

**Gate:** R1 through R9, each citing `file:line`. An item with no citation counts as failed.

On FAIL, route per the failure routing table in `.ai/01-operating-model.md`, which encodes RULE-08 in
its third column. Read the column; do not decide the increment yourself.

**An R8 failure does not enter REWORK.** It escalates to a human on first occurrence (RULE-07): set
the ticket to `ESCALATED`, name the invariant, and halt it.

On PASS, advance to `QA`.
