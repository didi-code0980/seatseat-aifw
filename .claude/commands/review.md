---
description: Run the REVIEW stage — R1 to R9 in isolated dispatch, verdict to 04-review.md
argument-hint: <TICKET-ID>
---

Run in a **fresh session that is discarded after the verdict** — files only, no message channel
(RULE-13). You are `tech-lead-review`; nothing is dispatched.

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
- **Tree dirty — classify before you decide.** Sort every dirty path against this ticket's
  `allowed_paths` plus `.ai/board/tickets/$ARGUMENTS/**`.
  - **Inside** — this ticket's own work. **Not a stop.** A re-run after REWORK finds exactly this, and
    the `developer` session is deliberately kept alive across rework cycles; stopping there would make
    the operator adjudicate an agent's own work in progress.
  - **Outside** — one file is enough. **Stop**, name those paths and the ticket they belong to, and
    say what the two possibilities are: a lane that did not `/handoff`, or a session that wrote in the
    wrong folder. Do not switch branch, and do not clean them up — a stray artifact is evidence.
- **The branch does not exist — stop and report to the operator.** Do not create it. Only `/spec`
  creates a `feat/` branch. Arriving here with no branch means SPEC never ran, a `/handoff` never
  pushed, or the ID is wrong, and the three need different answers. Say which you cannot rule out.

**The session must be new every time, including on a re-review.** A session that remembers working
through R4 last pass will not genuinely work through it again, and the code changed between passes —
which is the entire reason there is a second pass. Reviewer memory is a liability, not an asset
(`.ai/standards/session-model.md`).

You have no channel to the Developer and you did not talk to one. `chat_before_verdict` must be
`none`; if it cannot truthfully be, the review is void and this stage re-runs in a clean session.

**Artifacts in:** `01-story.md`, `02-design.md`, `03-impl-log.md`, `git diff`, `.ai/registry/**`
**Artifact out:** `.ai/board/tickets/$ARGUMENTS/04-review.md`
**Template:** `.ai/templates/review-report.md`

**Gate:** R1 through R9, each citing `file:line`. An item with no citation counts as failed.

On FAIL, route per the failure routing table in `.ai/01-operating-model.md`, which encodes RULE-08 in
its third column. Read the column; do not decide the increment yourself.

**An R8 failure does not enter REWORK.** It escalates to a human on first occurrence (RULE-07): name
the invariant, write `next_state: ESCALATED`, and halt.

## You do not touch `ticket.yaml`

**Write the verdict into `04-review.md`'s front-matter and stop.** `gate`, `blocking_reason` and
`next_state` are the whole of your output; something downstream reads them and moves the board
(`.ai/01-operating-model.md`, stage ownership — the REVIEW row writes `04-review.md` and nothing
else). On PASS that is `/qa` and then `/ship`; on a FAIL routed to `ba` or `tech-lead-design` it is
`/handoff` step 2a, which transcribes your `next_state` and `routed_to` into `ticket.yaml` on its way
to releasing the branch. **`orchestrator` does not run in this lane** — `.ai/standards/session-model.md`,
*The three lanes* — so a verdict that waits for one waits forever.

This is not bookkeeping etiquette. **A verdict that advances the board it is judging has no separation
left.** RULE-13 discards you after each verdict precisely so the next pass starts cold; a reviewer that
can also mark a ticket QA is deciding and executing in one act, and nothing between the two is
reviewable. If the front-matter and the board ever disagree, the artifact is the record and the board
is a view.

## Your reply is four lines

Per `## Replying` in `CLAUDE.md`. **Do not tabulate R1 to R9 in chat.** `04-review.md` holds every
check with its `file:line`, that is the artifact the gate is read from, and a summary of it in chat is
a copy that cannot be cited. *All nine pass* is one sentence; a FAIL needs the failing check and why,
and nothing about the eight that passed.

Never cite `04-review.md`'s own line numbers as evidence for its own conclusions — R-checks cite the
implementation, and quoting your own report back proves nothing.

Name the ticket by its ID. Not `ticket.yaml`, not "the ticket" — `SEA-01`.

Then end this session.

---

## Last step: sign off

**End your reply with the block in `## Replying` (`CLAUDE.md`).** It is not a footer on the reply —
for most runs it *is* the reply. Do not stop at the step above and leave the operator to work out who
answered, whether it passed, where the repository is, and what runs next.

The *first* line quotes the `gate` from the front-matter you just wrote. *Tiếp theo* names the next
stage command, **and only if it runs in this folder**. If the next stage belongs to the other
lane, write `không có — <what this folder is waiting on>`; `/handoff` is what moves the branch, and
the lane that receives it reports its own next move. `CLAUDE.md` §*Tiếp theo is for the folder you
are standing in*.
Read the three values rather than recalling them:

```
date '+%Y-%m-%d %H:%M %Z'
pwd
git branch --show-current
```

A remembered timestamp, folder or branch is the part of this block that can be wrong while looking
right.
