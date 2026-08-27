---
description: Commit and push a ticket's lane work, then release the branch for the lane that runs next
argument-hint: <TICKET-ID>
---

Run in **the session of the role that produced the lane's last gate** — not a separate orchestrator
session. Changed 2026-08-25 on the operator's instruction. Nothing is dispatched.

| Folder | Who runs `/handoff` | Because it just closed |
|---|---|---|
| `aiw-design` | `tech-lead-design` | the `design` gate |
| `aiw-implement` | `qa` | the `qa` gate |
| either | whoever wrote the failing verdict | a gate that **failed**, to a role in the other folder |

**The lane that finished the work now persists it.** The previous arrangement routed both hand-offs
through `orchestrator`, on the stated grounds that it was the only role permitted to commit and that
the constructing roles held no `Bash` tool. The first half was a rule and has been amended; **the
second half was simply false** — every agent definition under `.claude/agents/` grants `Bash`, `ba`
included. Three documents asserted a capability limit that the frontmatter never imposed. MD-27.

The consequence worth noticing: **the implement lane no longer needs an `orchestrator` session at
all.** `/implement`, `/review`, `/qa` and `/handoff` each have an owner there, and `orchestrator`
remains only in `aiw-design`, for `/next-ticket` and `/ship`.

A session's folder is still fixed at launch, so the role running this command is the one whose
working tree holds the files being committed. That has not changed and is not negotiable by argument.

**This command exists because a lane cannot hand a ticket on by itself.** Every stage leaves its
worktree dirty, and git refuses one branch in two worktrees. Without a step that persists the work and
*releases the branch name*, the next lane's `git switch` fails with:

```
fatal: 'feat/<TICKET-ID>' is already checked out at '/Users/mpa/Desktop/<folder>'
```

MD-15. Three hand-offs use this command — design→build, build→ship, and the **rework hand-off**, which
carries a failed gate back to the folder the routed role lives in — and the shape is the same all three
times. The third was added 2026-08-27; MD-46 is why it had to be.

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

## 1. Decide which hand-off this is, from `ticket.yaml` and from the verdict you just wrote

Read the `gates` map in `ticket.yaml`, **and** the `gate:` line in the front-matter of the artifact
your stage produced. Neither alone is enough, and a FAIL never reaches the gates map at all. Do not
infer either from which files exist.

**Two of the three are forward, and the gates map decides them:**

| Gates passed | You are | Hand-off | Next lane |
|---|---|---|---|
| `spec` and `design` | `tech-lead-design` | **design → implement** | `aiw-implement` — `/implement` |
| `review` and `qa` | `qa` | **implement → ship** | `aiw-design` — `/ship` |

**The third is backwards, and only the verdict decides it:**

| Front-matter of the artifact you just wrote | Hand-off | Next lane |
|---|---|---|
| `gate: FAIL` with `routed_to` naming a role that does not sit in your folder | **rework** | the folder that role sits in |

`routed_to` resolves to a folder through the roster in `.ai/standards/session-model.md`, *The three
lanes*: `ba`, `tech-lead-design` and `orchestrator` are `aiw-design`; `developer`,
`tech-lead-review` and `qa` are `aiw-implement`.

**If `routed_to` names a role in your own folder, this is not a hand-off and you must not run one.**
A QA failure routed to `developer` is fixed two feet away; the branch does not move, nothing is
pushed, and the routed command runs here.

**If the gates say one thing and your own role says the other, stop.** A `qa` session reading a tree
whose `design` gate has just passed is in the wrong folder — the two forward hand-offs are not
interchangeable and neither is the working tree each one commits.

Anything else is not a hand-off. If `design` passed and `review` did not while you are in the build
lane and no verdict reads FAIL, the ticket is mid-lane: stop and say which stage is unfinished.

**A forward hand-off's push claims a lane is done. A rework hand-off's does not, and that distinction
is the whole reason the third case had to be written down.** Until 2026-08-27 this step refused
everything that was not one of the two forward cases, on the stated ground that *a pushed branch is a
claim that a lane is done* — which left the two rows of `.ai/01-operating-model.md`
§*Failure routing* that point out of the implement lane with no way to reach the role they name. The lane holding `feat/<ID>` could
not release it, the lane owning the fix could not check it out, `git switch` refuses a branch checked
out elsewhere, and the ticket stopped between the two folders with no command able to move it. That
is MD-46, found on SYS-02 at QA. What this push claims is narrower and still true: **this lane is
finished with the ticket for now**, and what is on `origin` is what the receiving lane will fix.

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

## 2a. Rework hand-off only — transcribe the verdict into `ticket.yaml`

**Skip this on both forward hand-offs.** `ticket.yaml` is not yours there; the stage owner has already
set the state and you are only persisting it.

On a rework hand-off nobody has set it. The role that wrote the failing verdict is forbidden to touch
`ticket.yaml` — `.claude/commands/review.md` §*You do not touch `ticket.yaml`* and
`.claude/commands/qa.md` §*You do not touch `ticket.yaml`*, both resting on RULE-13 — and the
`orchestrator` those two sections hand the job to does not run in the implement lane any more (see
the note under the table at the top of this file). So the FAIL is declared in front-matter and written
into the board by no one, and the branch would reach the receiving folder still claiming to be
mid-lane. Copy three fields across, exactly as the verdict states them:

| From the verdict's front-matter | Into `ticket.yaml` |
|---|---|
| `next_state` | `state:` |
| `routed_to` | `owner:` |
| `increments_rework_count` | `rework_count:` — add 1 if `true`, leave untouched if `false` (RULE-08) |

**This is transcription, not a transition.** You are not judging the state; the verdict judged it and
named it in a field, and copying a named value is the same act as copying a `gate:` line. **If any of
the three fields is absent, stop** — a hand-off that guesses a board state is worse than one that
does not run, and the fix is a line in the artifact rather than a judgement here.

Commit it with the rest of the ticket set in step 3.

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

**This step is the widest thing either hand-off role does, and for `qa` it is wider than the rest of
that role.** RULE-13 discards `qa` after every verdict and `guard-read-scope.mjs` refuses it `src/**`,
yet here it commits registry and standards files. Recording is not authoring and the `ops/` branch
still faces CODEOWNERS review, so nothing is decided by the commit — but if this set is ever large or
surprising, say so and stop rather than grouping it into something coherent-looking. MD-28.

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

The next command goes in the *Tiếp theo* line of the block in `CLAUDE.md`. There is no separate report
— if the hand-off did what it says, **four lines is the whole reply**. Do not narrate steps 0 to 6, do
not tabulate what passed, do not restate what this file already says.

**A hand-off is the one place the next move is genuinely elsewhere, and the honest form is state
rather than a command.** Step 6 released the branch; what happens next happens in a folder this
session cannot see. So report what you released and what the receiving lane can now take —
*"`feat/<ID>` released; the implement lane can take it"* — and stop there. Do not print the command
that folder should run: whether it will run depends on that tree being clean and that branch being
free, and neither is visible from here. `CLAUDE.md` §*Tiếp theo is for the folder you are standing
in*. Where the next move **is** in this folder, name it as a command.

Prose above the block is for a stop, a finding, or something you did differently. A hand-off that
found the lane already handed off, or a `state:` that disagrees with what is on the branch, is exactly
that kind of finding: one or two sentences, then the block.

When the next move in this folder is `/spec`, the command alone is enough — `ba` holds `Bash` and
`/spec` step 0 cuts `feat/<ID>` from `origin/main` itself (MD-18), which is the state step 6 left this
folder in.

## What this command never does

- **No `gh pr create`.** That is `/ship` step 7.
- **No `state:` transition of its own.** The stage owner sets it; you persist it. Step 2a is not an
  exception to that — it copies a transition the verdict already named, in the one case where the
  role that named it is forbidden to write it and no `orchestrator` runs in the lane.
- **No write to `metrics.md` or `backlog.md`.** `/ship` owns both.
- **No merge, and `main` is never a commit or push target.** RULE-09.
