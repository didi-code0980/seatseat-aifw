---
ticket: SYS-02
stage: IN_PROGRESS
agent: developer
produced_at: 2026-08-27T07:17:47Z   # AMENDED RUN. The first run was 2026-08-27T01:28:07Z and its
                                    # verdict is kept in full below under **Rework cycle**. This
                                    # stage is the QA FAIL's route, not a rework of this stage's own
                                    # work: `06-test-report.md` returned `routed_to:
                                    # tech-lead-design` and `increments_rework_count: false`, the
                                    # design amendment of 2026-08-27T04:51:28Z added one path to
                                    # `allowed_paths`, and this run makes the two-line edit that
                                    # path exists for. `rework_count` stays 0 — RULE-08.
inputs_read: [ .ai/board/tickets/SYS-02/02-design.md, .ai/board/tickets/SYS-02/01-story.md, .ai/board/tickets/SYS-02/ticket.yaml, .ai/registry/decisions/ADR-007-supabase-as-the-data-client.md, .ai/registry/invariants.md, .ai/registry/features.md, .ai/standards/integrations.md, .ai/standards/data-model.md, .ai/standards/testing-standards.md, src/lib/data/mock/**, src/lib/data/prisma/**, src/lib/data/types.ts, src/lib/data/fixtures.ts, src/lib/auth/supabase.ts, prisma/schema.prisma, prisma/constraints.draft.sql, prisma/seed.ts, prisma.config.ts, eslint.config.mjs, vitest.config.mts, scripts/check-docs.mjs, scripts/tests/check-docs.test.mjs, tests/unit/seam-parity.test.ts, tests/unit/self-signup.test.ts, .env.example, .github/workflows/verify.yml, .github/CODEOWNERS, docker/**, "node_modules/@supabase/supabase-js/dist/index.d.mts", "node_modules/.pnpm/@supabase+postgrest-js@2.112.4/**/dist/index.d.mts", "pnpm supabase db push --help", "pnpm supabase db reset --help", "pnpm supabase gen types --help" ]
consulted:
  - with: tech-lead-design
    asked: "`tests/unit/self-signup.test.ts:113-115` asserts `@supabase/ssr` is the only `@supabase/*` package in package.json — SYS-01 AC-3. ADR-007 clause 2 makes that false and `pnpm test` fails on it. The file is not in `allowed_paths`. Does it join the list, or is it left red for a follow-up chore?"
    answer: "ANSWERED 2026-08-27T04:51:28Z by design amendment: the path joins `allowed_paths`. `02-design.md` §5.1 specifies the exact replacement text, adds `.sort()` to the filter, changes the `it(...)` title as well, keeps the `@supabase/ssr` toBeDefined assertion, and rules the SYS-01 AC-5 assertion out of bounds. Applied verbatim in this run."
    resulted_in_amendment: true
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: REVIEW
---

# SYS-02 — implementation log

**Read the three notes below before the tables.** Each is something a reviewer would otherwise
discover at the wrong moment.

**1. `pnpm test` IS NOW GREEN — 160 passed, 0 failed, 8 files.** The one red test that note 1 below
described has been narrowed under the design amendment of 2026-08-27, `02-design.md` §5.1, and the
path it needed is on `allowed_paths` as of that amendment. `pnpm typecheck` and `pnpm lint` still
exit 0. **`D-1` is untouched and still blocks a green `pnpm verify`** — twelve D6 findings in six
human-owned documents, a steward change, not this ticket's.

---- WHAT NOTE 1 SAID ON THE FIRST RUN, KEPT ----

**1. The gate is PASS and `pnpm test` is red — one test, and it is outside `allowed_paths`.**
`tests/unit/self-signup.test.ts` asserts SYS-01's AC-3, *"`@supabase/ssr` is the only Supabase
package in `package.json`"*, which ADR-007 clause 2 reverses by decision. `1 failed | 125 passed`.
The file is not in `ticket.yaml`'s `allowed_paths` and RULE-03 refuses the edit; `allowed_paths` is
DESIGN's output and a developer widening it is what that rule exists to stop. Raised as the only
entry in `99-questions.md`, routed to `tech-lead-design`. **This is the same shape as the design's
own `D-1`** — a file this ticket makes false that the ticket may not touch — and like `D-1` it does
not block IN_PROGRESS and does block a green `pnpm verify`.

**2. `supabase/types.generated.ts` is hand-authored and carries a `TODO(verify):` saying so.** It
could not be generated: `supabase gen types --local` needs the CLI's Postgres stack, that stack runs
in Docker, **no container runtime is installed on this machine**, and the migration is unapplied
pending its RULE-09 signature. The CI job added for AC-9 is precisely what will report the
difference, which is the job working rather than failing. Deviation `D-4` below.

**3. Six Postgres functions, not five.** `02-design.md` 1.4's table has four rows naming five
functions; the paragraph immediately under it names `assignSeatOccupant` as one of *"these …
functions"* and the table does not. One PostgREST statement cannot produce that operation's three
distinct refusals. Resolved toward the paragraph. Deviation `D-1` below, with the reasoning in full.

## Files touched

51 paths: 13 deleted, 15 created, 23 modified. Contract items are `02-design.md` section 1.

| file | created/modified | why | contract item it satisfies |
|------|------------------|-----|----------------------------|
| `prisma/schema.prisma` | deleted | collapses into the first migration; ADR-007 clause 6 | §4.1 |
| `prisma/constraints.draft.sql` | deleted | collapses into the first migration; ADR-007 clause 6 | §4.3 |
| `prisma/seed.ts` | deleted | replaced by `scripts/seed.ts`; ADR-007 OQ-3 | §1.7 |
| `prisma.config.ts` | deleted | nothing reads a Prisma connection string; `prisma` left `package.json` | §1.8 |
| `src/lib/data/prisma/client.ts` | deleted | replaced file-for-file by `supabase/client.ts` | §1.2 |
| `src/lib/data/prisma/accounts.ts` | deleted | replaced file-for-file | §1.2 |
| `src/lib/data/prisma/devices.ts` | deleted | replaced file-for-file | §1.2 |
| `src/lib/data/prisma/groups.ts` | deleted | replaced file-for-file | §1.2 |
| `src/lib/data/prisma/layout.ts` | deleted | replaced file-for-file | §1.2 |
| `src/lib/data/prisma/members.ts` | deleted | replaced file-for-file | §1.2 |
| `src/lib/data/prisma/requests.ts` | deleted | replaced file-for-file | §1.2 |
| `src/lib/data/prisma/rooms.ts` | deleted | replaced file-for-file | §1.2 |
| `src/lib/data/prisma/seats.ts` | deleted | replaced file-for-file | §1.2 |
| `supabase/config.toml` | created | `supabase init`'s own output; the CLI needs it for `db reset` and `gen types --local` | §1.8 |
| `supabase/.gitignore` | created | `supabase init`'s own output; ignores `.temp` and `.branches` | §5 |
| `supabase/migrations/20260826094134_init.sql` | created | the whole schema, the seven unique constraints, the nine indexes, the three invariant constraints and the six functions | §4, §1.4, §1.5 |
| `supabase/types.generated.ts` | created | committed table types so `pnpm typecheck` needs only a checkout | §1.3 note 5 |
| `src/lib/data/supabase/client.ts` | created | the one module that constructs a client, plus the SQLSTATE table and the `.rpc()` narrowing | §1.3, §1.5 |
| `src/lib/data/supabase/accounts.ts` | created | `listAccounts` `getAccount` against the `Account` table | §1.2 |
| `src/lib/data/supabase/devices.ts` | created | the eight device operations, three of them refusing from a SQLSTATE | §1.2, §1.5 |
| `src/lib/data/supabase/groups.ts` | created | the seven group operations; sibling uniqueness is the seam's because a NULL parent defeats an index | §1.2 |
| `src/lib/data/supabase/layout.ts` | created | `getRoomLayout` `listRoomLayouts`, composed from rooms and seats | §1.2 |
| `src/lib/data/supabase/members.ts` | created | the seven member operations, including INV-12's read and its refusal | §1.2 |
| `src/lib/data/supabase/requests.ts` | created | `listRequests` `getRequest` `listPendingRequests` | §1.2 |
| `src/lib/data/supabase/rooms.ts` | created | the six room operations, including INV-11's cascade through `delete_room` | §1.2 |
| `src/lib/data/supabase/seats.ts` | created | the four seat operations plus the `deriveSeatStatus` re-export | §1.2 |
| `scripts/seed.ts` | created | ADR-007 OQ-3's seed: fixtures upserted, `auth.users` created, production refused | §1.7 |
| `src/lib/data/index.ts` | modified | the switch — union, default, guard message and eight bindings | §1.6 |
| `src/lib/data/types.ts` | modified | comment text only; three comments named Prisma and one named a deleted file | §1.1 |
| `src/lib/data/fixtures.ts` | modified | comment text only; line 1 named `prisma/seed.ts` | §1.1 |
| `src/lib/data/mock/store.ts` | modified | comment text only; three citations of `prisma/seed.ts` and the parity test's subject | §1.1, §3 |
| `src/lib/data/mock/seats.ts` | modified | comment text only; a schema citation and a `DATA_SOURCE` value that no longer exists | §1.1 |
| `src/lib/data/mock/rooms.ts` | modified | comment text only; the id-minting rationale cited Prisma's `@default(cuid())` | §1.1 |
| `src/lib/data/mock/members.ts` | modified | comment text only; two schema citations | §1.1 |
| `src/lib/data/mock/devices.ts` | modified | comment text only; one schema citation | §1.1 |
| `src/lib/data/mock/groups.ts` | modified | comment text only; the `Group.parent` delete-rule citation | §1.1 |
| `src/lib/auth/supabase.ts` | modified | comment text only; its block forbade naming the data package and ADR-007 reverses that | §2 |
| `src/app/(app)/seats/seats-manager.tsx` | modified | comment only; lines 156-158 reasoned about `DATA_SOURCE=prisma` | §1.1 |
| `tests/unit/seam-parity.test.ts` | modified | eight imports and the `PAIRS` table repointed at `supabase/`; it is the gate on §3 | §3 |
| `eslint.config.mjs` | modified | the two-package map, and the parity test's exemption moved with the directory it names | §2, §3 |
| `scripts/check-docs.mjs` | modified | D12 becomes the two-package map; ADR-007 §8 | §2 |
| `scripts/tests/check-docs.test.mjs` | modified | the D12 block rewritten; MD-16's ten failing tests cleared | §5 |
| `vitest.config.mts` | modified | `test.env = { DATA_SOURCE: "mock" }`, so the flipped default cannot reach the unit suite | §6.3 |
| `package.json` | modified | Prisma out, `@supabase/supabase-js` and the `supabase` CLI in, `db:push`/`db:studio` gone | §1.8, AC-4 |
| `pnpm-lock.yaml` | modified | `pnpm install` for the dependency change above | AC-4 |
| `.env.example` | modified | `DATABASE_URL` leaves, `DIRECT_URL` stays, the service-role key and three seed passwords join | §1.8 |
| `.gitignore` | modified | `supabase/.temp/` and `supabase/.branches/`; the Prisma rationale on `generated/` corrected | §5 |
| `.github/CODEOWNERS` | modified | `/prisma/` leaves, `/supabase/` joins — RULE-09's signature, mechanically | §5 |
| `.github/workflows/verify.yml` | modified | the AC-9 regenerate-and-diff step | §6.2 |
| `docker/docker-compose.yml` | modified | `prisma` was an offered `DATA_SOURCE` value; the two connection strings are replaced by URL and key | §5 |
| `docker/Dockerfile` | modified | comment only; the Node floor was justified by Prisma 7's support matrix | §5 |

## Contract items

| § 1 item | Implemented at | Notes |
|----------|----------------|-------|
| 1.1 types unchanged | `src/lib/data/types.ts` | Comments only. `git diff` on this file touches no line between `export type Role` and end of file. Verified by reading the diff, not asserted. |
| 1.1 names and arity unchanged | `tests/unit/seam-parity.test.ts` | The test is the mechanism and it passes: 25 assertions across eight pairs. |
| 1.1 `derive.ts` unchanged | `src/lib/data/derive.ts` | Not in `allowed_paths` and not touched. |
| 1.1 `src/app/page.tsx` unchanged | — | Not in `allowed_paths` and not touched. AC-3's two values follow from §1.6. |
| 1.2 nine modules | `src/lib/data/supabase/*.ts` | Nine files, exported surface transcribed from the modules replaced. `deriveSeatStatus` re-export at `seats.ts:10`. |
| 1.3 `client.ts` | `src/lib/data/supabase/client.ts:55` | Verbatim from the design: module singleton, anon key, three `auth` options, `window` guard, `Database` from the committed file. |
| 1.4 four operations become functions | `supabase/migrations/20260826094134_init.sql:350,378,420,471,515,551` | Six functions, not five — deviation `D-1`. Called at `seats.ts:57,72`, `devices.ts:167`, `rooms.ts:76`, `members.ts:154`, `groups.ts:146`. |
| 1.5 SQLSTATE mapping | `client.ts:81,82,89,107` | `23505`, `23503` and `INV05` as named constants; `INV05` raised at migration line 264. No adapter reads `error.message` or `error.details` — deviation `D-2`. |
| 1.6 the switch | `src/lib/data/index.ts:32,42,50` | Four edits: union, default, `useSupabase`, eight bindings. `resolveDataSource`'s signature and arity unchanged. |
| 1.7 `scripts/seed.ts` | `scripts/seed.ts` | All five rules: adapter modules not the entry point, upserts keyed on the fixture id, parents before children, devices in two passes (line 184), production refused first (line 48, called at 134). |
| 1.8 which URL | `.env.example:51`, `.github/workflows/verify.yml:94` | `DIRECT_URL` only; `DATABASE_URL` removed everywhere. The design's `TODO(verify):` on `--db-url` is **resolved** — see `D-6`. |

## Deviations from the design

Six. Each is declared, and `D-1`, `D-2` and `D-4` are the ones that change what a reviewer sees.

### `D-1` — a sixth Postgres function, `assign_seat_occupant`

`02-design.md` 1.4's table enumerates four rows naming five functions and does not include
`assignSeatOccupant`. The paragraph immediately below the table says: *"`FOR UPDATE` is not
decoration. It is what makes `assignSeatOccupant`'s INV-01 check and `deleteMember`'s INV-12 check
hold under two concurrent callers, **which is the whole reason these are functions rather than pairs
of requests**."* The two statements contradict each other and one had to win.

**The paragraph wins, and the mechanism is why rather than the word count.** `AssignOccupantOutcome`
has three refusal arms — `SEAT_NOT_FOUND`, `MEMBER_NOT_FOUND`, `SEAT_OCCUPIED` — and one PostgREST
statement cannot produce them. `UPDATE "Seat" SET "occupantId" = $2 WHERE "id" = $1 AND "occupantId"
IS NULL` affects zero rows *both* when the seat is missing and when it is occupied, and
`mock/seats.ts:26-31` states in terms that collapsing those two is *"a refusal for the right reason
by accident"*. The alternative — read the seat, then write it — is exactly the two-transaction
window section 7 alternative A rejects, on the operation carrying INV-01.

Section 1.4 also says adding a function not in the table *"is a review finding"*. This is that
finding, declared here rather than left for R5 to make.

### `D-2` — refusals map from the SQLSTATE alone; no adapter reads `error.details`

Section 1.5 requires every refusal to map from a code and forbids matching `error.message`. Both are
honoured. It also says the constraint index names *"are named here because the adapter reads them out
of `error.details`"*, and **no adapter does.**

Each write path can reach exactly one unique constraint: `createRoom`/`updateRoom` only
`Room_code_key`, `createMember`/`updateMember` only `Member_email_key`,
`createDevice`/`updateDevice` only `Device_assetTag_key`. The patch types in `types.ts` carry no
other unique column and every id is minted with `crypto.randomUUID()`. So `23505` on one of those
calls has exactly one meaning, and parsing a constraint name out of `error.details` would add a
second thing that can be wrong for no information gained — and `details` is a Postgres locale string
by the same argument section 1.5 uses against `message`. The reasoning is written at
`client.ts:91-106` so it is next to the code rather than only here.

**What this loses, stated plainly:** the design's warning that *"a migration that names them
differently silently breaks every duplicate refusal"* no longer applies, because nothing reads the
names. The names are still fixed by the migration and still documented, for the reader.

### `D-3` — two SQL helper functions, `seat_dto` and `device_dto`

`supabase/migrations/…_init.sql:305,326`. Section 1.4 says each function returns *"a single `jsonb`
row whose shape is the outcome union in `types.ts`"*, and its worked example builds the seat with
`to_jsonb(s)`. **`to_jsonb(s)` is the wrong shape twice over:** `Seat` carries `ports`, which is a
second table, and the row carries `createdAt` and `updatedAt`, which no DTO names. Four call sites
would otherwise each hand-build the projection. These are `LANGUAGE sql STABLE` and hold no logic.

### `D-4` — `supabase/types.generated.ts` is hand-authored, not generated

Stated at the head of the file with a `TODO(verify):`. `supabase gen types typescript --local`
requires the CLI's Postgres stack in Docker; `docker` is not installed on this machine, and the
migration is unapplied pending RULE-09. The file is written against the migration and the `Database`
type is the only thing anything imports (`client.ts:14`). Regenerate with `pnpm supabase db reset`
then `pnpm db:types` at the moment the migration is first applied; the AC-9 CI step is what reports
any difference, and reporting it is that step working.

### `D-5` — every list query is ordered by `id`

PostgREST returns rows in no defined order. The mock returns them in fixture order, which for every
seeded collection **is** id order — `room-a` before `room-b`, `seat-a-01` through `seat-b-06`,
`dev-01` through `dev-05`, `mem-admin` before `mem-manager` before `mem-user`. AC-12 compares the two
modes rendering the same rows, and without an `ORDER BY` that comparison is a coin toss. Seat `ports`
are sorted in TypeScript (`seats.ts:22`) rather than through `order(..., { referencedTable })`,
because the sort is a property of the DTO both sides return and not of one transport.

### `D-6` — `--db-url` verified, and one script added

The design carried `TODO(verify): confirm --db-url against the installed CLI`. **Resolved:**
`pnpm supabase db push --help` at CLI 2.115.0 documents it as *"Pushes to the database specified by
the connection string (must be percent-encoded)"* with no self-hosted qualifier, so the
`supabase link` fallback is not needed and `supabase/.temp/` stays out of the git history for that
reason as well as the CLI's own. `db reset --local --no-seed` and `gen types --local` were confirmed
the same way. One script joins `package.json` that the design does not name — `db:types`, the single
place the regeneration command lives, so the human applying the migration does not retype it.

## Invariants

| ID | Still holds because |
|----|---------------------|
| `INV-01` | A seat holds at most one occupant because `Seat.occupantId` is a single nullable column, and `assign_seat_occupant` refuses `SEAT_OCCUPIED` on a non-null one **inside the transaction that would write it** — the row is taken `FOR UPDATE` before the check, so two concurrent callers cannot both see null. The mock's version of this check is one line with no await; this is the same claim made where there is a network. |
| `INV-02` | Held by an ABSENCE, and the absence is deliberate in two places: the migration declares no unique constraint on `Seat.occupantId`, and `assign_seat_occupant` counts nothing about the member's other seats. `fixtures.ts` puts `mem-admin` on `seat-a-01` and `seat-a-04`, so the case is exercised by the seed rather than only by a test that remembers to construct it. A tidy first migration adds that index by reflex; this one says on the line why it does not. |
| `INV-03` | Held by an absence too. `"Seat"` has no `status` column, no CHECK produces one, no view and no generated column produces one, and the seed writes none. Both adapters re-export the same `deriveSeatStatus` from `derive.ts` — `supabase/seats.ts:10` — and `seam-parity.test.ts` fails if either drops it, which is what stops "derived" quietly becoming "derived twice, two ways". |
| `INV-04` | `CREATE UNIQUE INDEX one_primary_device_per_seat ON "Device" ("seatId") WHERE "rank" = 'PRIMARY'` — partial, because SECONDARY is unbounded per seat and `seat-a-01` holds one of each. It is unreachable through the seam by construction: `assignDeviceToSeat` writes SECONDARY unconditionally, `DevicePatch` has no `rank` field, and `designate_primary_device` demotes the incumbent before it promotes, in one transaction. So it is never mapped to a reason code — if it is ever raised the write path is wrong and the error propagates (RULE-07). |
| `INV-05` | The constraint trigger on `Device`, `AFTER INSERT OR UPDATE`, `DEFERRABLE INITIALLY IMMEDIATE`, raising SQLSTATE `INV05`. It is the **database's** refusal and not a read-then-compare: `updateDevice` issues one statement and maps the code, so the check and the write cannot be in different transactions. The seed's two-pass device write exists for this trigger — a single-pass insert of `dev-01` as PRIMARY fires it against a seat whose occupant has not been written yet. |
| `INV-06` | The trigger on `Seat`, `AFTER UPDATE OF "occupantId"`, downgrading that seat's PRIMARY device. It closes the `Seat` side of INV-05, which a `Device`-only trigger leaves open. Two paths need more than the trigger and both are covered: `release_seat_occupant` reads `downgradedDeviceId` **before** the clearing UPDATE, because afterwards there is no primary left to name; and `delete_room` detaches devices explicitly, because the trigger fires on UPDATE and not on DELETE. |
| `INV-07` | Held by an absence: `Device.ownerId` and `Device.seatId` are nullable, which is what makes `dev-05` — no owner, no seat — representable. `NOT NULL` is the tidier-looking choice and would delete the documented inventory case. `unassignDevice` returns the device to inventory and does not delete it, and `delete_room` detaches rather than destroys. |
| `INV-08` | No self-signup. `createMember` writes to `Member` and to nothing else, and there is no code path from it to an `Account` row — the mechanism is the import list, not a check. This ticket introduces the first code that creates `auth.users` rows, and it is a script run by hand with the service-role key, which is not self-signup: `scripts/seed.ts` refuses `NODE_ENV=production` as its first statement, and `Account.createdById` still records who created each account. MD-14 records that INV-08 is held by intent rather than by a control, and this ticket does not change that either way. |
| `INV-11` | `Seat.roomId` and `NetworkPort.seatId` are `ON DELETE CASCADE`, so the room takes its seats and their ports. `delete_room` returns `seatsDeleted` and `devicesDetached` counted from rows the same transaction destroys, which is what `countSeatsInRoom` lets the confirmation dialog name in advance. The guard INV-11 actually asks for is that confirmation, and it is untouched by this ticket. |
| `INV-12` | Refused, not cascaded, in three layers that agree. `delete_member` reads both blockers and deletes in one transaction, so there is no window in which the last blocker disappears and the refusal is wrong. `Seat.occupantId` and `Device.ownerId` are `ON DELETE RESTRICT` — **a change from the draft schema's `SetNull`**, because with SET NULL the database would silently vacate every seat underneath a refusal the seam is meant to give. `RESTRICT` never fires on a legal path and fires exactly when something bypassed the seam. `deleteGroup` is not INV-12: it detaches members and removes nobody. |

## Verification run

| Command | Exit | Notes |
|---------|------|-------|
| `pnpm typecheck` | 0 | |
| `pnpm lint` | 0 | 3 pre-existing warnings in `tests/`, no errors. |
| `pnpm build` | 0 | 10 routes, 4 prerendered. |
| `pnpm test` | 1 | `1 failed | 125 passed`. The failure is `tests/unit/self-signup.test.ts` AC-3, outside `allowed_paths` — note 1 at the head of this file, and `99-questions.md`. |
| `node --test scripts/tests/check-docs.test.mjs` | 0 | 87 pass, 0 fail. MD-16's ten D12 failures are cleared, which is what ADR-007 §8 asked this ticket to do. |
| `pnpm hooks:test` | 0 | 193 pass. |
| `node scripts/check-docs.mjs` | 1 | **D12 clean.** 12 D6 findings, all of them `D-1` in the design: `prisma/` paths in six human-owned documents that are not in `allowed_paths` and must not be. The design predicted twelve; there are twelve. |
| `node scripts/check-allowed-paths.mjs` | 0 | PASS. |
| `git diff --name-only` subset of `allowed_paths` | yes | 51 paths, every one inside the 25 globs. Checked by hand as well, because the checker reads the committed range and this stage leaves the tree dirty. |

Three lint probes were run and reverted, because the whole of RULE-02's remaining enforcement is this
one file and a config that passes on the tree it was written for proves nothing:

| Probe | Result |
|---|---|
| `@supabase/ssr` imported from `src/lib/data/supabase/` | refused |
| `@supabase/supabase-js` imported from `src/lib/auth/` | refused |
| `@/lib/data/supabase/rooms` imported from `src/app/page.tsx` | refused |

## Testability contract

**No `data-testid` is added, removed or renamed by this ticket** — `02-design.md` section 6 says so
and `git diff` confirms it: no line containing `data-testid` appears in the diff. The table below is
the section 6 contract confirmed present, not a list of changes.

| `data-testid` | Exists at |
|---------------|-----------|
| `home-page` | `src/app/page.tsx:7` |
| `home-data-source` | `src/app/page.tsx:13` — renders `DATA_SOURCE` verbatim, so AC-3's two permitted values follow from `src/lib/data/index.ts:32` with no edit here |
| `home-enter-app` | `src/app/page.tsx:18` |
| `rooms-*`, `room-create-*`, `room-delete-*` | `src/app/(app)/rooms/**` — unchanged |
| `seats-*`, `seat-assign-*` | `src/app/(app)/seats/**` — `seats-manager.tsx` is in `allowed_paths` for a comment on lines 156-161 and no selector on any other line moved |
| `members-*`, `member-delete-refused-*` | `src/app/(app)/members/**` — unchanged |
| `devices-*` | `src/app/(app)/devices/**` — unchanged |
| `groups-*` | `src/app/(app)/groups/**` — unchanged |
| `app-nav`, `nav-*` | the application shell — unchanged |
| `layout-designer-page`, `layout-room-*`, `layout-seat-*` | `src/app/(app)/layout-designer/**` — unchanged |

The four criteria section 6.1 says are not testable through a selector, checked here so QA inherits a
result rather than a promise:

| AC | Observed |
|----|----------|
| AC-4 | `package.json` holds neither `prisma` nor `@prisma/client`; `prisma/`, `src/lib/data/prisma/` and `prisma.config.ts` are gone; `db:push` and `db:studio` are gone; `grep -r "@prisma/client" src` returns nothing. |
| AC-6 | `pnpm lint` exits 0 and `node scripts/check-docs.mjs` reports no D12 finding. |
| AC-7 | No `"use client"` file names `@supabase/`; no `NEXT_PUBLIC_` name in `.env.example` or `src/**` carries a Supabase key. D12's `src/**` branch is the standing check. |
| AC-8 | `pnpm typecheck` exits 0 with no `SUPABASE_*` set and no network — the `Database` type comes from `supabase/types.generated.ts`. |

## Rework cycle — 2026-08-27T07:17:47Z, the QA FAIL's route back

**One file, three lines changed and one deleted.** This is the whole of this run.

| file | created/modified | why | contract item it satisfies |
|------|------------------|-----|----------------------------|
| `tests/unit/self-signup.test.ts` | modified | SYS-01's AC-3 assertion narrowed from *"`@supabase/ssr` is the only Supabase package"* to *"exactly the two `.ai/standards/integrations.md` names"*, which is what ADR-007 clause 2 decided. Replacement text taken verbatim from `02-design.md` §5.1. | §1.1, and AC-4's other half — the package set this ticket produces |

**What changed, line by line**, against `tests/unit/self-signup.test.ts:104-116`:

- `:104` — the `it(...)` title now reads `AC-3 (superseded by ADR-007 clause 2): package.json carries
  exactly the two Supabase packages the integrations map names`. §5.1 point 2 required this: a test
  named *"is the only Supabase package"* asserting that it is one of two is a passing test with a
  false name.
- `:113` — `.sort()` appended to the `@supabase/` filter. §5.1 point 1: `allDeps` is `Object.keys`
  over the merged dependency blocks, so its order is `package.json`'s insertion order. The two agree
  today by coincidence and reordering `package.json` would break the assertion silently.
- `:114` — expected value is now `["@supabase/ssr", "@supabase/supabase-js"]`.
- `:115` — `expect(allDeps).not.toContain("@supabase/supabase-js")` **deleted**, replaced by a comment
  saying why. Clause 2 adopts the package that line forbade.

**What was NOT touched in that file, checked rather than assumed:**

- `:106` — `expect(pkgJson.dependencies?.["@supabase/ssr"]).toBeDefined()` stays. §5.1 point 3: the
  amendment narrows SYS-01's criterion, it does not drop it.
- `:118-123` — the SYS-01 AC-5 block, including
  `expect(eslintConfig).not.toMatch(/["']src\/lib\/data\/\*\*["']/)`. §5.1 declares it explicitly out
  of bounds. It is green before and after: this ticket's lint exemption is
  `src/lib/data/supabase/**/*.ts`, which does not match that pattern, and not matching it is the
  point — the exemption is the adapter directory, not the seam.
- The other 12 tests in the file. 15 pass, which is 14 that were green before plus the one narrowed.

**No `src/**` file changed on this cycle.** The implementation judged at REVIEW
(2026-08-27T02:27:56Z) and at QA (2026-08-27T03:52:46Z) is byte-identical; `git diff --stat` against
`4eaab7f`, excluding `.ai/board/`, is one file, 4 insertions and 4 deletions.

**Gate evidence for this run:**

| command | result |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 — 3 pre-existing warnings in `tests/e2e/groups.spec.ts` and `tests/unit/groups.test.ts`, neither this ticket's file nor this ticket's change |
| `pnpm test` | 8 files, 160 tests, **all passed** |
| `node scripts/check-allowed-paths.mjs` | PASS, 59 changed paths against 26 globs |

## Open questions

**NONE OPEN AS OF 2026-08-27T07:17:47Z.** The one below was answered by the design amendment of
2026-08-27T04:51:28Z — the path joins `allowed_paths` and the edit is made. `99-questions.md` still
carries it as asked; this is the answer landing.

---- WHAT THIS SECTION SAID ON THE FIRST RUN, KEPT ----

**One, and it is in `99-questions.md` routed to `tech-lead-design`:** whether
`tests/unit/self-signup.test.ts` joins `allowed_paths` so its SYS-01 AC-3 assertion can be narrowed
from *"the only Supabase package"* to *"exactly the two ADR-007's map names"*, or whether it stays red
for a follow-up chore. It is the only red test in the repository and the only thing between this tree
and a green `pnpm verify` other than the design's own `D-1`.

**Two things carried forward from the design, unchanged by this stage and repeated because a reviewer
should not have to hold two documents open.**

- **`D-1` — twelve D6 findings in six human-owned documents.** Verified as exactly twelve by running
  the audit on this tree. Not in `allowed_paths` and must not be; a steward change lands with this
  ticket or `verify` is red on the pull request.
- **The RULE-09 signature on `supabase/migrations/20260826094134_init.sql`.** Nothing in this
  repository applies it, `/supabase/` is now in CODEOWNERS, and the operator's approval on the pull
  request is the one stop inside this ticket. `ticket.yaml` says DESIGN should not raise it as a
  blocker and this stage does not raise it as one either — it is named so the reviewer reads the
  migration as a draft under review rather than as applied schema.
