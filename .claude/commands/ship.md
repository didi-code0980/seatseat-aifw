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
4. **Classify the working tree.** `git status --porcelain`, and sort every dirty path into two sets
   against `allowed_paths` in `ticket.yaml`:

   - **Ticket set** — matches `allowed_paths`, or sits under `.ai/board/tickets/$ARGUMENTS/`.
   - **Everything else** — model, registry, standards, hooks, scripts, tooling, stray files.

   Print both sets before touching git. A path you cannot classify goes in the second set; you do
   not guess it into the ticket.

5. **Commit the ticket set on `feat/$ARGUMENTS`.** Confirm the branch first; if it is anything else,
   stop. `git add` with explicit paths — never `-A`, never `.`. How many commits, and what each
   message says, is yours to decide: group by coherence, one assertion per commit, message form per
   `.ai/standards/git-conventions.md`. Then `git push -u origin feat/$ARGUMENTS`, which prompts.

6. `node scripts/check-allowed-paths.mjs`. It diffs `origin/main...HEAD` — the **whole branch**, not
   your last commit. A FAIL here means the ticket branch carries a file outside `allowed_paths`, and
   the fix is to move that file to the second set, never to widen the list.

7. `gh pr create` against `main`, body linking `.ai/board/tickets/$ARGUMENTS/` and listing the four
   gate timestamps.

8. **If the second set is non-empty, it gets its own branch and its own pull request.** `git switch
   -c ops/<slug> main`, commit it there in whatever grouping you judge coherent, push, `gh pr
   create`. Name the slug for the work, not for the ticket. Do **not** leave it dirty and do not
   fold it into the ticket branch — step 6 will fail if you do, and branch protection will then
   block the merge a human is waiting to make.

   If that set touches a CODEOWNERS path — `.ai/registry/`, `.ai/standards/`, `prisma/`, `.claude/`,
   `.github/`, `.mcp.json` — say so explicitly in the PR body, file by file. You are recording a
   human's change so it can be reviewed, not authoring one: RULE-01 still governs who writes the
   registry, and `guard-registry.mjs` still refuses you.

9. If `tracker.sync_enabled` is true, push `gate_state` and `pr_url`. If it is false, skip silently —
   that is the expected state for early tickets.

10. **Print the next action and its session** — do not invoke it:

```
ROO-01 is DONE, PR opened. Run /next-ticket in the orchestrator session.
```

**The output is an open pull request. Never a merge.** RULE-09 makes merging permanently human, and
`gh pr merge` is denied in settings.

You commit, and only here. Every other stage and every other command leaves the tree dirty for a
human. Two things are never yours: `main` as a target, and the merge.

**Definition of Done item 2 — "diff is a subset of `allowed_paths`" — is a statement about the
ticket branch**, which is why step 8 exists. It was written when nothing was ever committed, so it
never had to say which branch it meant. It means `feat/$ARGUMENTS`.
