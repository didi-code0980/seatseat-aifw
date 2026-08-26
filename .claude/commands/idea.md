---
description: Capture a raw request as a written idea under .ai/board/ideas/
argument-hint: <text>
---

Dispatch the `product` subagent.

**Input:** `$ARGUMENTS`
**Template:** `.ai/templates/idea.md`
**Output:** a new file in `.ai/board/ideas/`, named `<yyyy-mm-dd>-<kebab-slug>.md`
**Gate:** the file states a problem, not a solution; it has no feature ID.

An idea has no feature ID and does not become one here. Only a human writes to
`.ai/registry/features.md` (RULE-01).

Policy lives in `.ai/01-operating-model.md`. Do not restate it; follow it.

---

## Last step: sign off

**End your reply with the block in `## Replying` (`CLAUDE.md`).** It is not a footer on the reply —
for most runs it *is* the reply. Do not stop at the step above and leave the operator to work out who
answered, whether it passed, where the repository is, and what runs next.

**This command writes an artifact and it has a gate** — `.ai/board/ideas/<file>.md`, and the IDEA row of
the stage ownership table in `.ai/01-operating-model.md` reads *an idea file exists with a problem
statement, not a solution*. Quote that verdict on the first line; `gate n/a` is wrong here and was
written into this file by mistake on 2026-08-25 (MD-35). *Tiếp theo* names
a command that runs **in the folder you are in**. If the next move belongs to another
lane, write `không có — <what this folder is waiting on>` instead: a session cannot see the other
worktrees, so naming a command for one is a guess about a branch that may have moved. `CLAUDE.md`
§*Tiếp theo is for the folder you are standing in* carries the rule and the failure that produced it.
**You hold no `Bash` tool**, so you cannot run `date` or `git branch --show-current`. Write
`unavailable — no Bash tool` on both lines. Guessing either is worse than leaving them blank.
