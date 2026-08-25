# SYS-01 — open questions

Questions raised by IN_PROGRESS that it cannot answer from its own inputs, and the stage each is
routed to. Each is stated in full here and in full wherever it is acted on, because every artifact
stands alone (RULE-16).

**Neither of these blocks IN_PROGRESS.** The stage gate is `pnpm typecheck` and `pnpm lint` exiting
0, every contract item in `02-design.md` section 1 implemented, and `03-impl-log.md` complete. All
three hold. Q-1 is a deviation already taken and shipped — it is routed for the amendment, not for
permission. Q-2 is an acceptance criterion that cannot be satisfied from inside `allowed_paths` by
anyone, and it will fail at QA if nothing is done before then.

---

```markdown
---
from: developer
to: tech-lead-design
asked_at: 2026-08-25T09:35:00Z
---
```

## Q-1 — the literal component in `02-design.md` 1.4 is a lint error, and `pnpm lint` is a gate item

**Routed to:** `tech-lead-design`. **Raised by:** `developer`, IN_PROGRESS. **Blocks:** nothing —
the deviation is implemented and the gate is green. This is the RULE-14 amendment.

`02-design.md` 1.4 specifies `src/app/(auth)/login/self-signup-notice.tsx` as `useState` initialised
to `"disabled"` plus a `useEffect` whose body calls `setSetting(readSelfSignupSetting())`. Those
exact lines do not pass `pnpm lint` in this repository. `eslint-config-next@16.3.0` enables the React
Compiler rule `react-hooks/set-state-in-effect`, which reports:

```
13:5  error  Calling setState synchronously within an effect can trigger cascading renders
             ...  react-hooks/set-state-in-effect
```

Measured, not inferred: the design's lines were written to the file verbatim and `eslint` was run
over them before they were replaced. `pnpm lint` exiting 0 is an IN_PROGRESS gate item, so the
prescribed shape cannot ship as written. This is the repository's first effect hook, which is why no
earlier ticket met the rule.

**What shipped instead:** `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`, where
`getServerSnapshot` returns `SELF_SIGNUP_DISABLED` and `getSnapshot` calls `readSelfSignupSetting()`.
Every clause of the design's stated reasoning is preserved rather than worked around — the server
renders `disabled`, the client resolves the flag only after hydration, and the initial value agrees
with the server for the same reason the design gives (it is both what the server renders and what
the flag defaults to) rather than by coincidence. `subscribe` listens for `storage` at module scope
so the reference is stable. `pnpm build` prerenders `/login` as static, so no hydration warning
appears and AC-10's *the page does not error* and AC-11's *the page renders* both hold.

**The alternative rejected:** an `eslint-disable` comment keeping the design's literal lines. That
suppresses a real rule about a real hazard in order to preserve a mechanism the design chose for its
effect, not for itself.

**Nothing else about the component changed.** Same file, same `"use client"` directive, same single
`data-testid="login-self-signup"`, same two literals, same markup. Section 6.1's selector table is
unaffected and `tests/e2e/self-signup.spec.ts` is written against behaviour that is identical.

**Answer needed:** an amendment to `02-design.md` 1.4 replacing the specified hook mechanism, so the
design and the code agree and a reviewer checking R4 against section 1 does not read a divergence as
a defect.

---

```markdown
---
from: developer
to: tech-lead-design
asked_at: 2026-08-25T09:35:00Z
---
```

## Q-2 — AC-6 cannot pass: deleting the three files makes check D6 fail on two ADRs, and both are registry

**Routed to:** `tech-lead-design`. **Raised by:** `developer`, IN_PROGRESS. **Blocks:** QA, not
IN_PROGRESS. **A human is required either way** — every candidate fix is under `.ai/registry/**`.

`01-story.md` AC-6 requires `node scripts/check-docs.mjs` to exit 0 and report no D12 finding. After
this ticket it reports **no D12 finding and six D6 errors**, and exits 1:

```
FAIL D6 (6)
  - .ai/registry/decisions/ADR-002-supabase-hosted-postgres.md: mentions src/app/api/auth/[...all]/route.ts, which does not exist on disk
  - .ai/registry/decisions/ADR-006-supabase-auth-replaces-better-auth.md: mentions src/lib/auth/auth.ts, which does not exist on disk
  - .ai/registry/decisions/ADR-006-supabase-auth-replaces-better-auth.md: mentions src/lib/auth/client.ts, which does not exist on disk
  - .ai/registry/decisions/ADR-006-supabase-auth-replaces-better-auth.md: mentions src/app/api/auth/[...all]/route.ts, which does not exist on disk
  - .ai/registry/decisions/ADR-006-supabase-auth-replaces-better-auth.md: mentions src/app/api/auth/[...all]/, which does not exist on disk
  - .ai/registry/decisions/ADR-006-supabase-auth-replaces-better-auth.md: mentions src/app/api/auth/, which does not exist on disk
```

**The baseline was clean and this change caused it.** `02-design.md` 6.3 records the pre-change
measurement as `errors: 0  warnings: 0  pending: 0`, and that was reproduced here by stashing the
working tree, running the audit, and restoring: 0 errors before, 6 after. All six name one of the
three files `02-design.md` 1.1 deletes.

**Nothing in `allowed_paths` can fix it.** `scripts/check-docs.mjs:231-268` scans governed documents
only — `isGovernedDoc` is `.ai/registry/`, `.ai/standards/`, `.ai/templates/`, the charter and the
operating model — and it fires on any backticked or linked path under `src/` that is not on disk.
The two failing files are both `.ai/registry/decisions/`. RULE-01 makes changing them a human step
with an ADR and CODEOWNERS review, and `02-design.md` section 5 deliberately leaves the whole
registry out of `allowed_paths`, so `guard-allowed-paths.mjs` refuses the write before RULE-01 is
even reached. The Developer has no move here that is not a violation.

**This is structural, not specific to SYS-01.** D6 asserts that a path named in a governed document
exists on disk. An ADR that records a deletion names the path it deleted — that is what makes the
decision legible. So **every future ticket that deletes a file an ADR cites will fail D6 the moment
it succeeds**, and the check is at its loudest exactly when the ticket did what the ADR asked. That
reading belongs to the steward, who owns `scripts/check-docs.mjs`; it is raised here rather than
acted on because `.ai/steward/context.md` forbids patching the model while a ticket is mid-stage,
and because the fix is a decision about what D6 should mean, not an implementation.

**Three shapes the answer could take, none of them the Developer's to choose:**

1. **Amend AC-6** to assert what it was written to assert — no D12 finding — and to exempt D6
   findings whose subject is a path this ticket's own contract deletes. Cheapest, and it leaves the
   audit red.
2. **Edit the two ADRs** so the deleted paths are described rather than written as paths (D6 only
   sees backticked and linked path-shaped tokens). Human, under RULE-01. It keeps the audit green
   and costs the ADRs some of their precision about what was removed.
3. **Change D6** to accept a path a governed document marks as removed. Steward's, and the only one
   that fixes the class rather than this instance.

**Answer needed:** which of the three, and by whom, before `/qa`. QA will run the command in
`02-design.md` 6.3 and read exit 1. Left alone, AC-6 fails on a red audit that no one in the loop is
permitted to make green — and the ticket escalates for a reason that has nothing to do with the
implementation.

**What is not in question:** D12 itself reports nothing, which is the half of AC-6 that was written
about ADR-002's and ADR-006's revert conditions. AC-3, AC-4 and AC-5 all hold by inspection, `pnpm
lint` exits 0, and the audit's own D12 branch agrees with all three.
