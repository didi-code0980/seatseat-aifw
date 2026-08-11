---
description: Run the IN_PROGRESS stage — the Developer implements the design
argument-hint: <TICKET-ID>
---

Dispatch `developer` for ticket `$ARGUMENTS` on branch `feat/$ARGUMENTS`.

**Artifacts in:** `ticket.yaml`, `01-story.md`, `02-design.md`, `.ai/standards/**`
**Artifacts out:** code inside `allowed_paths`, and
`.ai/board/tickets/$ARGUMENTS/03-impl-log.md`
**Template:** `.ai/templates/impl-log.md`

**Gate:** `pnpm typecheck` and `pnpm lint` exit 0; every contract item in design section 1 is
implemented; `03-impl-log.md` lists every file touched with a one-line reason.

Check the branch first. `guard-allowed-paths.mjs` resolves the ticket from `feat/<ID>`, so work done
on another branch name runs with the path guard inactive.

The Developer may consult `tech-lead-design` and `ba`. It may not contact `tech-lead-review` or `qa`
before their verdicts exist (RULE-12).

On PASS, advance to `REVIEW` — and **tear down the team session at that transition** (RULE-13).
