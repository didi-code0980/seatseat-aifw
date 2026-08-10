---
description: Run the DESIGN stage — the Tech Lead writes 02-design.md and fills allowed_paths
argument-hint: <TICKET-ID>
---

Dispatch `tech-lead-design` for ticket `$ARGUMENTS`.

**Artifacts in:** `ticket.yaml`, `01-story.md`, `.ai/registry/**`, `.ai/standards/**`
**Artifacts out:** `.ai/board/tickets/$ARGUMENTS/02-design.md`, plus `allowed_paths` written back
into `ticket.yaml`
**Template:** `.ai/templates/tech-design.md`

**Gate:** all seven sections complete; `allowed_paths` enumerated.

Nothing under `src/**` can be written until this stage fills `allowed_paths` — the guard blocks on
an empty list by design. Section 6 is what RULE-05 makes load-bearing: get it wrong and QA cannot
address the UI at all.

If the ticket needs a schema change, set `schema_delta` and `requires_adr: true`, stop with BLOCKED,
and state the decision needed. A human writes the ADR (RULE-09).

On PASS, advance to `IN_PROGRESS`.
