---
ticket: SYS-02
stage: QA
agent: qa
produced_at: 2026-08-27T03:52:46Z
inputs_read: [ .ai/board/tickets/SYS-02/01-story.md, .ai/board/tickets/SYS-02/02-design.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# SYS-02 — Cutover to Supabase as the data client — test plan

Written from `01-story.md` and **section 6 of `02-design.md` only** (RULE-05). `src/**` was not read.
Isolated dispatch (RULE-13), no message channel; `chat_before_verdict: none` is an attestation.

**This plan supersedes the one produced at 2026-08-27T02:48:00Z.** RULE-13 discards the QA session
after each verdict, so this run started cold and re-derived the coverage rather than inheriting it.
Three things changed and each is a defect in the earlier plan, not a change in the ticket:

1. **The earlier plan claimed AC-1 and AC-11 as covered by e2e specs.** Both suites run under
   `DATA_SOURCE=mock` (`playwright.config.ts:36`, which this ticket does not change). A mock-mode
   e2e run cannot show that *"the data shown comes from the Postgres database"* (AC-1) or that
   *"the database rejects the write, not only the application"* (AC-11). Those are now recorded as
   **UNVERIFIED**, with what is missing named.
2. **The earlier plan's AC-1 evidence cited `src/lib/data/index.ts`.** QA may not read `src/**`
   (RULE-05). That citation is withdrawn; nothing in this plan rests on it.
3. **Several assertions were string matches that a reworded comment could flip in either direction.**
   The clearest was AC-10's INV-03 check — see *Assertions that were replaced* below.

## Coverage map

Every AC from `01-story.md` maps to at least one named test. Test names carry the AC ID. Unit tests
are in `tests/unit/seam-parity.test.ts`; e2e tests are the existing specs named in each row.

| AC | Test name | Level | Selectors used |
|---|---|---|---|
| AC-1 | **no test — UNVERIFIED**, see *Criteria this environment cannot execute* | — | — |
| AC-2 | `AC-2: vitest runs in mock mode via DATA_SOURCE=mock`<br>`AC-2: the mode is declared in vitest.config.mts, not in individual test files` | unit | none (`vitest.config.mts`) |
| AC-3 | `the seam reports mock mode` (`tests/e2e/smoke.spec.ts:33`) | e2e | `home-page`, `home-data-source` |
| AC-4 | `AC-4: package.json has no prisma or @prisma/client in any dependency field`<br>`AC-4: package.json scripts have no db:push or db:studio`<br>`AC-4: prisma directory, prisma.config.ts, and prisma data adapter are absent`<br>`AC-4: no file under src/ imports prisma or @prisma/client` | unit | none (`package.json`, filesystem) |
| AC-5 | `AC-5: covers every entity in the seam`<br>`AC-5: <entity> exports the same function names on both sides`<br>`AC-5: <entity> exports at least one function`<br>`AC-5: <entity> matches arity for every export` — 8 entities × 3 | unit | none (module surface) |
| AC-6 | `AC-6: the data package is an error outside src/lib/data/supabase/`<br>`AC-6: the data package is permitted inside src/lib/data/supabase/`<br>`AC-6: the auth package is permitted inside src/lib/auth/`<br>`AC-6: the auth package is an error inside the data adapter — the exemptions do not overlap`<br>`AC-6: the documentation audit reports no D12 finding on this tree` | unit (ESLint API + `check-docs.mjs`) | none |
| AC-7 | `AC-7: .env.example does not expose Supabase keys with NEXT_PUBLIC_ prefix`<br>`AC-7: no client component imports any @supabase/ package`<br>`AC-7: no NEXT_PUBLIC_ name under src/ carries a Supabase key` | unit | none |
| AC-8 | `AC-8: the generated table types are a committed file, not a fetch`<br>`AC-8: pnpm typecheck exits 0 with no SUPABASE_* variable set and no network` | unit (spawns `tsc`) | none |
| AC-9 | `AC-9: the workflow regenerates types from a LOCAL reset of supabase/migrations/`<br>`AC-9: the regeneration does not write over the committed file`<br>`AC-9: a difference is compared and fails the run` — **CI contract only; the regeneration itself is UNVERIFIED** | unit | none (`.github/workflows/verify.yml`) |
| AC-10 | `AC-10: the migration exists`<br>`AC-10: INV-04 is held by a PARTIAL unique index on the device table`<br>`AC-10: INV-05 is held by a constraint trigger on the device table`<br>`AC-10: INV-06 is held by a downgrade trigger on the seat table`<br>`AC-10: the seat table declares no status column — INV-03`<br>`AC-10: no view or generated column produces a seat status — INV-03`<br>plus the five absence probes listed under *Invariant probes* | unit (SQL inspection) | none |
| AC-11 | **structural half only** — the AC-10 rows above.<br>Seam-level refusals, mock mode: `AC-8: designation is refused when the owner is not the seat's occupant — INV-05`, `AC-7: designating a primary demotes the incumbent — INV-04, INV-05`, `AC-6: releasing an occupant on /seats downgrades primary device to SECONDARY on /devices — INV-06`.<br>**The database-level refusal is UNVERIFIED.** | unit + e2e | `devices-row-AST-0001-rank`, `devices-row-AST-0001-primary`, `devices-action-error`, `seats-row-SEAT-A-01-occupant`, `seats-row-SEAT-A-01-release` |
| AC-12 | `AC-12: the seed reads src/lib/data/fixtures.ts rather than holding its own copy`<br>`AC-12: every seeded table is written as an upsert, which is what makes a second run a no-op`<br>Fixture rendering in mock mode: `fixtures reach the rooms table`.<br>**The seed-then-compare round trip is UNVERIFIED.** | unit + e2e | `rooms-table`, `rooms-row-ROOM-A-code` |
| AC-13 | `AC-13: NODE_ENV=production exits non-zero and writes nothing`<br>`AC-13: the refusal is the first statement of the execution path` | unit (spawns the seed) | none (`scripts/seed.ts`) |

**AC-1 has no row and that is a gate failure by the letter of the template.** It is recorded as such
rather than filled with a proxy. Under the failure routing table it is *"QA: AC ambiguous or
untestable"* → `ba`, no rework increment. It is not the ticket's blocking failure — see the report.

## Criteria this environment cannot execute

Established by reading the machine, not by assumption:

- `which supabase` — not found.
- `docker info` — not available.
- `.env.local` carries `DATA_SOURCE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. `DATABASE_URL` and `DIRECT_URL` are absent, exactly as `ticket.yaml` precondition 1 records.
- The one Supabase project that does exist is the **live** one (`ticket.yaml` precondition 2, the operator's answer). Pointing a test suite at it would make every future ticket's test report a measurement against production data — which is the consequence `01-story.md` `Q-2` was opened to settle and which is still open.

| AC | What is verified | What is not, and what it would take |
|---|---|---|
| AC-1 | nothing | A reachable Postgres, a seeded database, and a process restart between two reads. Needs `Q-2` answered first: against *which* database. |
| AC-9 | the CI job's contract — local reset, `--local` generation, a `diff`, and no redirect over the committed file | The regeneration itself. Needs Docker and the Supabase CLI. It runs on `ubuntu-latest` in CI, which has both. |
| AC-11 | the constraints exist in the migration with the shape ADR-007 OQ-5 names; the seam refuses the same writes in mock mode | That **the database** rejects them. A partial unique index that is present but mis-predicated, or a constraint trigger whose function body is wrong, passes every assertion here and fails only against a real server. |
| AC-12 | the seed sources the fixtures and writes only upserts | That a seeded database renders what `DATA_SOURCE=mock` renders, and that a second run is a no-op. |

**None of these is proxied.** A weaker assertion carrying the AC's ID would make the coverage map read
complete, and the four rows above are the reason it does not.

## Refusal cases

The tests that assert something is *not* possible. A suite with no refusal tests passes when the check
is deleted.

| Refusal | Test | Level |
|---|---|---|
| The data package imported outside its directory | `AC-6: the data package is an error outside src/lib/data/supabase/` | unit, ESLint API |
| The **auth** package imported inside the **data** directory — the exemptions must not overlap | `AC-6: the auth package is an error inside the data adapter — the exemptions do not overlap` | unit, ESLint API |
| The seed run against production | `AC-13: NODE_ENV=production exits non-zero and writes nothing` | unit, spawned process |
| A second primary device on one seat | `AC-7: designating a primary demotes the incumbent — INV-04, INV-05` | e2e, mock |
| A primary device whose owner is not the occupant | `AC-8: designation is refused when the owner is not the seat's occupant — INV-05` | e2e, mock |
| Deleting a member who occupies a seat | `AC-10: deleting a member who occupies a seat is refused, and the refusal names the seat (INV-12)` | e2e, mock |
| Deleting a member who owns a device | `AC-11: deleting a member who owns a device is refused, and the refusal states how many (INV-12)` | e2e, mock |
| Destroying a room's seats without confirmation | `AC-6: the confirmation names the seat count, and nothing is destroyed until it is confirmed — INV-11` | e2e, mock |

The AC-13 refusal is run with every `SUPABASE_*` variable stripped from the child environment. That is
deliberate: this ticket runs against one live project, so a guard that failed to fire must not have
been able to reach a database either. The test asserts both the exit code and that the failure was the
guard's message and *not* `SUPABASE_URL is not set`.

## Invariant probes

Every ID in `invariants_touched`. `ticket.yaml` lists ten.

| Invariant | Probe test | If absent, why |
|---|---|---|
| INV-01 | `AC-10: INV-01 — occupancy is a single scalar column, not a collection` — plus the assertion that no `*Occupan*` table exists | — |
| INV-02 | `AC-10: INV-02 — Seat.occupantId carries no unique constraint`; e2e `AC-4: one member is assigned to multiple seats without refusal — INV-02` | — |
| INV-03 | `AC-10: the seat table declares no status column — INV-03`; `AC-10: no view or generated column produces a seat status — INV-03`; e2e `seat status is derived and rendered — INV-03` and `AC-10: seat status is derived and never set directly across transitions — INV-03` | — |
| INV-04 | `AC-10: INV-04 is held by a PARTIAL unique index on the device table`; e2e `AC-7: designating a primary demotes the incumbent` | The **database** refusal is unverified — see AC-11 above |
| INV-05 | `AC-10: INV-05 is held by a constraint trigger on the device table`; e2e `AC-8`, `AC-10`, `AC-11` of `devices.spec.ts` | Same |
| INV-06 | `AC-10: INV-06 is held by a downgrade trigger on the seat table`; e2e `AC-6: releasing an occupant on /seats downgrades primary device to SECONDARY on /devices — INV-06` | Same |
| INV-07 | `AC-10: INV-07 — the device owner reference is nullable`; e2e `an unassigned device is shown as inventory — INV-07` | — |
| INV-08 | `AC-13: NODE_ENV=production exits non-zero and writes nothing` — this ticket's one added guard, and the only new code that mints `auth.users` rows; e2e `login offers no self-registration — INV-08`, `AC-9`/`AC-10`/`AC-11` of `self-signup.spec.ts`, and `AC-4: the create form offers no way to sign in, and the member it creates has no account (INV-08)` | MD-14 records that INV-08 is held by intent rather than by a control. Nothing here changes that; the seed guard narrows it by one path |
| INV-11 | `AC-10: INV-11 — deleting a room cascades to its seats`; e2e `AC-6: the confirmation names the seat count, and nothing is destroyed until it is confirmed — INV-11` | — |
| INV-12 | `AC-10: INV-12 — member references refuse rather than cascade` — asserts `ON DELETE RESTRICT` on both `Seat.occupantId` and `Device.ownerId`; e2e `AC-10` and `AC-11` of `members.spec.ts` | — |

**INV-10 has no probe and is not in `invariants_touched`.** `.ai/registry/features.md:152` and
`ticket.yaml` both instruct that it stays at the seam as debt. The migration says so in a comment at
the `Seat` grid columns. This plan does not test for its absence, because an absence asserted as
correct becomes the thing that refuses the constraint when someone finally adds it.

## Assertions that were replaced

Three from the superseded plan were structurally unsound. Recorded because a test that passes for the
wrong reason is worse than a missing one — it reports coverage it does not have.

1. **AC-10 / INV-03.** The assertion was
   `expect(sql).not.toMatch(/CREATE TABLE\s+"Seat"\s*\([^;]*\bstatus\b/i)`. `[^;]*` stops at the first
   semicolon, and this migration's `Seat` block contains one **inside an English comment** — *"ADR-005
   requires a member deletion to be REFUSED, not cascaded;"*. The window therefore closed 13 lines
   before the `status` text it was written to find. It passed for a reason that has nothing to do with
   the schema, and rewording that comment would flip it in either direction. Replaced by a
   paren-balanced extraction of the `CREATE TABLE` body with SQL comments stripped, then a column-name
   check.
2. **AC-6.** The assertion was three `toContain` calls on `eslint.config.mjs`. A rule can be present
   and mis-scoped, present and downgraded to a warning, or present and shadowed by a later config
   object. Replaced by four cases run through the project's real flat config via the ESLint API,
   including the cross-exemption AC-6 states in its own words.
3. **AC-13.** The assertion was two `toContain` calls on the text of `scripts/seed.ts`. Replaced by
   spawning the script.

## Fixtures

From `src/lib/data/fixtures.ts`, via the business keys design section 6 publishes: `ROOM-A`, `ROOM-B`,
`SEAT-A-01`, `ada@example.internal`, `AST-0001`, `Engineering`. No entity is invented inline. The unit
tests added by this plan use no fixture entities at all — they read `package.json`,
`eslint.config.mjs`, `.env.example`, `vitest.config.mts`, `.github/workflows/verify.yml`,
`supabase/migrations/20260826094134_init.sql` and `scripts/seed.ts`, none of which is under `src/**`.

## Out of scope for this plan

- **Performance and accessibility** beyond the standards baseline. Unchanged by a data-client swap.
- **Anything behind the unapproved migration.** RULE-09 puts a human signature on
  `supabase/migrations/20260826094134_init.sql` and it has not been given. Every AC-10 assertion reads
  the file as *drafted*; none asserts it has been applied anywhere.
- **The `.ai/**` documentation corpus.** `node scripts/check-docs.mjs` exits 1 with twelve D6 findings
  on this branch. That is `02-design.md` `D-1`, declared in advance, owned by the steward, and outside
  `allowed_paths`. This plan reads D12 only, which is what design §6.1 makes AC-6's criterion.
- **`tests/unit/self-signup.test.ts`.** It is not in `allowed_paths` and QA did not edit it. See
  `99-questions.md`.

## Selector gaps

**None.** Every selector this plan uses is listed in `02-design.md` section 6. No test was written
against a selector that is not there, and no e2e test was added — the criteria this ticket introduces
are all observable outside the browser, which is what §6.1 exists to say.

The one gap encountered is not a selector gap and is raised in `99-questions.md` to
`tech-lead-design`: `allowed_paths` does not cover the single test file this ticket makes false.
