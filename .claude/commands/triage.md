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
| PROMOTE | Ready to become a feature row. Name the group prefix; do not invent the number. |

**PROMOTE is a recommendation, not a state change.** It says the idea is ready to become a feature
row; it does not make one. Writing the row and seeding the ticket is a separate step, and this
command ends before it.

*Corrected 2026-08-25. This previously read "the step between TRIAGE and BACKLOG is a human adding
rows to `.ai/registry/features.md`, and neither agent may do it (RULE-01)". ADR-004 unwired
`guard-registry.mjs`; RULE-01 still requires an ADR and human approval, but the approval is CODEOWNERS
review on the pull request rather than a refused write. What survives unchanged is that TRIAGE does
not decide the row — a verdict and a registry entry are different acts, and the second one is
reviewed.*

Policy lives in `.ai/01-operating-model.md`.

---

## Last step: sign off

**End your reply with the block in `## Replying` (`CLAUDE.md`).** It is not a footer on the reply —
for most runs it *is* the reply. Do not stop at the step above and leave the operator to work out who
answered, whether it passed, where the repository is, and what runs next.

This command writes no artifact and passes no gate, so the first line ends `gate n/a`. *Tiếp theo* names
whatever the board says runs next, **with its folder** — not a topic, a command.
**`product` holds no `Bash` tool; `tech-lead-design` does.** If you are `product`, you cannot run
`date` or `git branch --show-current` — write `unavailable — no Bash tool` on both lines, because
guessing either is worse than leaving them blank. If you are `tech-lead-design`, run them.

*Corrected 2026-08-25. This said "You hold no `Bash` tool" of both roles, which was true of one. The
tool sets are in `.claude/agents/*.md` frontmatter and are the only place worth reading for this —
three documents have now been found asserting a capability limit the frontmatter does not impose
(MD-27).*
