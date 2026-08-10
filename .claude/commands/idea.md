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
