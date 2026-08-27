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

---

## Added at QA, 2026-08-27T03:52:46Z

Two entries, from `qa`, appended rather than replacing anything above. The `developer` question is
**not** restated — it is confirmed, and the confirmation is the first entry. RULE-16: each block below
carries its own `from`/`to` so it stands alone.

---

```markdown
---
from: qa
to: tech-lead-design
asked_at: 2026-08-27T03:52:46Z
blocks: the QA gate, and a green `pnpm verify`
---
```

**Q.** The `developer` question above is **confirmed independently by the QA gate, and it is now
blocking.** A fresh QA session (RULE-13) reached the same failure without reading `03-impl-log.md`:

```
tests/unit/self-signup.test.ts:114
AssertionError: expected [ '@supabase/ssr', '@supabase/supabase-js' ]
                to deeply equal [ '@supabase/ssr' ]
```

`pnpm test` exits **1** — 159 passed, 1 failed. The QA gate is *"`pnpm test` and `pnpm test:e2e` exit
0"*, so this single stale assertion fails the gate on its own. `pnpm test:e2e` passes, 96 of 96.

**What QA adds to the question rather than repeating.**

1. **`qa` cannot fix it either, and did not try.** `tests/**` is QA's artifact directory per
   `.claude/commands/qa.md`, but `ticket.yaml`'s `allowed_paths` names exactly ONE test path —
   `tests/unit/seam-parity.test.ts` — and RULE-03 is registry plane while the command file is not.
   All 24 tests added at QA went into that one file. `node scripts/check-allowed-paths.mjs` exits 0.
2. **The routing.** `06-test-report.md` routes this to `tech-lead-design` with
   `increments_rework_count: false`, on the *"R5 impossible as specified"* row and the principle
   printed beneath the routing table — *upstream defects must not burn the downstream agent's rework
   budget*. Routing it to `developer` instead would charge a RULE-06 budget for a defect the developer
   did not cause, cannot fix under RULE-03, and had already reported here. **If the amendment lands as
   a `developer`-routed rework, that increment is the error, not the fix.**
3. **The narrowed assertion QA would expect to pass afterwards.** Stated so the amendment is not
   re-derived: `["@supabase/ssr", "@supabase/supabase-js"]` sorted, with the `not.toContain` line
   deleted. The same file's SYS-01 AC-5 assertion —
   `expect(eslintConfig).not.toMatch(/["']src\/lib\/data\/\*\*["']/)` — is green today and stays green,
   because the new exemption is `src/lib/data/supabase/**/*.ts` and does not match that pattern. QA
   verified this: 14 of the 15 tests in that file pass.

**A.** <unanswered — raised at QA, 2026-08-27>

**Amended:** <pending>

---

```markdown
---
from: qa
to: ba
asked_at: 2026-08-27T03:52:46Z
blocks: AC-1 entirely, and the second half of AC-9, AC-11 and AC-12. Not the ticket's gate.
---
```

**Q.** `01-story.md` `Q-2` is still open, and it is what makes four acceptance criteria unexecutable.
This is not a complaint about how the ACs are written — they are written well and against observable
things. It is that **the environment they describe has not been decided.**

Established by reading this machine, not assumed:

- `which supabase` → not found. `docker info` → unavailable.
- `.env.local` carries `DATA_SOURCE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. `DATABASE_URL` and `DIRECT_URL` are absent — `ticket.yaml` precondition 1 already says so.
- The one Supabase project that exists is the live one (precondition 2, the operator's answer: *"Chỉ có 1 project supabase duy nhất."*).

| AC | The clause that cannot run |
|---|---|
| AC-1 | *"the data shown comes from the Postgres database"*, and *"a row created through the application is still present after the process is restarted"*. Needs a reachable database and a restart. **No test was written; the AC has no row in the coverage map.** |
| AC-9 | *"types are regenerated from a local reset of those migrations and compared"*. Needs Docker and the Supabase CLI. The CI contract that performs it is asserted; the regeneration is not. |
| AC-11 | *"the database rejects the write, **not only the application**"*. The emphasis is the AC's own point, and mock-mode e2e is precisely the thing it excludes. |
| AC-12 | *"the application renders the same rooms, seats, members and devices that `DATA_SOURCE=mock` renders"*, and *"running the seed a second time changes nothing"*. |

**Why this is being raised rather than proxied.** Each of these has a cheap-looking stand-in — read the
migration text, run the mock-mode e2e suite, read the seed script. QA wrote those stand-ins where they
are honestly informative and labelled them PARTIAL. What it did **not** do is give any of them the AC's
ID and call the criterion covered. The superseded QA report at 2026-08-27T02:49:00Z did mark AC-1 and
AC-11 PASS on exactly that basis, and its AC-1 evidence cited `src/lib/data/index.ts` — a file RULE-05
forbids QA reading. Both are withdrawn in `06-test-report.md`.

**What the answer needs to say.** Which database a non-production run reaches — a second project, a
local CLI stack, or neither, with these four criteria accepted as verified only in CI or only by hand.
Any of the three is a legitimate answer. `01-story.md` `Q-2` names the lever ADR-007 clause 7 already
provides (`DATA_SOURCE`) and says the open part is **where it is pinned** — per worktree, in the test
harness, or in CI. It is still open.

**This does not block the QA gate.** The gate fails on the entry above. Per the failure routing table
this one routes to `ba` and does not increment `rework_count`.

**A.** <unanswered — raised at QA, 2026-08-27>

**Amended:** <pending>
