---
description: Run the SPEC stage — the BA writes 01-story.md
argument-hint: <TICKET-ID>
---

Run in the **BA session in the `aiw-work` folder — the design lane**. It is persistent and lives
until the end of the run (`.ai/standards/session-model.md`). You are the BA; nothing is dispatched.

## Before this command: the branch must already exist

**`feat/$ARGUMENTS` is cut before SPEC, not during it, and not by you.** `ba` holds no `Bash` tool —
it cannot run git, cannot check which branch it is on, and will write `01-story.md` onto whatever
happens to be checked out without noticing. The design lane's orchestrator session cuts it, in the
`aiw-work` folder:

```
git fetch && git switch -c feat/$ARGUMENTS origin/main
```

From `origin/main`, not from the branch that is there. After `/handoff` the design lane sits on a
**detached HEAD**, and a story written there lands on a commit no branch reaches.

**What goes wrong when it is skipped**, because it is quiet in every direction. Writing SPEC while
`feat/<PREVIOUS>` is checked out puts `.ai/board/tickets/$ARGUMENTS/**` on the previous ticket's
branch. `/handoff <PREVIOUS>` then sorts it into the second set — one ticket's story pushed to an
`ops/` branch — or, if it is misfiled into the ticket set, `scripts/check-allowed-paths.mjs` fails
the whole branch and blocks a merge a human is waiting on. Nothing refuses the write at the time:
`guard-allowed-paths.mjs` is unwired (ADR-004) and `ba` cannot read `.git/HEAD` to warn you. MD-18.

**Say which branch you are writing against in the story's `inputs_read` front-matter** if you can
determine it from files. You cannot run git, so this is best-effort and not a gate — it exists so a
misfiled story is legible afterwards rather than only at handoff.

**Artifacts in:** `.ai/board/tickets/$ARGUMENTS/ticket.yaml`, `.ai/registry/**`
**Artifacts out:** `.ai/board/tickets/$ARGUMENTS/01-story.md`, plus `invariants_touched` and
`size_estimate` written back into `ticket.yaml`
**Template:** `.ai/templates/story.md`

**SPEC runs directly out of BACKLOG, and DoR is evaluated after it** — `BACKLOG -> SPEC -> [DoR] ->
READY`. Two DoR items are yours: `invariants_touched` and `size_estimate`. Leaving either unwritten
does not fail this stage quietly; it fails the gate immediately after it, and the ticket returns to
BACKLOG.

**Gate:** acceptance criteria in Given/When/Then, each with an ID; `invariants_touched` populated in
`ticket.yaml`; Out-of-scope non-empty; `size_estimate` set to S or M.

`size_estimate` is yours and only yours. It is an estimate from the story's scope and its Out-of-scope
section — not a verdict on the implementation, which is `size`, set by the Tech Lead at DESIGN from
the enumerated `allowed_paths`. A ticket you cannot estimate as S or M is not refined enough for this
stage to pass; say so rather than guessing.

On PASS, record the transition in `.ai/board/metrics.md` and **print the next command and its
session** — do not invoke it:

```
SPEC passed. Run /next-ticket in the orchestrator session to evaluate DoR.
```

**Do not set the ticket to `READY` yourself.** DoR is the orchestrator's evaluation, and an agent
that promotes its own output past the gate that judges it has removed the gate. Leave the state at
`SPEC`.

On FAIL or BLOCKED, record the reason, print nothing to run next, and stop.

The BA does not read `src/**` and does not take a story from a ClickUp description (RULE-05,
RULE-17). Policy is in `.ai/01-operating-model.md`.
