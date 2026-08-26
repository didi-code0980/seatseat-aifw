---
description: Triage an idea into REJECT, NEEDS-ADR, or PROMOTE
argument-hint: <idea-filename>
---

Dispatch `product` and `tech-lead-design` against the idea named in `$ARGUMENTS`.

**Input:** `.ai/board/ideas/$ARGUMENTS`, plus `.ai/registry/**`
**Output:** the verdict appended to that idea file
**Gate:** exactly one verdict, with a reason.

| Verdict | Means |
|---|---|
| REJECT | Not worth doing, or already covered. Say which. |
| NEEDS-ADR | Needs a registry, schema, or dependency decision. Name what must be decided. |
| PROMOTE | Ready for a human to add feature IDs to the registry. |

**PROMOTE is a recommendation, not a state change.** The step between TRIAGE and BACKLOG is a human
adding rows to `.ai/registry/features.md`, and neither agent may do it (RULE-01).

Policy lives in `.ai/01-operating-model.md`.

---

## Last step: sign off

**End your reply with the block in `## Replying` (`CLAUDE.md`).** It is not a footer on the reply —
for most runs it *is* the reply. Do not stop at the step above and leave the operator to work out who
answered, whether it passed, where the repository is, and what runs next.

This command writes no artifact and passes no gate, so the first line ends `gate n/a`. *Tiếp theo* names
a command that runs **in the folder you are in**. If the next move belongs to another
lane, write `không có — <what this folder is waiting on>` instead: a session cannot see the other
worktrees, so naming a command for one is a guess about a branch that may have moved. `CLAUDE.md`
§*Tiếp theo is for the folder you are standing in* carries the rule and the failure that produced it.
**You hold no `Bash` tool**, so you cannot run `date` or `git branch --show-current`. Write
`unavailable — no Bash tool` on both lines. Guessing either is worse than leaving them blank.
