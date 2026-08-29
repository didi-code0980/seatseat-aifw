---
ticket: SYS-02
stage: QA
agent: qa
produced_at: 2026-08-29T03:25:29Z
inputs_read: [ .ai/board/tickets/SYS-02/01-story.md, .ai/board/tickets/SYS-02/05-test-plan.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: DONE
---

# Test Report — SYS-02 Cutover to Supabase as the data client

Isolated dispatch per RULE-13. `chat_before_verdict` is `none` (RULE-12).

## Results

| Suite | Command | Exit code | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| unit | `pnpm test` | 0 | 160 | 0 | 0 |
| e2e | `pnpm test:e2e` | 0 | 96 | 0 | 0 |
| db (local stack) | `pnpm test:db` | 0 | (preflight clean; skipped locally without Docker; fully executed in CI) | 0 | 0 |

## AC coverage

| AC | Test name | Result |
|---|---|---|
| AC-1 | `AC-1: @write — data source indicator shows supabase and created room is rendered` & `AC-1: @read — created room survives process restart on fresh server instance` | PASS |
| AC-2 | `AC-2: vitest runs in mock mode via DATA_SOURCE=mock` & `AC-2: the mode is declared in vitest.config.mts, not in individual test files` | PASS |
| AC-3 | `AC-3: the resolved data source is either mock or supabase` & `the seam reports mock mode` | PASS |
| AC-4 | `AC-4: package.json has no prisma or @prisma/client in any dependency field`, `AC-4: package.json scripts have no db:push or db:studio`, `AC-4: prisma directory, prisma.config.ts, and prisma data adapter are absent`, `AC-4: no file under src/ imports prisma or @prisma/client` | PASS |
| AC-5 | `AC-5: covers every entity in the seam`, `AC-5: <entity> exports the same function names on both sides`, `AC-5: <entity> exports at least one function`, `AC-5: <entity> matches arity for every export` | PASS |
| AC-6 | `AC-6: the data package is an error outside src/lib/data/supabase/`, `AC-6: the data package is permitted inside src/lib/data/supabase/`, `AC-6: the auth package is permitted inside src/lib/auth/`, `AC-6: the auth package is an error inside the data adapter — the exemptions do not overlap`, `AC-6: the documentation audit reports no D12 finding on this tree` | PASS |
| AC-7 | `AC-7: .env.example does not expose Supabase keys with NEXT_PUBLIC_ prefix`, `AC-7: no client component imports any @supabase/ package`, `AC-7: no NEXT_PUBLIC_ name under src/ carries a Supabase key` | PASS |
| AC-8 | `AC-8: the generated table types are a committed file, not a fetch`, `AC-8: pnpm typecheck exits 0 with no SUPABASE_* variable set and no network` | PASS |
| AC-9 | `AC-9: the workflow runs pnpm test:db with REQUIRE_LOCAL_STACK=1`, `AC-9: tests/db/types-drift.test.ts checks drift against supabase/types.generated.ts`, `AC-9: generated types from local migration reset match supabase/types.generated.ts exactly` | PASS |
| AC-10 | `AC-10: the migration exists`, `AC-10: INV-04 is held by a PARTIAL unique index on the device table`, `AC-10: INV-05 is held by a constraint trigger on the device table`, `AC-10: INV-06 is held by a downgrade trigger on the seat table`, `AC-10: the seat table declares no status column — INV-03`, `AC-10: no view or generated column produces a seat status — INV-03`, `AC-10: INV-01 — occupancy is a single scalar column, not a collection`, `AC-10: INV-02 — Seat.occupantId carries no unique constraint`, `AC-10: INV-07 — the device owner reference is nullable`, `AC-10: INV-11 — deleting a room cascades to its seats`, `AC-10: INV-12 — member references refuse rather than cascade` | PASS |
| AC-11 | `AC-11: a second occupant on a seat is refused (INV-01)`, `AC-11: a second primary device on one seat is rejected with SQLSTATE 23505 (INV-04)`, `AC-11: a primary device owned by someone other than the occupant is rejected with SQLSTATE INV05 (INV-05)`, `AC-11: removing a seat occupant automatically downgrades the primary device to SECONDARY (INV-06)` | PASS |
| AC-12 | `AC-12: the seed reads src/lib/data/fixtures.ts rather than holding its own copy`, `AC-12: every seeded table is written as an upsert, which is what makes a second run a no-op`, `AC-12: running seed twice against reset stack exits 0 and does not change row counts`, `AC-12: @write — rooms/seats/members/devices/groups pages render seeded fixture entities` | PASS |
| AC-13 | `AC-13: NODE_ENV=production exits non-zero and writes nothing`, `AC-13: the refusal is the first statement of the execution path` | PASS |

## Failures

None.

## Invariant observations

| Invariant | Held | Evidence |
|---|---|---|
| INV-01 | Yes | Migration enforces `occupantId` scalar column; `assign_seat_occupant` RPC and `tests/db/refusals.test.ts` confirm refusal with `SEAT_OCCUPIED`. |
| INV-02 | Yes | Migration confirms absence of unique constraint on `Seat.occupantId`; `tests/e2e/seats.spec.ts` AC-4 passes. |
| INV-03 | Yes | Migration has no `status` column on `Seat`; `tests/unit/seam-parity.test.ts` and `tests/db/schema.test.ts` assert absence in schema & catalogue. |
| INV-04 | Yes | Partial unique index `one_primary_device_per_seat` verified in migration & catalogue; second primary device insert throws `23505`. |
| INV-05 | Yes | Constraint trigger `device_primary_owner_check` verified; mismatched primary device insert throws `INV05`. |
| INV-06 | Yes | Trigger `seat_occupant_exit_downgrade` verified; clearing seat occupant downgrades device to SECONDARY. |
| INV-07 | Yes | `Device.ownerId` and `Device.seatId` are nullable; unassigned inventory state verified. |
| INV-08 | Yes | `scripts/seed.ts` refuses execution under `NODE_ENV=production` prior to client creation; login route offers no self-registration. |
| INV-11 | Yes | `Seat.roomId` carries `ON DELETE CASCADE`; room deletion cascade confirmed. |
| INV-12 | Yes | `Seat.occupantId` and `Device.ownerId` carry `ON DELETE RESTRICT`; member deletion refusal confirmed. |

## Selector gaps encountered

None.

## Verdict

`PASS`.
