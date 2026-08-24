---
description: Build, mark the ticket DONE, and open a pull request
argument-hint: <TICKET-ID>
---

Run in the **orchestrator session in the `aiw-work` folder — the design lane**
(`.ai/standards/session-model.md`). Nothing is dispatched. Moved out of the build lane 2026-08-24:
shipping reads gates, opens a pull request and waits on a human, and none of that needs the folder
that writes `src/**`.

**Preconditions — all four gates `passed: true` with timestamps.** Verify against `ticket.yaml`, not
against a summary.

Steps:

0. **Acquire the branch.** `git fetch && git switch feat/$ARGUMENTS && git pull`.

   If the switch fails with `fatal: 'feat/$ARGUMENTS' is already checked out at ...`, the build lane
   has not run `/handoff` and this ticket is not ready to ship. Print the folder git named and stop —
   do not work around it, and never `git worktree` your way past it.

   The implementation, the tests and artifacts 03–06 arrive already committed, by `/handoff`. Do not
   expect a dirty tree full of `src/**`; if you find one, the build lane's hand-off did not complete
   and the QA gate you are trusting was never persisted.

1. `pnpm verify` — typecheck, lint, unit, build. Any non-zero exit stops here.
2. Confirm the full Definition of Done in `.ai/01-operating-model.md`, item by item.
3. Set `state: DONE`, move the row to `## ARCHIVE` in `backlog.md`, append to `metrics.md`.
4. **Classify the working tree.** `git status --porcelain`, and sort every dirty path into two sets
   against `allowed_paths` in `ticket.yaml`:

   - **Ticket set** — matches `allowed_paths`, or sits under `.ai/board/tickets/$ARGUMENTS/`. After
     step 0 this is normally only what step 3 just wrote: `ticket.yaml`, `backlog.md`, `metrics.md`.
   - **Everything else** — model, registry, standards, hooks, scripts, tooling, stray files.

   Print both sets before touching git. A path you cannot classify goes in the second set; you do
   not guess it into the ticket.

   **`metrics.md` and `backlog.md` are yours and only yours.** No other command writes them — see
   *The one surface that still collides* in `.ai/standards/session-model.md`. They sit outside every
   `allowed_paths`, and they belong in the ticket set anyway, because a board that records a ship in a
   separate pull request from the ship is a board that can be merged out of order.

5. **Commit the ticket set on `feat/$ARGUMENTS`.** Confirm the branch first; if it is anything else,
   stop. `git add` with explicit paths — never `-A`, never `.`. This is the ship commit — the state
   transition and the board, on top of the two `/handoff` commits already on the branch. Message form
   per `.ai/standards/git-conventions.md`. Then `git push origin feat/$ARGUMENTS`, which prompts.

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
MEM-01 is DONE, PR #12 opened. Merging is yours.
Once it is merged, run /implement SEA-01 in the aiw folder — SEA-01's design handoff is already
pushed and its branch is free.
```

Name the folder, not just the command. Three worktrees mean a correct command in the wrong folder
writes to the wrong branch, and since ADR-004 nothing refuses it.

11. **Release `feat/$ARGUMENTS` before you finish.** `git switch --detach` if step 8 has not already
    moved you off it. The pull request is open and the branch now belongs to whoever merges it; this
    folder's next job is `/spec` on a different ticket, and it cannot cut a branch while holding this
    one. Same mechanism as `/handoff` step 6, same reason.

**The output is an open pull request. Never a merge.** RULE-09 makes merging permanently human, and
`gh pr merge` is denied in settings.

You commit here and in `/handoff`, and nowhere else. Every stage leaves its tree dirty; those two
commands are the only ones that persist it. Two things are never yours: `main` as a target, and the
merge.

**Definition of Done item 2 — "diff is a subset of `allowed_paths`" — is a statement about the
ticket branch**, which is why step 8 exists. It was written when nothing was ever committed, so it
never had to say which branch it meant. It means `feat/$ARGUMENTS`.
