---
description: Run the QA stage — test plan, tests, and test report in isolated dispatch
argument-hint: <TICKET-ID>
---

Dispatch `qa` for ticket `$ARGUMENTS` **in isolated dispatch: fresh context, files only, no message
channel** (RULE-13).

**Artifacts in:** `01-story.md` and **section 6 of `02-design.md` only**. Do not pass the whole
ticket folder — a QA agent that can see `04-review.md` is testing the reviewer's conclusions instead
of the story.

**Artifacts out:** `tests/**`, `.ai/board/tickets/$ARGUMENTS/05-test-plan.md`,
`.ai/board/tickets/$ARGUMENTS/06-test-report.md`
**Templates:** `.ai/templates/test-plan.md`, `.ai/templates/test-report.md`

**Gate:** every `AC-n` maps to at least one named test; `pnpm test` and `pnpm test:e2e` exit 0.

QA never reads `src/**` (RULE-05), enforced by `guard-read-scope.mjs`. A selector not in design
section 6 does not exist; a gap is raised with `tech-lead-design` and fixed by amending section 6.

Behaviour that is wrong routes to `developer` and increments `rework_count`. An ambiguous or
untestable AC routes to `ba` and does not (RULE-08). An invariant violation escalates (RULE-07).

On PASS, advance to `DONE`.
