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
| D5 | Every slash command referenced has a file in `.claude/commands/` |
| D6 | Every relative path mentioned under `.ai/**` exists on disk |
| D7 | Rules marked `verbatim_in:` match their copy character-for-character |
| D8 | No rule text appears near-verbatim elsewhere unless marked `verbatim_in:` — advisory |
| D9 | Every doc's `governed_by` cites rules whose version is at most the doc's `doc_version` |
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

**D12 enforces a revert condition instead of trusting memory.** ADR-002 left Row Level Security off
on the grounds that `src/lib/data/` is the single authorization point, and named the observable
signal that the reasoning has expired: `no-restricted-imports` gaining a Supabase entry. Either
direction counts — added to the restricted patterns, or added to the exception list — because both
mean the SDK is in the tree. Comments are ignored, so writing down why Supabase is absent does not
trip the check.

**D6 is phase-aware.** Before `package.json` exists there is no `src/`, so references to scaffold
paths are reported as PENDING rather than as failures. Once the scaffold lands the check is strict.

Exit code 1 means at least one non-advisory check failed.
