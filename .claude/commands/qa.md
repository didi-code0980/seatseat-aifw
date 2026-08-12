---
description: Run the QA stage — test plan, tests, and test report in isolated dispatch
argument-hint: <TICKET-ID>
---

Run in a **fresh session that is discarded after the verdict** — files only, no message channel
(RULE-13). You are `qa`; nothing is dispatched. A re-run after rework opens another new session, for
the same reason the reviewer does (`.ai/standards/session-model.md`).

**Artifacts in:** `01-story.md` and **section 6 of `02-design.md` only**. Do not pass the whole
ticket folder — a QA agent that can see `04-review.md` is testing the reviewer's conclusions instead
of the story.

**Artifacts out:** `tests/**`, `.ai/board/tickets/$ARGUMENTS/05-test-plan.md`,
`.ai/board/tickets/$ARGUMENTS/06-test-report.md`
**Templates:** `.ai/templates/test-plan.md`, `.ai/templates/test-report.md`

**Gate:** every `AC-n` maps to at least one named test; `pnpm test` and `pnpm test:e2e` exit 0.

QA never reads `src/**` (RULE-05), enforced by `guard-read-scope.mjs`. A selector not in design
section 6 does not exist; a gap is raised by writing
`.ai/board/tickets/$ARGUMENTS/99-questions.md` with `to: tech-lead-design`, and is fixed by amending
section 6 — not by answering in place. You may not address `developer` or `tech-lead-review` before
their verdicts exist; `chat-guard.mjs` blocks that write (RULE-12).

Behaviour that is wrong routes to `developer` and increments `rework_count`. An ambiguous or
untestable AC routes to `ba` and does not (RULE-08). An invariant violation escalates (RULE-07).

On PASS, set the ticket to `DONE` and **print the next command and its session** — do not invoke it:

```
QA passed. Run /ship ROO-01 in the orchestrator session.
```

Then end this session. On FAIL, print the routed command instead and still end this session.
