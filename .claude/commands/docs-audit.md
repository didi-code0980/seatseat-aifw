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
| D12 | Supabase is confined to the shape ADR-006 authorises — `@supabase/ssr` only, restricted in lint, imported nowhere under `src/` but `src/lib/auth/` |
| D13 | Every Definition of Ready item names a stage that produces it, and that stage sits at or before READY |
| D14 | The feature ledger's status and ID agree — `TRIAGE` and `RECOMMEND` carry no ID, the other statuses carry one, IDs are unique and sit in their own group table |

**D13 was missing from this table until 2026-08-26** and had been since it was written. The check runs
and always has; only its entry here was absent, which is the same class of defect as an ADR's affected
list saying nothing changed (MD-32) — a register nothing reconciles against the thing it registers.

D8 is advisory and never fails the run; it is a prompt for human judgement, because a paraphrase can
be a legitimate summary or a second source of truth and only a person can tell which.

**D14 protects one thing, and it is worth naming because the check looks like formatting.** ADR-008
made `features.md` the single register for every feature at every stage of certainty, including
proposals nobody has verified. What stops an agent building its own proposal is that a `TRIAGE` or
`RECOMMEND` row carries **no ID** — because an ID is what makes a feature citable, and both D1 and
Definition of Ready ask only whether a row *exists*, never whether a human agreed with it. D14 is what
makes that rule enforced rather than merely written down. D1 gained the other half at the same time: a
citation of an `OUTDATED` row now fails, so retiring a feature actually stops tickets being seeded
against it.

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
signal that the reasoning has expired: direct client-to-database access.

**Rewritten 2026-08-24 for ADR-006, and the strictness did not drop.** Until then it failed on any
`@supabase/*` dependency and on any Supabase string in the lint config, which was right under ADR-002
and would have made ADR-006 unimplementable rather than reviewable. ADR-006 adopted Supabase Auth
*server-side only*, so the check now enforces that shape instead of forbidding the package: only
`@supabase/ssr` may be a dependency; the lint restriction must be **present** rather than absent once
it is; a `lib/data` path may not be exempted for Supabase; and no file under `src/` outside
`src/lib/auth/` may import `@supabase/*` at all. Comments are ignored, so writing down why a rule
exists does not trip it.

**Its one known blind spot is written into the source rather than left to be discovered.** A widened
lint exemption spelled `"src/lib/data/**"` names no vendor and is indistinguishable by a string
scanner from the legitimate Prisma exemption beside it. The `src/**` branch covers the consequence:
the guard can be loosened silently, the door cannot be opened silently.

**D6 is phase-aware.** Before `package.json` exists there is no `src/`, so references to scaffold
paths are reported as PENDING rather than as failures. Once the scaffold lands the check is strict.

Exit code 1 means at least one non-advisory check failed.

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
Read the three values rather than recalling them:

```
date '+%Y-%m-%d %H:%M %Z'
pwd
git branch --show-current
```

A remembered timestamp, folder or branch is the part of this block that can be wrong while looking
right.
