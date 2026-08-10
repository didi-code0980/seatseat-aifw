---
doc_version: 1
last_updated: 2026-08-10
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

**Agents do not commit.** The loop leaves the working tree dirty and a human commits. This is
deliberate: a commit is an assertion that a change is coherent, and that assertion is one of the
things being validated.

Where a human commits on behalf of the loop, the message references the ticket ID and the stage:

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
