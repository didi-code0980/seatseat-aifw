---
description: Run the QA stage — test plan, tests, and test report in isolated dispatch
argument-hint: <TICKET-ID>
---

Run in a **fresh session that is discarded after the verdict** — files only, no message channel
(RULE-13). You are `qa`; nothing is dispatched. A re-run after rework opens another new session, for
the same reason the reviewer does (`.ai/standards/session-model.md`).

## Step 0 — confirm the branch before writing anything

**Mode: stop.** Run the four reads and follow the table in `.ai/standards/git-conventions.md`,
*The branch check every ticket command runs*. This command may **not** create `feat/$ARGUMENTS`.

```
pwd
git branch --show-current
git fetch origin --quiet
git status --porcelain
```

- Already on `feat/$ARGUMENTS` — proceed.
- Elsewhere or detached, tree clean, the branch exists on `refs/heads` or `refs/remotes/origin` —
  `git switch feat/$ARGUMENTS` (add `-c feat/$ARGUMENTS origin/feat/$ARGUMENTS` when it is
  remote-only), then `git pull --ff-only`.
- Tree dirty — **stop.** Print the paths and say which ticket they belong to.
- **The branch does not exist — stop and report to the operator.** Do not create it. Only `/spec`
  creates a `feat/` branch. Arriving here with no branch means SPEC never ran, a `/handoff` never
  pushed, or the ID is wrong, and the three need different answers. Say which you cannot rule out.

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
