---
description: Run the documentation audit and report findings
---

Run `node scripts/check-docs.mjs` and report its output verbatim.

**Report only. Never fix.** A tool that repairs the thing it measures stops being a measurement, and
the repair it makes is the one nobody reviewed. Findings go to the operator.

| # | Check |
|---|---|
| D1 | Every feature ID referenced exists in `.ai/registry/features.md` |
| D2 | Every `INV-nn` referenced exists in `.ai/registry/invariants.md` |
| D3 | Every `RULE-nn` referenced exists in `.ai/registry/rules.md` |
| D4 | Every agent named in prose has a file in `.claude/agents/` |
| D5 | Every slash command referenced has a file in `.claude/commands/` |
| D6 | Every relative path mentioned under `.ai/**` exists on disk |
| D7 | Rules marked `verbatim_in:` match their copy character-for-character |
| D8 | No rule text appears near-verbatim elsewhere unless marked `verbatim_in:` — advisory |
| D9 | Every doc's `governed_by` cites rules whose version is at most the doc's `doc_version` |
| D10 | Every state in the `ticket.yaml` enum appears in the gate table, and the reverse |

D8 is advisory and never fails the run; it is a prompt for human judgement, because a paraphrase can
be a legitimate summary or a second source of truth and only a person can tell which.

**D6 is phase-aware.** Before `package.json` exists there is no `src/`, so references to scaffold
paths are reported as PENDING rather than as failures. Once the scaffold lands the check is strict.

Exit code 1 means at least one non-advisory check failed.
