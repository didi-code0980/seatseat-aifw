---
ticket: SYS-02
from: developer
to: tech-lead-design
raised_at: 2026-08-27
blocks: a green `pnpm verify`, not this stage
---

# SYS-02 — open questions from IN_PROGRESS

One question, and it is the same shape as `02-design.md` `D-1`: a file this ticket makes false that
`allowed_paths` does not cover. It is stated in full here because every artifact stands alone
(RULE-16).

---

```markdown
---
from: developer
to: tech-lead-design
asked_at: 2026-08-27T01:28:07Z
---
```

**Q.** `tests/unit/self-signup.test.ts:113-115` asserts that `@supabase/ssr` is the **only**
`@supabase/*` package in `package.json`:

```ts
const supabaseDeps = allDeps.filter((d) => d.startsWith("@supabase/"));
expect(supabaseDeps).toEqual(["@supabase/ssr"]);
expect(allDeps).not.toContain("@supabase/supabase-js");
```

That is SYS-01's AC-3 encoded as a test, and it was correct under ADR-006. **ADR-007 clause 2 adopts
`@supabase/supabase-js` for data, so the assertion is now false by decision**, and `pnpm test` fails
on it: `1 failed | 125 passed`. Every other test in the repository passes, including
`tests/unit/seam-parity.test.ts` repointed at the new adapter and the 87 in
`scripts/tests/check-docs.test.mjs` with MD-16's ten D12 tests rewritten.

`tests/unit/self-signup.test.ts` is **not** in `ticket.yaml`'s `allowed_paths`, so RULE-03 refuses the
edit. `02-design.md` section 5 enumerates the list and does not name it; section 5's *"Not on the
list, on purpose"* does not name it either, so this reads as an omission rather than a decision — the
design found the same class of problem in the documentation corpus (`D-1`, twelve D6 references) and
did not sweep the test corpus for it.

**Two things this stage did NOT do, deliberately.** Neither is a route around the gap:

1. **It did not edit the test.** The path is outside `allowed_paths` and a developer widening its own
   permissions is what RULE-03 exists to stop.
2. **It did not edit `ticket.yaml`'s `allowed_paths`.** That field is DESIGN's output. The ticket
   directory is exempt from `check-allowed-paths.mjs`, so the edit would have succeeded mechanically
   and would have been an agent granting itself the permission the guard was there to withhold.

**One thing this stage did do, and it kept a second assertion green rather than breaking it.** The
same file's SYS-01 AC-5 asserts `eslint.config.mjs` *"only exempts `src/lib/auth/**`"*, tested as
`expect(eslintConfig).not.toMatch(/["']src\/lib\/data\/\*\*["']/)`. The new lint config exempts
`src/lib/data/supabase/**/*.ts`, which does not match that pattern, so AC-5 still passes — and it
passes for the right reason, because the exemption really is the adapter directory and not the seam.
That was checked, not assumed.

**What the answer needs to say.** Whether `tests/unit/self-signup.test.ts` joins `allowed_paths` —
with the amendment being the two lines above, narrowed from *"the only Supabase package"* to
*"exactly the two packages ADR-007's map names"* — or whether it is deliberately left red for a
follow-up chore, as `D-3` leaves the nine stale validation-layer comments.

**A.** <unanswered — raised at the end of IN_PROGRESS, 2026-08-27>

**Amended:** <pending>
