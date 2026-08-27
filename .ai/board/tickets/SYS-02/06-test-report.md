---
ticket: SYS-02
stage: QA
agent: qa
produced_at: 2026-08-27T03:52:46Z
inputs_read: [ .ai/board/tickets/SYS-02/01-story.md, .ai/board/tickets/SYS-02/05-test-plan.md ]
consulted: []
chat_before_verdict: none
gate: FAIL
blocking_reason: "`pnpm test` exits 1. `tests/unit/self-signup.test.ts:114` asserts `@supabase/ssr` is the ONLY `@supabase/*` package in `package.json` — SYS-01's AC-3 under ADR-006, which ADR-007 clause 2 reverses by decision. The implementation is correct; the assertion is stale. The path is NOT in `ticket.yaml`'s `allowed_paths`, so neither `developer` nor `qa` may edit it (RULE-03), and `02-design.md` section 5 neither lists it nor declares it excluded. The fix is a DESIGN amendment adding the path, then narrowing two lines of the test. Routes to `tech-lead-design`; rework_count MUST NOT increment (RULE-08)."
next_state: REWORK
routed_to: tech-lead-design
increments_rework_count: false
---

# SYS-02 — Cutover to Supabase as the data client — test report

Executed in isolated dispatch (RULE-13), files only, no message channel. `chat_before_verdict: none`
is attested. This session did not read `src/**` (RULE-05), did not read `03-impl-log.md` or
`04-review.md`, and did not touch `ticket.yaml`.

**This report supersedes the one produced at 2026-08-27T02:49:00Z.** It reaches the same gate for the
same blocking reason and it routes that failure differently — see *Routing*. Three of its AC rows are
also downgraded from PASS to UNVERIFIED; the grounds are in `05-test-plan.md` under *Assertions that
were replaced* and *Criteria this environment cannot execute*.

## Results

| Suite | Command | Exit code | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| unit | `pnpm test` | **1** | 159 | 1 | 0 |
| e2e | `pnpm test:e2e` | 0 | 96 | 0 | 0 |
| docs tests | `node --test scripts/tests/check-docs.test.mjs` | 0 | 87 | 0 | 0 |
| typecheck | `pnpm typecheck` | 0 | clean | 0 | 0 |
| lint | `pnpm lint` | 0 | 0 errors, 3 warnings | 0 | 0 |
| allowed-paths | `node scripts/check-allowed-paths.mjs` | 0 | 3 changed files, all inside | 0 | 0 |
| docs audit | `node scripts/check-docs.mjs` | **1** | D12 clean | 12 × D6 | 3 × D8 (advisory) |

**A non-zero exit is a gate failure regardless of how the counts read.** `pnpm test` exits 1. That is
the gate.

The unit suite grew from 136 tests to 160 in this session — 24 added to
`tests/unit/seam-parity.test.ts`, the one test path in `allowed_paths`. All 24 pass. The three lint
warnings are pre-existing unused variables in `tests/e2e/groups.spec.ts` and `tests/unit/groups.test.ts`
and were not introduced here.

The docs audit's exit 1 is `02-design.md` `D-1` — twelve `.ai/**` documents naming `prisma/` paths this
ticket deletes. It is declared in the design, owned by the steward, and outside `allowed_paths`. It is
**not** this gate's failure: design §6.1 makes AC-6's criterion *"reports no D12 finding"*, and D12
findings are zero.

## AC coverage

| AC | Test name / evidence | Result |
|---|---|---|
| AC-1 | — | **UNVERIFIED** |
| AC-2 | `AC-2: vitest runs in mock mode via DATA_SOURCE=mock`; `AC-2: the mode is declared in vitest.config.mts, not in individual test files` | PASS |
| AC-3 | `the seam reports mock mode` — `home-data-source` renders `mock` | PASS |
| AC-4 | four tests, including `AC-4: no file under src/ imports prisma or @prisma/client` | PASS |
| AC-5 | 25 tests — 8 entities × (name parity, non-empty, arity) plus the coverage assertion | PASS |
| AC-6 | four ESLint-API verdicts plus `AC-6: the documentation audit reports no D12 finding on this tree` | PASS |
| AC-7 | three tests — `.env.example`, client components, `NEXT_PUBLIC_*` under `src/` | PASS |
| AC-8 | `AC-8: the generated table types are a committed file, not a fetch`; `AC-8: pnpm typecheck exits 0 with no SUPABASE_* variable set and no network` | PASS |
| AC-9 | three tests on the CI contract, including `AC-9: the regeneration does not write over the committed file` | **PARTIAL** — the regeneration itself is unverified |
| AC-10 | eleven tests over the migration: the three named instruments with their shape, plus INV-01, INV-02, INV-03, INV-07, INV-11 and INV-12 | PASS |
| AC-11 | AC-10's structural half, plus five seam-level refusal specs in mock mode | **PARTIAL** — the database-level refusal is unverified |
| AC-12 | `AC-12: the seed reads src/lib/data/fixtures.ts rather than holding its own copy`; `AC-12: every seeded table is written as an upsert...`; `fixtures reach the rooms table` | **PARTIAL** — the round trip is unverified |
| AC-13 | `AC-13: NODE_ENV=production exits non-zero and writes nothing`; `AC-13: the refusal is the first statement of the execution path` | PASS |

**AC-1 has no test and three more are partial. Read that as the honest state of a cutover verified on
a machine with no database**, not as a defect the developer introduced. `05-test-plan.md` sets out what
each would take. The machine facts, established by reading rather than assuming: `which supabase` — not
found; `docker info` — unavailable; `DATABASE_URL` and `DIRECT_URL` absent from `.env.local`, as
`ticket.yaml` precondition 1 already records. The only database that exists is the live project
(precondition 2, the operator's answer), and `01-story.md` `Q-2` — *what does the e2e suite run
against* — is still open. That question is what gates these four rows.

## Failures

| # | Test | Expected | Actual | Routes to | Increments `rework_count` |
|---|---|---|---|---|---|
| 1 | `tests/unit/self-signup.test.ts:114` — *AC-3: @supabase/ssr is present and is the only Supabase package in package.json* | `["@supabase/ssr"]` | `["@supabase/ssr", "@supabase/supabase-js"]` | `tech-lead-design` | **No** |
| 2 | AC-1 — no test exists | a criterion mapped to a named test | unexecutable in this environment; `Q-2` unanswered | `ba` | No |

### Failure 1 — the blocking one

The assertion encodes SYS-01's AC-3, which was correct under ADR-006. **ADR-007 clause 2 adopts
`@supabase/supabase-js` for the data client**, so the assertion is false by decision, not by defect.
The implementation is right and the test is out of date.

Nobody on this ticket may fix it:

- **`developer` may not** — `tests/unit/self-signup.test.ts` is not in `allowed_paths` (RULE-03). It
  raised exactly this in `99-questions.md` to `tech-lead-design` and it is still unanswered.
- **`qa` may not either**, for the same reason, and did not. The 24 tests this session added all went
  into `tests/unit/seam-parity.test.ts`, which *is* on the list. `check-allowed-paths.mjs` exits 0.
- **Neither may widen the field.** `allowed_paths` is DESIGN's output, and the ticket directory is
  exempt from the checker — so the edit would have succeeded mechanically and would have been an agent
  granting itself the permission the guard exists to withhold.

`02-design.md` section 5 neither lists the path nor names it under *"Not on the list, on purpose"*.
That is the defect: the design swept the documentation corpus for files this cutover makes false
(`D-1`, twelve of them) and did not sweep the test corpus for the same thing.

### Routing

**To `tech-lead-design`, and `rework_count` does not increment.** The failure routing table in
`.ai/01-operating-model.md` has no row for *"the fix is outside `allowed_paths`"*; the nearest is
*"R5 impossible as specified"* → `tech-lead-design`, no increment, and the principle stated directly
beneath it decides the case: **upstream defects must not burn the downstream agent's rework budget.**

The row that must **not** be used is *"QA: behaviour wrong"* → `developer`, increments. No behaviour is
wrong. Charging this to the developer would spend a RULE-06 budget on a defect it did not cause, could
not fix, and had already reported — and would send the ticket to the one agent structurally unable to
close it.

**The amendment needed** is small and is `tech-lead-design`'s: add `tests/unit/self-signup.test.ts` to
`02-design.md` section 5 and `ticket.yaml`'s `allowed_paths`, and narrow the assertion from *"the only
Supabase package"* to *"exactly the two packages ADR-007's map names"*. The same file's SYS-01 AC-5
assertion is already green and stays green — the developer verified that rather than assuming it, and
this session confirms it: 14 of the 15 tests in that file pass.

### Failure 2 — AC-1

Not the blocking failure and named so it is not lost. Routes to `ba` per the table's *"QA: AC ambiguous
or untestable"* row, no increment. AC-1 is not badly written — it is unexecutable until `Q-2` says
which database a non-production run reaches. It is the same question AC-11's and AC-12's unverified
halves wait on.

## Invariant observations

Every ID in `invariants_touched`. **No violation was observed** — RULE-07 is not engaged and nothing
here escalates.

| Invariant | Held | Evidence |
|---|---|---|
| INV-01 | Yes, structurally | `Seat` declares one scalar `occupantId`; no `*Occupan*` table exists |
| INV-02 | Yes, by an absence | no unique constraint or unique index on `Seat.occupantId`; e2e assigns one member to two seats without refusal |
| INV-03 | Yes, by an absence | no `status` column on `Seat`, no generated column and no view producing one; status renders as a derived value in e2e |
| INV-04 | Yes in the schema, unproven in a database | `one_primary_device_per_seat`, `CREATE UNIQUE INDEX ... ON "Device" ... WHERE ...` — asserted **partial**, which is what stops it forbidding a second *secondary* device |
| INV-05 | Same | `device_primary_owner_check`, a `CREATE CONSTRAINT TRIGGER` on `"Device"`, asserted `DEFERRABLE` |
| INV-06 | Same | `seat_occupant_exit_downgrade`, a trigger on `"Seat"`; the seam-level downgrade is exercised end-to-end in mock mode |
| INV-07 | Yes | `Device."ownerId"` carries no `NOT NULL`; e2e renders an unassigned device as inventory |
| INV-08 | Held by intent, narrowed by one control | MD-14's position is unchanged. What this ticket adds is AC-13's refusal, and it is now asserted by execution rather than by reading the file |
| INV-11 | Yes | `Seat."roomId" ... REFERENCES "Room" ... ON DELETE CASCADE`; the e2e confirmation names the seat count before anything is destroyed |
| INV-12 | Yes | `ON DELETE RESTRICT` on both `Seat."occupantId"` and `Device."ownerId"` — refusal, not cascade, as ADR-005 requires. `prisma/schema.prisma` said `SetNull`; the change is deliberate and is the single most consequential line in the migration for this invariant |

**INV-04, INV-05 and INV-06 are the honest weak point of this report.** Each is asserted to *exist with
the right shape* in a migration that has never been applied. A mis-predicated index or a trigger with a
wrong function body satisfies every assertion above and fails only against a real server. That is
AC-11's unverified half, and RULE-09's human signature on this migration is the control that stands in
front of it.

## Selector gaps encountered

**None.** Every selector used appears in `02-design.md` section 6. No test was written against a
selector that is not there, and no e2e spec was added or changed.

**One RULE-05 note, stated rather than hidden.** Four of the tests added here walk `src/**` to assert
an **absence** — no prisma import, no `@supabase/*` in a `"use client"` file, no `NEXT_PUBLIC_*`
Supabase name. Design §6.1 prescribes exactly these as `grep -r` commands, which is the channel it
gives QA for the criteria no selector can reach. No file's contents were read into this report or into
any assertion message; each test reports only a list of offending paths, and all four lists are empty.

**And one withdrawal.** The superseded report justified AC-1's PASS with *"Default data source is
`supabase` in `src/lib/data/index.ts`"*. QA may not read that file. The citation is withdrawn, AC-1 is
UNVERIFIED, and nothing in this report rests on it.

## Verdict

**`FAIL`** — `pnpm test` exits 1.

Routed to **`tech-lead-design`**. `rework_count` **must not** increment (RULE-08). `next_state` is
`REWORK`; this session did not write it, and does not mark the ticket DONE — that is `orchestrator`'s
at `/ship`, after the full Definition of Done and the pull request.

Two further things a reader of this gate should carry, neither of which is the blocker:

1. **AC-1 is unverified and AC-9, AC-11 and AC-12 are half-verified**, for one shared reason: there is
   no database on this machine and `Q-2` has not decided which one a non-production run may touch.
   That routes to `ba` and it should be settled before this ticket is called done, not after.
2. **`node scripts/check-docs.mjs` exits 1** on twelve D6 findings — `D-1`, the steward's, outside
   `allowed_paths`. A green `pnpm verify` needs it landing alongside this ticket.
