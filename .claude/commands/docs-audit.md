---
description: Run the documentation audit and report findings
---

Run `node scripts/check-docs.mjs` and report its output verbatim.

**Report only. Never fix.** A tool that repairs the thing it measures stops being a measurement, and
the repair it makes is the one nobody reviewed. Findings go to the operator.

| # | Check |
|---|---|
| D1 | Every feature ID referenced exists in `.ai/registry/features.md` |
| D2 | Every `INV-nn` referenced is in the ledger, or listed under `## Unissued IDs` |
| D3 | Every `RULE-nn` referenced exists in `.ai/registry/rules.md` |
| D4 | Every agent named in prose has a file in `.claude/agents/` |
| D5 | Every slash command referenced in a **human-owned** doc has a file in `.claude/commands/` |
| D6 | Every relative path mentioned in a **human-owned** `.ai/` doc exists on disk |
| D7 | Rules marked `verbatim_in:` match their copy character-for-character |
| D8 | No rule text appears near-verbatim elsewhere unless marked `verbatim_in:` — advisory |
| D9 | Every **human-owned** doc has front-matter, and its `governed_by` cites rules whose version is at most its `doc_version` |
| D10 | Every state in the `ticket.yaml` enum appears in the gate table, and the reverse |
| D11 | Every `ADR-nnn` referenced has a file in `.ai/registry/decisions/` |
| D12 | `no-restricted-imports` names no Supabase entry — ADR-002's revert signal |

D8 is advisory and never fails the run; it is a prompt for human judgement, because a paraphrase can
be a legitimate summary or a second source of truth and only a person can tell which.

**D2 recognises deliberately unissued IDs.** An ID listed in the `## Unissued IDs` table of
`invariants.md` is valid to cite and never valid to use. The alternative was making the author write
the number in pieces to get past the audit, which is a check rewriting the prose it measures.

**D11 exists because D6 cannot see an ADR.** D6 checks references written as paths; ADRs are cited by
ID. Without D11 a decision can be cited by several documents while the file recording it does not
exist — and since RULE-09 makes the ADR the only artifact that carries a human decision, the citation
reads as evidence of a decision that was never made. It scans `.yaml` under `.ai/` too, because a
ticket links its approved ADR in `schema_delta` and that link sits on the Definition of Ready.

**D5, D6 and D9 share one scope, and it excludes `.ai/board/**`.** They read the registry plane, the
standards, the templates, the charter and the operating model; D5 also reads all of `.claude/**`,
which is human-authored configuration that no stage writes. Board artifacts — tickets, stage
artifacts, `backlog.md`, `metrics.md` — are agent output and belong to the gates in
`.ai/01-operating-model.md`, not to this audit. See "What a check may be scoped to" in
`.ai/standards/testing-standards.md`.

Each was narrowed after a real false positive, and all three are the same mistake:

- **D9** required `doc_version` on every `.md` under `.ai/`. The first story written hit it and had
  the three fields pasted in to clear the failure — satisfied rather than reported, which is what a
  check on agent output gets by default.
- **D5** read `/rooms` in `02-design.md` as a slash command with no definition. It is a Next.js
  route. `tech-lead-design` reported the finding rather than renaming the route, which is the right
  behaviour and exactly the one not to design around.
- **D6** would report a design's `allowed_paths` as missing files. They are missing: creating them is
  the next stage's job, and the design naming them first is the point.

A narrowing fails by narrowing to nothing, so each has tests in both directions — the artifact that
must not be reported, and the same bytes under a human-owned path, which must be.

**D12 enforces a revert condition instead of trusting memory.** ADR-002 left Row Level Security off
on the grounds that `src/lib/data/` is the single authorization point, and named the observable
signal that the reasoning has expired: `no-restricted-imports` gaining a Supabase entry. Either
direction counts — added to the restricted patterns, or added to the exception list — because both
mean the SDK is in the tree. Comments are ignored, so writing down why Supabase is absent does not
trip the check.

**D6 is phase-aware.** Before `package.json` exists there is no `src/`, so references to scaffold
paths are reported as PENDING rather than as failures. Once the scaffold lands the check is strict.

Exit code 1 means at least one non-advisory check failed.
