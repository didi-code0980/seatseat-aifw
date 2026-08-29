---
ticket: SYS-02
stage: QA
agent: qa
produced_at: 2026-08-29T03:25:29Z
inputs_read: [ .ai/board/tickets/SYS-02/01-story.md, .ai/board/tickets/SYS-02/02-design.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# Test Plan — SYS-02 Cutover to Supabase as the data client

Written from `01-story.md` and section 6 of `02-design.md` only (RULE-05). No `src/**` was read.

## Coverage map

Every AC from `01-story.md` maps to at least one named test in the suite.

| AC | Test name | Level | Selectors used |
|---|---|---|---|
| AC-1 | `AC-1: @write — data source indicator shows supabase and created room is rendered` | db-e2e | `home-page`, `home-data-source`, `rooms-page`, `rooms-create-open`, `room-create-dialog`, `room-create-name`, `room-create-code`, `room-create-grid-width`, `room-create-grid-height`, `room-create-submit`, `rooms-row-ROOM-PERSIST-code`, `rooms-row-ROOM-PERSIST-name` |
| AC-1 | `AC-1: @read — created room survives process restart on fresh server instance` | db-e2e | `rooms-page`, `rooms-row-ROOM-PERSIST-code`, `rooms-row-ROOM-PERSIST-name` |
| AC-2 | `AC-2: vitest runs in mock mode via DATA_SOURCE=mock` | unit | (none — config assertion) |
| AC-2 | `AC-2: the mode is declared in vitest.config.mts, not in individual test files` | unit | (none — config assertion) |
| AC-3 | `AC-3: the resolved data source is either mock or supabase` | unit | (none — seam resolver assertion) |
| AC-3 | `the seam reports mock mode` / `AC-1: @write — data source indicator shows supabase...` | e2e / db-e2e | `home-data-source` |
| AC-4 | `AC-4: package.json has no prisma or @prisma/client in any dependency field` | unit | (none — package inspection) |
| AC-4 | `AC-4: package.json scripts have no db:push or db:studio` | unit | (none — package inspection) |
| AC-4 | `AC-4: prisma directory, prisma.config.ts, and prisma data adapter are absent` | unit | (none — filesystem assertion) |
| AC-4 | `AC-4: no file under src/ imports prisma or @prisma/client` | unit | (none — AST / token check) |
| AC-5 | `AC-5: covers every entity in the seam` | unit | (none — seam exports check) |
| AC-5 | `AC-5: <entity> exports the same function names on both sides` | unit | (none — seam exports check) |
| AC-5 | `AC-5: <entity> exports at least one function` | unit | (none — seam exports check) |
| AC-5 | `AC-5: <entity> matches arity for every export` | unit | (none — seam exports check) |
| AC-6 | `AC-6: the data package is an error outside src/lib/data/supabase/` | unit | (none — ESLint engine invocation) |
| AC-6 | `AC-6: the data package is permitted inside src/lib/data/supabase/` | unit | (none — ESLint engine invocation) |
| AC-6 | `AC-6: the auth package is permitted inside src/lib/auth/` | unit | (none — ESLint engine invocation) |
| AC-6 | `AC-6: the auth package is an error inside the data adapter — the exemptions do not overlap` | unit | (none — ESLint engine invocation) |
| AC-6 | `AC-6: the documentation audit reports no D12 finding on this tree` | unit | (none — check-docs script invocation) |
| AC-7 | `AC-7: .env.example does not expose Supabase keys with NEXT_PUBLIC_ prefix` | unit | (none — .env.example scan) |
| AC-7 | `AC-7: no client component imports any @supabase/ package` | unit | (none — component token check) |
| AC-7 | `AC-7: no NEXT_PUBLIC_ name under src/ carries a Supabase key` | unit | (none — source token scan) |
| AC-8 | `AC-8: the generated table types are a committed file, not a fetch` | unit | (none — types file inspection) |
| AC-8 | `AC-8: pnpm typecheck exits 0 with no SUPABASE_* variable set and no network` | unit | (none — tsc invocation) |
| AC-9 | `AC-9: the workflow runs pnpm test:db with REQUIRE_LOCAL_STACK=1` | unit | (none — workflow file check) |
| AC-9 | `AC-9: tests/db/types-drift.test.ts checks drift against supabase/types.generated.ts` | unit | (none — test file check) |
| AC-9 | `AC-9: generated types from local migration reset match supabase/types.generated.ts exactly` | db | (none — local reset generation comparison) |
| AC-9 | `AC-9: the committed supabase/types.generated.ts is unchanged after regeneration check` | db | (none — file byte inspection) |
| AC-10 | `AC-10: the migration exists` | unit | (none — migration file check) |
| AC-10 | `AC-10: INV-04 is held by a PARTIAL unique index on the device table` | unit / db | (none — SQL text and pg_indexes query) |
| AC-10 | `AC-10: INV-05 is held by a constraint trigger on the device table` | unit / db | (none — SQL text and pg_trigger query) |
| AC-10 | `AC-10: INV-06 is held by a downgrade trigger on the seat table` | unit / db | (none — SQL text and pg_trigger query) |
| AC-10 | `AC-10: the seat table declares no status column — INV-03` | unit / db | (none — tableBody and information_schema query) |
| AC-10 | `AC-10: no view or generated column produces a seat status — INV-03` | unit | (none — SQL text scan) |
| AC-10 | `AC-10: INV-01 — occupancy is a single scalar column, not a collection` | unit | (none — table schema check) |
| AC-10 | `AC-10: INV-02 — Seat.occupantId carries no unique constraint` | unit | (none — table schema check) |
| AC-10 | `AC-10: INV-07 — the device owner reference is nullable` | unit | (none — table schema check) |
| AC-10 | `AC-10: INV-11 — deleting a room cascades to its seats` | unit | (none — foreign key rule check) |
| AC-10 | `AC-10: INV-12 — member references refuse rather than cascade` | unit | (none — foreign key rule check) |
| AC-11 | `AC-11: a second occupant on a seat is refused (INV-01)` | db | (none — serviceClient RPC) |
| AC-11 | `AC-11: a second primary device on one seat is rejected with SQLSTATE 23505 (INV-04)` | db | (none — raw SQL insert) |
| AC-11 | `AC-11: a primary device owned by someone other than the occupant is rejected with SQLSTATE INV05 (INV-05)` | db | (none — raw SQL insert) |
| AC-11 | `AC-11: removing a seat occupant automatically downgrades the primary device to SECONDARY (INV-06)` | db | (none — raw SQL update & select) |
| AC-12 | `AC-12: the seed reads src/lib/data/fixtures.ts rather than holding its own copy` | unit | (none — script text scan) |
| AC-12 | `AC-12: every seeded table is written as an upsert, which is what makes a second run a no-op` | unit | (none — script text scan) |
| AC-12 | `AC-12: running seed twice against reset stack exits 0 and does not change row counts` | db | (none — seed script execution & count query) |
| AC-12 | `AC-12: @write — rooms/seats/members/devices/groups pages render seeded fixture entities` | db-e2e | `rooms-page`, `rooms-row-ROOM-A-code`, `seats-page`, `seats-row-SEAT-A-01-code`, `members-page`, `members-row-ada@example.internal-name`, `devices-page`, `devices-row-AST-0001-tag`, `groups-page`, `groups-table` |
| AC-13 | `AC-13: NODE_ENV=production exits non-zero and writes nothing` | unit | (none — process exit test) |
| AC-13 | `AC-13: the refusal is the first statement of the execution path` | unit | (none — script guard AST check) |

## Refusal cases

The suite asserts the following structural and behavioural refusals:
- **INV-01 refusal**: assigning an occupant to an occupied seat is refused with `SEAT_OCCUPIED` (`tests/db/refusals.test.ts`).
- **INV-04 refusal**: inserting a second PRIMARY device for the same seat is rejected by Postgres with SQLSTATE `23505` (`tests/db/refusals.test.ts`).
- **INV-05 refusal**: inserting a PRIMARY device whose owner does not match the seat occupant is rejected by Postgres constraint trigger with SQLSTATE `INV05` (`tests/db/refusals.test.ts`).
- **Package import refusal (RULE-02)**: importing `@supabase/supabase-js` outside `src/lib/data/supabase/` or importing `@supabase/ssr` inside `src/lib/data/supabase/` fails ESLint with `no-restricted-imports` (`tests/unit/seam-parity.test.ts`).
- **Production seed refusal (INV-08)**: executing `scripts/seed.ts` with `NODE_ENV=production` exits non-zero before constructing any Supabase client (`tests/unit/seam-parity.test.ts`).

## Invariant probes

| Invariant | Probe test | If absent, why |
|---|---|---|
| INV-01 | `AC-10: INV-01 — occupancy is a single scalar column, not a collection` & `AC-11: a second occupant on a seat is refused (INV-01)` | |
| INV-02 | `AC-10: INV-02 — Seat.occupantId carries no unique constraint` | |
| INV-03 | `AC-10: the seat table declares no status column — INV-03` & `AC-10: no view or generated column produces a seat status — INV-03` | |
| INV-04 | `AC-10: INV-04 is held by a PARTIAL unique index on the device table` & `AC-11: a second primary device on one seat is rejected with SQLSTATE 23505 (INV-04)` | |
| INV-05 | `AC-10: INV-05 is held by a constraint trigger on the device table` & `AC-11: a primary device owned by someone other than the occupant is rejected with SQLSTATE INV05 (INV-05)` | |
| INV-06 | `AC-10: INV-06 is held by a downgrade trigger on the seat table` & `AC-11: removing a seat occupant automatically downgrades the primary device to SECONDARY (INV-06)` | |
| INV-07 | `AC-10: INV-07 — the device owner reference is nullable` | |
| INV-08 | `AC-13: NODE_ENV=production exits non-zero and writes nothing` | |
| INV-11 | `AC-10: INV-11 — deleting a room cascades to its seats` | |
| INV-12 | `AC-10: INV-12 — member references refuse rather than cascade` | |

## Fixtures

Uses fixture identifiers and structures from `src/lib/data/fixtures.ts`:
- Rooms: `ROOM-A`, `ROOM-B`
- Seats: `SEAT-A-01`
- Members: `ada@example.internal`
- Devices: `AST-0001`
- Groups: `Engineering`

## Out of scope for this plan

- Turning RLS on (RLS remains disabled per ADR-002/ADR-007; access governed at seam).
- Running database-backed tests against a live cloud Supabase project (strictly prohibited by 01-story.md out-of-scope item 12; database lane targets local CLI stack).
- INV-10 exclusion constraint on spatial bounding box (deferred to seam level as documented model debt).

## Selector gaps

None. All selectors used are enumerated in section 6 of `02-design.md`.
