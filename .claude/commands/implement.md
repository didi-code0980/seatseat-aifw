---
description: Run the IN_PROGRESS stage — the Developer implements the design
argument-hint: <TICKET-ID>
---

Run in the **Developer session in the `aiw` folder — the build lane** — on branch `feat/$ARGUMENTS`.

**Acquire the branch first: `git fetch && git switch feat/$ARGUMENTS && git pull`.** The story and
the design arrive already committed, pushed by `/handoff` from the design lane. If the switch fails
with `fatal: 'feat/$ARGUMENTS' is already checked out at ...`, the design lane has not handed off —
print the folder git named and stop. Do not re-derive the design from an uncommitted file in another
worktree, and do not start from `main`: `02-design.md` would be missing and `allowed_paths` with it.
 That session is ephemeral but
**survives REWORK** — keep it open until the ticket is DONE or ESCALATED, and re-run this command in
the same session on a rework cycle. Restarting it every cycle would spend the RULE-06 budget
re-deriving the design instead of fixing what the reviewer found
(`.ai/standards/session-model.md`).

**Artifacts in:** `ticket.yaml`, `01-story.md`, `02-design.md`, `.ai/standards/**`
**Artifacts out:** code inside `allowed_paths`, and
`.ai/board/tickets/$ARGUMENTS/03-impl-log.md`
**Template:** `.ai/templates/impl-log.md`

**Gate:** `pnpm typecheck` and `pnpm lint` exit 0; every contract item in design section 1 is
implemented; `03-impl-log.md` lists every file touched with a one-line reason.

Check the branch first. `guard-allowed-paths.mjs` resolves the ticket from `feat/<ID>`, so work done
on another branch name runs with the path guard inactive.

The Developer may consult `tech-lead-design` and `ba` by writing
`.ai/board/tickets/$ARGUMENTS/99-questions.md` with `to:` naming the agent. It may not address
`tech-lead-review` or `qa` before their verdicts exist — `chat-guard.mjs` blocks that write
(RULE-12).

On PASS, set the ticket to `REVIEW` and **print the next command and its session** — do not invoke
it:

```
IN_PROGRESS passed. Run /review ROO-01 in a FRESH session, discarded after the verdict.
```

The reviewer's session must be new. It never inherits this one: a reviewer holding the developer's
framing has lost the independence that makes the review worth running, before the first check is
evaluated (RULE-13).
