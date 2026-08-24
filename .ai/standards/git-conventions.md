---
doc_version: 2
last_updated: 2026-08-24
governed_by: [RULE-03, RULE-09, RULE-10]
---

# Git conventions

## Line endings

`.gitattributes` sets `* text=auto eol=lf`, with explicit `eol=lf` for `.mjs`, `.md`, `.json`,
`.yaml`, and `.yml`. It was the first file created in this repository, before any other content, so
that nothing was ever committed with the wrong endings.

The system `core.autocrlf=true` on this machine does not override it — `.gitattributes` wins per
path. Do not configure an editor or a hook to change this.

This matters more than it looks. CRLF in a `.mjs` file that another tool executes, or in a fixture a
test compares against, produces failures that reproduce on one machine and not another.

## Branches

One branch per ticket: `feat/<TICKET-ID>`.

The branch name is not decoration — `.claude/hooks/guard-allowed-paths.mjs` and
`scripts/check-allowed-paths.mjs` both resolve the active ticket by parsing it. A ticket worked on a
branch named anything else runs with the path guard disabled, because a non-`feat/` branch is treated
as bootstrap or chore work and is allowed through.

Other prefixes: `ops/` for chores, `fix/` for defects. Neither activates the path guard.

## Commits

**Agents do not commit — with one exception: the `orchestrator`, inside `/handoff` and `/ship`.**
Every other stage leaves the working tree dirty. That is deliberate: a commit is an assertion that a
change is coherent, and that assertion is one of the things being validated.

The exception was `/ship` alone until 2026-08-24, and it existed because `/ship` could not complete
itself: its step 4 requires an open pull request, a pull request requires commits on a pushed branch,
and this section forbade the only agent in that command from producing them while no step asked a
human to. MD-07.

**`/handoff` was added for the same reason one lane further up.** Under the three-worktree arrangement
a ticket crosses folders twice, and the artifacts one lane produced are the input the next lane reads.
An input that exists only as a dirty file in a folder the next lane cannot open is not an input, and
the constructing roles that produce it — `ba`, `tech-lead-design` — hold no `Bash` tool and cannot
persist it themselves. MD-15. Three commit points now, one per boundary:

| Command | Lane | Commits |
|---|---|---|
| `/handoff` | `aiw-work`, after DESIGN | the story and the design |
| `/handoff` | `aiw`, after QA | `src/**`, `tests/**`, artifacts 03–06 |
| `/ship` | `aiw-work` | `state: DONE`, the board files, then the pull request |

Every `/handoff` ends by releasing the branch name (`git switch --detach`), because git holds a branch
exclusively across worktrees and the next lane's `git switch` fails outright without it. Details in
`.ai/standards/session-model.md` and `.claude/commands/handoff.md`.

**RULE-09 is unchanged and needed no ADR.** It names schema changes, ADRs, registry edits and PR
merges. Committing was never among them — the prohibition lived here, in a standard, and it is this
standard that was amended.

### What the orchestrator decides

How the work is grouped. It classifies the working tree, chooses which files form one coherent
change, how many commits there are, and what each message says. That judgement is its own and this
document does not constrain it.

### What it does not decide

**The branch boundary, because CI is branch-scoped and not commit-scoped.**
`scripts/check-allowed-paths.mjs` computes its diff as `origin/main...HEAD` — the whole branch.
Splitting mixed work into separate *commits* on `feat/<TICKET-ID>` therefore buys nothing: the
`allowed-paths` check still sees every file on the branch, fails, and branch protection then blocks
the very merge a human is meant to perform. The split has to be by branch.

| Set | Contents | Branch | Result |
|---|---|---|---|
| Ticket | paths matching `allowed_paths`, plus `.ai/board/tickets/<TICKET-ID>/**` | `feat/<TICKET-ID>` | the ticket's pull request |
| Everything else | model, registry, standards, hooks, scripts, tooling | `ops/<slug>` cut from `main` | a second pull request, reviewed on its own |

The `ops/` branch is not a lesser pull request, and committing a CODEOWNERS path is not a rule being
bent. `.github/CODEOWNERS` requires human review on `.ai/registry/`, `.ai/standards/`, `prisma/`,
`.claude/`, `.github/` and `.mcp.json`. That is what makes recording such a change safe to automate:
the orchestrator records it, a human still approves it. **Recording is not authoring.** RULE-01
governs who *writes* the registry, `guard-registry.mjs` still refuses the orchestrator's `Edit`, and
neither is touched by this exception.

Two limits are not the orchestrator's to weigh:

- **`main` is never a commit or a push target.** `git push origin main` and `git push --force` stay
  denied in settings.
- **Merging stays human.** RULE-09. `gh pr merge` stays denied.

`git push` is deliberately absent from the allow list, so every push prompts once. That prompt is the
last point at which a human sees a branch name before history exists.

### The second exception: a direct instruction

**Any agent may commit and push when the operator instructs it to, in that session, for that work.**
The authorization is the instruction; it does not generalize to the next run, and no agent infers it
from having been given it before.

This is stated rather than left implicit because the alternative is worse in both directions. Unstated,
it makes the first paragraph of this section false the first time an operator says "commit this" to
anything but the orchestrator — and a standard that everyone routinely violates stops being read as a
standard. Stated too broadly, it becomes the exception that swallows the rule. So it is narrow on
purpose: an instruction, in the session, for the work in front of it. Two things it never grants,
because they are not this document's to grant: a merge (RULE-09) and a write to `.ai/registry/**`
(RULE-01, and `guard-registry.mjs` refuses regardless of what anyone was told).

The chore branch prefixes are `ops/` and `fix/`, per **Branches** above. Work that is not a ticket does
not go on `feat/<TICKET-ID>` — that name activates the path guard against a ticket the work has nothing
to do with.

The message references the ticket ID and the stage, whoever writes it:

```
<TICKET-ID>: implement room list read path

Design contract items 1-4. Files listed in 03-impl-log.md.
```

## Pull requests

The loop's terminal output is an **open pull request**, never a merge. Per RULE-09, merges are
permanently human.

`/ship` runs the build, marks the ticket DONE, and opens the PR with `gh pr create`. `gh pr merge` is
in the settings deny list, so an agent that tries to merge is blocked rather than trusted not to.

The PR body links the ticket folder and lists the four gate timestamps.

## Protected operations

Denied in `.claude/settings.json`:

- `git push --force`
- `git push origin main`
- `git reset --hard`
- `gh pr merge`

`git reset --hard` is denied because an agent recovering from a confusing state will reach for it,
and the state it discards includes the artifacts that explain how the confusion happened.

## Branch protection

Points at exactly two status checks: `verify` and `allowed-paths`.

**Do not enable it until `verify.yml` has passed at least once.** A required check that has never
passed blocks every pull request, including the operator's, and the only way out is to disable the
protection you just configured.

## CODEOWNERS

`.github/CODEOWNERS` requires human review on `.ai/registry/`, `.ai/standards/`, `prisma/`,
`.claude/`, `.github/`, and `.mcp.json`. These are the paths where RULE-01 and RULE-09 apply, and
CODEOWNERS is the mechanism that makes them apply to a pull request rather than only to a hook.

## Git is the source of truth

RULE-10. The tracker mirrors state and is never read back to decide what happens next. A ticket's
state is what `ticket.yaml` says on disk, not what a ClickUp status field says.
