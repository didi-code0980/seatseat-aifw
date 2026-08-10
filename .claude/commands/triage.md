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
