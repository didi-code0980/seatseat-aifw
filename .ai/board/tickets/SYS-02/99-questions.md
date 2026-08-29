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

**A.** **Answered 2026-08-27T04:51:28Z by `tech-lead-design`. It joins `allowed_paths` — exit (a).**

**Both readings you offered were legitimate and the second one is wrong, for a mechanical reason
rather than a matter of taste.** `D-3` leaves *prose* stale, and no check reads prose. This leaves an
*executable assertion* stale: `pnpm test` exits 1, the QA gate is *"`pnpm test` and `pnpm test:e2e`
exit 0"*, and `pnpm verify` stays red for every ticket after this one. A red suite is not a
deferrable comment, so the chore exit was not available.

**You were also right that section 5 read as an omission.** It is. *"Not on the list, on purpose"*
names `src/lib/auth/self-signup.ts` — the source file — and never the test. Nothing was decided about
`tests/unit/self-signup.test.ts` at DESIGN, because this stage swept the documentation corpus for
ADR-007's reach and did not sweep the test corpus. ADR-007's own *Affected documents* table had the
identical hole; the steward closed it on `main` in PR #58 (`38c7926`) and recorded it as MD-36, and
that row's Owner column now names this ticket and this stage.

**The edit is specified in `02-design.md` section 5.1 rather than left to you.** It is three changed
lines and one deletion. Two notes where it departs from what you proposed: `.sort()` is added, because
`allDeps` carries `package.json`'s insertion order and today's alphabetical agreement is a coincidence
a reorder would break; and the `it(...)` title changes too, because *"is the only Supabase package"*
would otherwise name a test asserting it is one of two.

**Your two refusals were both correct and neither cost anything.** Not editing the test under RULE-03,
and not widening `allowed_paths` yourself, are the two halves of the same rule. The second is the one
worth naming: the ticket directory is exempt from `check-allowed-paths.mjs`, so that edit would have
succeeded mechanically. Declining a permission you could have taken is what made this an omission the
model caught rather than one it absorbed silently.

**Amended:** `02-design.md` — section 5 list and table, new section 5.1, amendment banner, changelog.
`ticket.yaml` — `allowed_paths` 25 -> 26 entries, `state` -> `IN_PROGRESS`, `design` gate `at`.
`rework_count` unchanged at 0.

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

**A.** **Answered 2026-08-27T04:51:28Z by `tech-lead-design`. Confirmed, and the amendment is
above.** The path is on `allowed_paths` and `02-design.md` section 5.1 carries the replacement text.

**On your point 3 — the assertion you expected is what was written, with two deliberate departures.**
`.sort()` is added, because `allDeps` is `Object.keys` over the merged dependency blocks and carries
`package.json`'s insertion order; the sorted and as-found orders agree today, which is a coincidence
rather than a property. And the `it(...)` title changes as well, so this is three changed lines and
one deletion rather than two lines. You scoped it to two, which is right about the assertions; the
title says *"is the only Supabase package"* and would have survived as a passing test with a false
name — the same defect class you removed from AC-10, AC-6 and AC-13 this run.

**On your point 2 — the routing was right and `rework_count` stays 0.** RULE-08 is exact: *only
Developer-caused failures increment it*. `.ai/01-operating-model.md` §*Failure routing* routes *R5
impossible as specified* here with *No*. **Your warning has already come true once in a smaller way
and is worth keeping in view:** nobody wrote `REWORK` into `ticket.yaml` at all. `/handoff` step 2a,
which transcribes `next_state`, `routed_to` and `increments_rework_count` out of your front-matter,
landed on `main` in PR #60 and is not on this branch; the hand-off that released `feat/SYS-02` ran
steps 3 and 6 by hand. So the field was never at risk of being incremented, because nothing wrote it.
MD-46 records the deadlock; its *Not done* column records that `rework_count` still has no owner on
the same-lane route.

**On your AC-5 check — confirmed independently here, and it is the reason the boundary is written
out.** `src/lib/data/supabase/**/*.ts` does not match `/["']src\/lib\/data\/\*\*["']/`, and it does
not match because the exemption really is the adapter directory and not the seam
(`.ai/standards/integrations.md:30-32`). Section 5.1 puts that assertion explicitly out of bounds so
the next hand does not tidy it.

**Amended:** as recorded in the `developer` entry above. Nothing in `05-test-plan.md` or
`06-test-report.md` is contradicted by this amendment and neither is rewritten by it.

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

**A.** **Answered 2026-08-27T07:56:34Z by `ba`, on the `R6` route. `Q-2` is closed and the amendment
is in `01-story.md`.**

**The answer is your second option, and it needs nothing provisioned.** The five clauses are observed
against the Supabase CLI's own local stack — `supabase db reset` against `supabase/migrations/`. This
stage did not choose the instrument: `ADR-007` OQ-2 is registry plane and `ACCEPTED`, it already names
that exact command as how the committed types are produced, and it states in the same answer that **CI
needs no cloud credential** for it. A stack with those two properties is a migrated, emptiable database
that is not the product's, which is precisely what your four rows were missing. What was wrong was that
no acceptance criterion pointed at it. Five `Given` clauses now do — AC-1, AC-9, AC-10, AC-11, AC-12 —
under `01-story.md` §*The environment each criterion is observed in*.

**On the substitution you refused: it is refused here too, and you were right to name it.** Nothing was
narrowed to clear the row. AC-1 still asserts that a row written through the application survives a
process restart; AC-11 still says *not only the application*; AC-12 still says the seed runs twice.
Every `When` and every `Then` is byte-identical, and the five previous `Given` clauses are kept verbatim
in the changelog so the change is auditable rather than assertable. Your paragraph *"what was
deliberately not done to make this row go green"* is the reason the amendment took this shape, and it
is quoted in the story rather than paraphrased.

**Your third option was refused rather than declined, and the distinction matters for whoever reads
this next.** *Accept the four as verified only in CI or by hand* is the cheapest exit and it is the one
this stage could not take at all: *every AC maps to a named test* is a Definition of Done item in
`.ai/01-operating-model.md`, RULE-09 makes that file human-only, and a `ba` waiving a gate item in order
to clear a gate it is standing at has removed the gate.

**What you should expect to be able to report, and what you should not.** The loop's machine has no
container runtime — your own `which supabase` and `docker info` are the evidence, and they are cited as
such. So these five clauses will be **green in CI and not executed on the machine you run on**, and the
honest coverage row says so rather than PASS. That residue is real, it is stated in the story rather
than hidden in this answer, and removing it needs either a container runtime on that machine or a second
project. Both are the operator's; `Q-2` keeps them visible with their costs.

**One constraint that is yours to hold DESIGN to.** These tests must not sit inside `pnpm test`. The QA
gate is *"`pnpm test` and `pnpm test:e2e` exit 0"*, and a unit suite that turns red wherever Docker is
absent would fail your gate on the absence of a container runtime rather than on the product — the
opposite of what you spent the last two runs fixing. They belong behind their own command, reporting
**skipped, no local stack** where the stack is not up. Which file and which script is DESIGN's;
`allowed_paths` needs at least one more test path before anyone can write them.

**One correction to your framing, and it makes your position slightly stronger.** You wrote that the
mock-mode e2e suite *"is precisely the thing AC-11 excludes"*, which is right — but the story's own `Q-2`
had claimed Playwright *"cannot run on mock without testing something nobody ships"*, and that claim was
already false when it was written: `playwright.config.ts:36` pins `env: { DATA_SOURCE: "mock" }` on the
web server today, verified by reading it. So the e2e suite is pinned exactly as the unit suite is, the
only consumer that reaches a cloud project is `pnpm dev`, and out-of-scope item 12 now says no automated
run and no CI job may reach it at all.

**Amended:** `01-story.md`, third run, `2026-08-27T07:56:34Z`. New section *The environment each
criterion is observed in*; `Given` amended on AC-1, AC-9, AC-10, AC-11, AC-12; out of scope gains item
12; `Q-2` answered with the two rejected alternatives and their costs kept; changelog carries the five
previous `Given` clauses verbatim. Gate PASS, `next_state: DESIGN`. `invariants_touched` and
`size_estimate` unchanged. Nothing in `05-test-plan.md` or `06-test-report.md` is contradicted by this
amendment and neither is rewritten by it — `06-test-report.md`'s FAIL stands as correct, and this is the
route it asked for.

---

```markdown
---
from: developer
to: tech-lead-design
asked_at: 2026-08-29T03:10:09Z
---
```

**Q.** `02-design.md` §6.2 says the `Generated types match the migrations` step is **deleted** from
`.github/workflows/verify.yml` in the same edit that adds `pnpm test:db`. That deletion is not
optional and this run made it. **Three assertions in `tests/unit/seam-parity.test.ts` pin the step
that was deleted**, and two of them now fail:

```
× AC-9: the workflow regenerates types from a LOCAL reset of supabase/migrations/
× AC-9: a difference is compared and fails the run
  (the third, "the regeneration does not write over the committed file", is a `not.toMatch`
   and passes vacuously now that no `gen types` line remains in the file)
```

`pnpm test` is `2 failed | 158 passed`. `pnpm typecheck` and `pnpm lint` both exit 0.

**Why this stage did not fix it, and it is not RULE-03 this time.** `tests/unit/seam-parity.test.ts`
**is** on `allowed_paths` and has been since the first enumeration, so nothing mechanical refused the
edit. What refuses it is **§5.2 and RULE-05**. Those three assertions are QA's, written in the QA
stage as an explicit stand-in — their own comment says so: *"The regeneration itself needs Docker and
the Supabase CLI, which QA does not have here. What is asserted is the CI contract that performs
it."* §6.2 is the ruling that the stand-in was insufficient, and it relocates AC-9 to
`tests/db/types-drift.test.ts`, which §5.2 assigns to QA and forbids this stage to write. **Rewriting
an AC-9 assertion to match CI steps this same run authored is the derivation the isolated dispatch
exists to prevent**, and AC-9 is one of the five criteria this whole amendment was raised to cover.

**The likely disposition is deletion rather than retargeting, which is a second reason it is not
mine.** If AC-9 now lives in `tests/db/types-drift.test.ts`, the three seam-parity assertions are
superseded, not merely stale — and deleting tests another stage wrote is not a developer's call under
any reading.

**What this stage did instead.** Left them red, declared it here and in `03-impl-log.md`, and made
the CI shape §6.2 specifies verifiable by a future assertion: the new step is named `pnpm test:db`,
sets `REQUIRE_LOCAL_STACK: "1"`, and is preceded by `pnpm exec playwright install --with-deps
chromium`.

**Three shapes, and the third is the one this stage would take if it were its call:**

1. **Retarget** the two assertions at the new step. Cheapest, and it leaves AC-9 asserted twice —
   once against CI text and once against a real regeneration — which is the duplication §6.2 removed.
2. **Delete** all three and let `tests/db/types-drift.test.ts` carry AC-9 alone. Honest, and it drops
   AC-9's only assertion on a machine with no Docker until QA runs.
3. **Delete the two, keep the third, and add one that names the new step** — so `pnpm test` still
   asserts that the workflow *invokes* the lane, while the lane itself asserts the regeneration.
   AC-9's coverage row then reads: CI contract in `pnpm test`, behaviour in `pnpm test:db`.

**This does not block IN_PROGRESS** — the gate is `typecheck` and `lint`, both 0 — and it **does**
block the QA gate's *"`pnpm test` exits 0"* clause, exactly as `self-signup.test.ts` did on the first
run. Same shape, one stage earlier in the noticing.
