---
description: Commit and push a ticket's finished lane work, then release the branch for the next lane
argument-hint: <TICKET-ID>
---

Run in the **orchestrator session of whichever lane has just finished**
(`.ai/standards/session-model.md`). Nothing is dispatched.

**That means two orchestrator sessions, one per lane folder** — `aiw-design` runs hand-off 1 and 3,
`aiw-implement` runs hand-off 2. Not a choice: a session's folder is fixed at launch, and the files each
hand-off commits sit in that folder's working tree. The commit exception in
`.ai/standards/git-conventions.md` names `orchestrator` and no other role, and `ba` and
`tech-lead-design` hold no `Bash` tool, so no lane can persist its own work.

**This command exists because a lane cannot hand a ticket on by itself.** Every stage leaves its
worktree dirty, the constructing roles have no `Bash` tool and cannot commit, and git refuses one
branch in two worktrees. Without a step that persists the work and *releases the branch name*, the
next lane's `git switch` fails with:

```
fatal: 'feat/<TICKET-ID>' is already checked out at '/Users/mpa/Desktop/<folder>'
```

MD-15. Two hand-offs use this command — design→build, and build→ship — and the shape is the same
both times.

## 0. Confirm the branch and the folder, before anything

**Mode: stop** — the table in `.ai/standards/git-conventions.md`, *The branch check every ticket
command runs*. This command never creates a branch; it is the one that hands an existing one on.

```
pwd
git branch --show-current
git fetch origin --quiet
git status --porcelain
```

You must already be on `feat/$ARGUMENTS`. **If you are not, stop** — a hand-off is a claim about the
work in *this* worktree, and switching to the branch first would leave the dirty files behind and push
an empty lane. If the branch does not exist, stop and report; there is nothing to hand off.

A hand-off run from the wrong folder pushes the wrong lane's work, and since ADR-004 nothing stops it
(`.ai/standards/session-model.md`, *What no longer protects this*).

## 1. Decide which hand-off this is, from `ticket.yaml`

Read the `gates` map. Do not infer it from which files exist.

| Gates passed | Hand-off | Next lane |
|---|---|---|
| `spec` and `design` | **design → build** | `aiw-implement` — `/implement` |
| `review` and `qa` | **build → ship** | `aiw-design` — `/ship` |

Anything else is not a hand-off. If `design` passed and `review` did not while you are in the build
lane, the ticket is mid-lane: stop and say which stage is unfinished. This command never persists a
lane that has not completed — a pushed branch is a claim that a lane is done.

## 2. Classify the working tree

`git status --porcelain`, and sort every dirty path into two sets against `allowed_paths` in
`ticket.yaml`:

- **Ticket set** — matches `allowed_paths`, or sits under `.ai/board/tickets/$ARGUMENTS/`.
- **Everything else** — model, registry, standards, hooks, scripts, tooling, stray files.

A path you cannot classify goes in the second set; you do not guess it into the ticket. **Do not print
the two sets** — the commit you are about to make is the record, and `git show --stat` reads it back.
Print only the paths that made you stop.

**`.ai/board/metrics.md` and `.ai/board/backlog.md` are never in the ticket set, and never yours
here.** They belong to `/ship` alone — see *The one surface that still collides* in
`.ai/standards/session-model.md`. If a stage has left them dirty, that is the second set.

## 3. Commit the ticket set on `feat/$ARGUMENTS`

Confirm the branch first; if it is anything else, stop. `git add` with explicit paths — never `-A`,
never `.`. How many commits and what each message says is yours to decide: group by coherence, one
assertion per commit, message form per `.ai/standards/git-conventions.md`.

Then `git push -u origin feat/$ARGUMENTS`, which prompts.

## 4. `node scripts/check-allowed-paths.mjs`

It diffs `origin/main...HEAD` — the **whole branch**, not your last commit. A FAIL means the branch
carries a file outside `allowed_paths`, and the fix is to move that file to the second set, never to
widen the list.

At the design hand-off the branch holds only `.ai/board/tickets/$ARGUMENTS/**`, which is a subset of
`allowed_paths` and passes. That is not a weaker check — it is the check confirming DESIGN wrote
nothing it had not declared.

## 5. If the second set is non-empty, it gets its own branch

`git switch -c ops/<slug> main`, commit it there in whatever grouping you judge coherent, push. Name
the slug for the work, not for the ticket. Do **not** fold it into the ticket branch — step 4 will
fail if you do, and branch protection then blocks the merge a human is waiting to make.

**No pull request here.** A hand-off is not a ship. The `ops/` branch is pushed and left for `/ship`
or for the operator to open; opening a PR mid-loop asks a human to review work whose ticket has not
finished.

If that set touches a CODEOWNERS path — `.ai/registry/`, `.ai/standards/`, `prisma/`, `.claude/`,
`.github/`, `.mcp.json` — say so explicitly, file by file, in the output. You are recording a human's
change so it can be reviewed, not authoring one.

## 6. Park the lane on the latest `main`. This step is the whole point

Once the branch is pushed, put the worktree back on current `main` and give the name up:

```
git fetch origin --quiet
git switch --detach origin/main
git fetch origin main:main --quiet
```

**Line 2 is detached-at-`origin/main`, not `git switch main`, and the difference is not stylistic.**
Git holds every branch name exclusively across worktrees and `main` is not special. Verified by
attempt, 2026-08-24, with two throwaway worktrees:

```
$ git -C wt2 switch main
fatal: 'main' is already checked out at '.../wt1'
```

Both lanes run `/handoff`. If both parked on the branch `main`, whichever ran second would fail
outright. Detaching at `origin/main` gives the same working tree — the latest `main`, ready for
whatever comes next — and collides with nothing.

**Line 3 fast-forwards the local `main` ref without checking it out**, so `main` stops drifting behind
the remote. It is a courtesy rather than a requirement: every branch in this model is cut from
`origin/main`, so nothing reads local `main`. If it fails — not fast-forwardable, or some worktree does
hold `main` — say so in one line and carry on. It is not a reason to stop a completed hand-off.

**Verify the release, do not assume it.** `git branch --show-current` must print nothing. A hand-off
that reports success while still holding `feat/$ARGUMENTS` is the one failure this command exists to
prevent, and it fails in the *other* folder, minutes later, where it is hardest to read.

## 7. Sign off, and let the sign-off be the reply

The next command and its folder go in the *Tiếp theo* line of the block in `CLAUDE.md`. There is no
separate report — if the hand-off did what it says, **four lines is the whole reply**. Do not narrate
steps 0 to 6, do not tabulate what passed, do not restate what this file already says.

Prose above the block is for a stop, a finding, or something you did differently. A hand-off that
found the lane already handed off, or a `state:` that disagrees with what is on the branch, is exactly
that kind of finding: one or two sentences, then the block.

When the next move in this folder is `/spec`, the command alone is enough — `ba` holds `Bash` and
`/spec` step 0 cuts `feat/<ID>` from `origin/main` itself (MD-18), which is the state step 6 left this
folder in.

## What this command never does

- **No `gh pr create`.** That is `/ship` step 7.
- **No `state:` transition.** The stage owner sets it; you persist it.
- **No write to `metrics.md` or `backlog.md`.** `/ship` owns both.
- **No merge, and `main` is never a commit or push target.** RULE-09.
