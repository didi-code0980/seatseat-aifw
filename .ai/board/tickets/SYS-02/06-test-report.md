---
ticket: SYS-02
stage: QA
agent: qa
produced_at: 2026-08-27T07:33:53Z
inputs_read: [ .ai/board/tickets/SYS-02/01-story.md, .ai/board/tickets/SYS-02/05-test-plan.md ]
consulted: []
chat_before_verdict: none
gate: FAIL
blocking_reason: "AC-1 maps to no named test. Both suites now exit 0 — `pnpm test` 160/160, `pnpm test:e2e` 96/96 — so the 03:52:46Z blocker is cleared, and the gate's other clause is met. What is not met is `every AC-n maps to at least one named test`, which the Definition of Done repeats verbatim. AC-1 requires the data to come from Postgres and a written row to survive a process restart; this machine has no Supabase CLI, no Docker and no `DATABASE_URL`, and the only project that exists is the live one, whose migration is unapproved (RULE-09) and unapplied. `01-story.md` Q-2 — which database a non-production run may reach — is still open and is what gates it. Routes to `ba`; rework_count MUST NOT increment (RULE-08)."
next_state: REWORK
routed_to: ba
increments_rework_count: false
---

# SYS-02 — Cutover to Supabase as the data client — test report

Third QA run. Isolated dispatch (RULE-13), files only, no message channel; `chat_before_verdict: none`
is attested. This session did not read `src/**` (RULE-05), did not read `03-impl-log.md` or
`04-review.md`, and did not touch `ticket.yaml`.

**The 03:52:46Z blocker is cleared.** `tests/unit/self-signup.test.ts` joined `allowed_paths` in the
`4eaab7f` design amendment, and the edit `02-design.md` section 5.1 specifies was made in full: the
`it()` title corrected, `.sort()` added, the assertion narrowed to the two packages ADR-007's map
names, `not.toContain` deleted. The suite is green.

**This report supersedes the one produced at 2026-08-27T03:52:46Z.** Its AC rows are otherwise
unchanged, because section 6 of `02-design.md` is byte-identical and the amendment touched section 5
only.

## Results

| Suite | Command | Exit code | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| unit | `pnpm test` | **0** | 160 | 0 | 0 |
| e2e | `pnpm test:e2e` | **0** | 96 | 0 | 0 |
| docs tests | `node --test scripts/tests/check-docs.test.mjs` | 0 | 87 | 0 | 0 |
| typecheck | `pnpm typecheck` | 0 | clean | 0 | 0 |
| lint | `pnpm lint` | 0 | 0 errors, 3 warnings | 0 | 0 |
| allowed-paths | `node scripts/check-allowed-paths.mjs` | 0 | branch-wide, clean | 0 | 0 |
| docs audit | `node scripts/check-docs.mjs` | **1** | D12 clean (0 findings) | 12 × D6 | 3 × D8 (advisory) |

Both gate commands exit 0. The three lint warnings are pre-existing unused variables in
`tests/e2e/groups.spec.ts` and `tests/unit/groups.test.ts`. The docs audit's exit 1 is `02-design.md`
`D-1` — twelve `.ai/**` documents naming `prisma/` paths this ticket deletes, owned by the steward and
outside `allowed_paths`. It is not this gate's failure: design §6.1 makes AC-6's criterion *"reports no
D12 finding"*, and D12 findings are zero.

## AC coverage

| AC | Test name / evidence | Result |
|---|---|---|
| AC-1 | — | **NO TEST** |
| AC-2 | `AC-2: vitest runs in mock mode via DATA_SOURCE=mock`; `AC-2: the mode is declared in vitest.config.mts, not in individual test files` | PASS |
| AC-3 | `the seam reports mock mode` — `home-data-source` renders `mock` | PASS |
| AC-4 | four tests, including `AC-4: no file under src/ imports prisma or @prisma/client` | PASS |
| AC-5 | 25 tests — 8 entities × (name parity, non-empty, arity) plus the coverage assertion | PASS |
| AC-6 | four ESLint-API verdicts plus `AC-6: the documentation audit reports no D12 finding on this tree` | PASS |
| AC-7 | three tests — `.env.example`, client components, `NEXT_PUBLIC_*` under `src/` | PASS |
| AC-8 | `AC-8: the generated table types are a committed file, not a fetch`; `AC-8: pnpm typecheck exits 0 with no SUPABASE_* variable set and no network` | PASS |
| AC-9 | three tests on the CI contract, including `AC-9: the regeneration does not write over the committed file` | **PARTIAL** — the regeneration itself is unverified |
| AC-10 | eleven tests over the migration: the three named instruments with their shape, plus INV-01, INV-02, INV-03, INV-07, INV-11, INV-12 | PASS |
| AC-11 | AC-10's structural half, plus five seam-level refusal specs in mock mode | **PARTIAL** — the database-level refusal is unverified |
| AC-12 | `AC-12: the seed reads src/lib/data/fixtures.ts rather than holding its own copy`; `AC-12: every seeded table is written as an upsert...`; `fixtures reach the rooms table` | **PARTIAL** — the round trip is unverified |
| AC-13 | `AC-13: NODE_ENV=production exits non-zero and writes nothing`; `AC-13: the refusal is the first statement of the execution path` | PASS |

## Failures

| # | Test | Expected | Actual | Routes to | Increments `rework_count` |
|---|---|---|---|---|---|
| 1 | AC-1 — no test exists | a criterion mapped to a named test | unexecutable on this machine; `Q-2` unanswered | `ba` | **No** |

### The failure, and why it is not pedantry

AC-1 is the criterion that says the cutover *worked*:

> Then the data shown comes from the Postgres database, not from in-memory fixtures
> And a row created through the application is still present after the process is restarted

**Nothing in this repository has ever executed against a real database.** The migration is drafted and
not approved — RULE-09 reserves that signature to a human at the pull request — and it has not been
applied anywhere. So AC-10's constraints are asserted as *text in a file*; AC-11's database refusals
are unproven; AC-12's seed has never run. Those three are recorded PARTIAL for the same single reason
AC-1 is unmapped, and it is the ticket's central risk rather than a rounding error at its edge.

Re-read this session rather than recalled:

- `which supabase` → absent. `docker info` → unavailable.
- `.env.local` carries `DATA_SOURCE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. `DATABASE_URL` and `DIRECT_URL` are absent, as `ticket.yaml` precondition 1 records.
- The one Supabase project that exists is the live one (precondition 2, the operator's answer). Its schema is empty, because the migration is unapproved.

**QA did not point anything at that project, and would not without being told to.** It is the
production database, the migration has no signature, and seeding or migrating it is item 10 of the
story's own Out of scope.

**What was deliberately not done to make this row go green.** AC-1's first clause alone — *"runs
against the real database **by default**"* — could be given a named test by starting the application
with `DATA_SOURCE` unset and reading `home-data-source`. That test would pass, would carry AC-1's ID,
and would leave both substantive clauses unverified while the coverage map read complete. That is the
defect class this suite spent the previous run removing from AC-6, AC-10 and AC-13, and reintroducing
it here to clear a gate would be worse than the gate failing.

### Routing

**To `ba`, and `rework_count` does not increment.** The failure routing table's row is *"R6, QA: AC
ambiguous or untestable"* → `ba`, No. The row that must **not** be used is *"QA: behaviour wrong"* →
`developer`: no behaviour is wrong, the developer's second run is clean, and the missing coverage is
an unanswered question from SPEC.

**The question is already written.** `01-story.md` `Q-2` — *with one Supabase project, what does
`pnpm dev` and the e2e suite run against?* — is open, and `99-questions.md` carries QA's entry to `ba`
from the 03:52:46Z run naming these same four criteria. Nothing new needs raising; it needs answering.
Three answers are all legitimate: a second project, a local CLI stack, or an explicit decision that
these four are verified in CI or by hand after the migration is signed. **The third is a decision the
operator can take today**, and it is the only one that does not need new infrastructure.

**This is also a Definition of Done item, not only a QA gate.** The DoD in
`.ai/01-operating-model.md` lists *"every AC maps to a named test"*. Passing this gate with AC-1
unmapped would move the problem to `/ship`, in the other folder, where the same check runs against the
same fact.

## Invariant observations

Every ID in `invariants_touched`. **No violation was observed** — RULE-07 is not engaged and nothing
here escalates.

| Invariant | Held | Evidence |
|---|---|---|
| INV-01 | Yes, structurally | `Seat` declares one scalar `occupantId`; no `*Occupan*` table exists |
| INV-02 | Yes, by an absence | no unique constraint or index on `Seat.occupantId`; e2e assigns one member to two seats without refusal |
| INV-03 | Yes, by an absence | no `status` column on `Seat`, no generated column and no view producing one; status renders derived in e2e |
| INV-04 | Yes in the schema, unproven in a database | `one_primary_device_per_seat`, asserted **partial** — which is what stops it forbidding a second *secondary* device |
| INV-05 | Same | `device_primary_owner_check`, a constraint trigger on `"Device"`, asserted `DEFERRABLE` |
| INV-06 | Same | `seat_occupant_exit_downgrade`, a trigger on `"Seat"`; the seam-level downgrade is exercised end-to-end in mock mode |
| INV-07 | Yes | `Device."ownerId"` carries no `NOT NULL`; e2e renders an unassigned device as inventory |
| INV-08 | Held by intent, narrowed by one control | MD-14's position is unchanged. AC-13's refusal is asserted by execution, not by reading the file |
| INV-11 | Yes | `Seat."roomId" ... ON DELETE CASCADE`; the e2e confirmation names the seat count before anything is destroyed |
| INV-12 | Yes | `ON DELETE RESTRICT` on both `Seat."occupantId"` and `Device."ownerId"` — refusal, not cascade, as ADR-005 requires |

**INV-04, INV-05 and INV-06 remain the honest weak point.** Each is asserted to exist with the right
shape in a migration that has never been applied. A mis-predicated index or a trigger with a wrong
function body satisfies every assertion above and fails only against a real server. RULE-09's human
signature is the control standing in front of that, and it has not been given.

## Selector gaps encountered

**None.** Every selector used appears in `02-design.md` section 6, which the `4eaab7f` amendment did
not touch. No e2e spec was added or changed in this run, and no test was written against a selector
that is not there.

Four unit tests walk `src/**` to assert an **absence**, exactly as design §6.1 prescribes those
criteria as `grep -r` commands. No file's contents reach this report or any assertion message; each
reports only a list of offending paths, and all four lists are empty.

## Verdict

**`FAIL`** — AC-1 maps to no named test.

Routed to **`ba`**. `rework_count` **must not** increment (RULE-08). `next_state` is `REWORK`; this
session did not write it and does not mark the ticket DONE — that is `orchestrator`'s at `/ship`.

**Everything else in this ticket is finished.** Both gate suites exit 0, typecheck and lint are clean,
the branch diff is a subset of `allowed_paths`, no invariant is violated, and twelve of thirteen
criteria are covered. What remains is one question that predates the implementation and cannot be
answered inside it: **which database a non-production run of this system is allowed to reach.**

One further item a reader of this gate should carry, which is not the blocker: `node
scripts/check-docs.mjs` exits 1 on twelve D6 findings — `D-1`, the steward's, outside `allowed_paths`.
A green `pnpm verify` needs it landing alongside this ticket.
