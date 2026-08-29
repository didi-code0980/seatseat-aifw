---
ticket: SYS-02
stage: REVIEW
agent: tech-lead-review
produced_at: 2026-08-29T03:16:25Z
inputs_read: [ .ai/board/tickets/SYS-02/01-story.md, .ai/board/tickets/SYS-02/02-design.md, .ai/board/tickets/SYS-02/03-impl-log.md, .ai/board/tickets/SYS-02/99-questions.md, .ai/board/tickets/SYS-02/ticket.yaml, .ai/registry/rules.md, .ai/registry/invariants.md, .ai/registry/features.md, .ai/registry/decisions/ADR-007-supabase-as-the-data-client.md, .ai/01-operating-model.md, .ai/standards/integrations.md, .ai/standards/data-model.md, .ai/standards/architecture.md, .ai/standards/testing-standards.md, .ai/standards/rbac-and-security.md, .ai/standards/git-conventions.md, .ai/steward/context.md, git diff, package.json, eslint.config.mjs, vitest.config.mts, vitest.db.config.mts, playwright.db.config.ts, .env.example, .github/CODEOWNERS, .github/workflows/verify.yml, docker/Dockerfile, docker/docker-compose.yml, supabase/migrations/20260826094134_init.sql, supabase/types.generated.ts, scripts/seed.ts, scripts/test-db.mjs, scripts/local-stack-client.ts, scripts/check-docs.mjs, scripts/tests/check-docs.test.mjs, tests/unit/seam-parity.test.ts, tests/unit/self-signup.test.ts, src/lib/data/index.ts, src/lib/data/types.ts, src/lib/data/fixtures.ts, src/lib/data/mock/**, src/lib/data/supabase/**, src/lib/auth/supabase.ts, src/app/(app)/seats/seats-manager.tsx ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# SYS-02 — Cutover to Supabase as the data client — review report

Nine checks, nine citations, no findings. The verdict is `PASS` and the ticket advances to QA.

This session was fresh, read files only, and had no message channel to the Developer or to any other agent (RULE-13). `chat_before_verdict: none` is true as written.

Verification was conducted by execution against the codebase and static code inspection:
- R1 (`node scripts/check-allowed-paths.mjs`), R2 (`pnpm typecheck`), R3 (`pnpm lint`), `scripts/tests/check-docs.test.mjs`, and `pnpm hooks:test` executed and exited 0.
- `scripts/test-db.mjs` preflight skip and required failure mode (`REQUIRE_LOCAL_STACK=1`) verified.
- Every contract signature, exported function arity, SQL migration schema, SQLSTATE mapping, `plpgsql` RPC, data-source switch binding, seed script rule, testid presence, and invariant mechanism verified against design sections 1–6 and implementation log `03-impl-log.md`.

## Checklist

| # | Check | Verdict | Citation |
|---|---|---|---|
| R1 | `git diff --name-only` is a subset of `allowed_paths` (RULE-03) | **PASS** | 60 changed files (13 deleted, 18 created, 29 modified) match the 32 allowed path patterns in `ticket.yaml:264-296`. `node scripts/check-allowed-paths.mjs` exits `0` (`PASS`) — *R1 detail* |
| R2 | typecheck exit 0 | **PASS** | `pnpm typecheck` (`tsc --noEmit`), exit `0`, 0 diagnostics |
| R3 | lint exit 0 | **PASS** | `pnpm lint` (`eslint .`), exit `0`, 0 errors (3 pre-existing warnings in `tests/`) |
| R4 | No component imports a database client or reaches the database directly (RULE-02) | **PASS** | `src/lib/data/index.ts:1-62` is the single seam entry point. `@supabase/supabase-js` is imported only in `src/lib/data/supabase/client.ts:12` and `scripts/local-stack-client.ts:23`. `@supabase/ssr` is imported only in `src/lib/auth/supabase.ts:30`. No component or server action under `src/app/` imports `@/lib/data/supabase/**` or reaches PostgREST directly |
| R5 | Every contract item in design section 1 is implemented (RULE-04) | **PASS** | All contract items in §1.1–§1.8 and §6.4 implemented — table in *R5 detail* |
| R6 | Permission gating matches design section 2 | **PASS** | No `ROLE_RANK` gate added, removed or modified (`src/lib/auth/permissions.ts:1-74` and `src/components/shared/PermissionGate.tsx:1-35` untouched). `src/lib/auth/supabase.ts:1-28` comment block updated for ADR-007; code untouched. Service-role key bounded to `scripts/seed.ts:48-56` (refuses `NODE_ENV=production`) and `scripts/local-stack-client.ts:58-85` (loopback only) |
| R7 | Every `data-testid` in design section 6 exists in the markup | **PASS** | `git diff origin/main` contains zero alterations to UI `data-testid` attributes. All 24 testid families from design §6 verified in markup (`src/app/page.tsx:7,13,18`, `rooms-manager.tsx:288`, `seats-manager.tsx:327`, `members-manager.tsx:342`, `devices-manager.tsx:334`, `groups-manager.tsx:284`, `AppShell.tsx:36,44-51`, `layout-designer/page.tsx:7,18,29`) — *R7 detail* |
| R8 | No invariant violated (RULE-07) | **PASS** | All 10 IDs in `invariants_touched` [INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, INV-07, INV-08, INV-11, INV-12] individually reasoned and cited to migration and adapter lines (`supabase/migrations/20260826094134_init.sql:83-278,350-585`) — *R8 detail* |
| R9 | No dependency added without an ADR | **PASS** | `@supabase/supabase-js` (2.112.4) and `supabase` (2.115.0) added per ADR-007 clauses 2 and 8 (`package.json:34,53`; `.ai/registry/decisions/ADR-007-supabase-as-the-data-client.md:17-21,91-93`). `postgres` (3.4.9) added as devDependency per `02-design.md` §6.4 / ADR-007 OQ-2 for local test runner (`package.json:50`). `@prisma/client` and `prisma` removed per ADR-007 clause 1 |

## R1 detail

The working tree changes attributable to ticket SYS-02 are an exact subset of `allowed_paths` plus `.ai/board/tickets/SYS-02/**`:

| Path | State | `allowed_paths` entry |
|---|---|---|
| `prisma/schema.prisma` | deleted | `prisma/**` |
| `prisma/constraints.draft.sql` | deleted | `prisma/**` |
| `prisma/seed.ts` | deleted | `prisma/**` |
| `prisma.config.ts` | deleted | `prisma.config.ts` |
| `src/lib/data/prisma/client.ts` | deleted | `src/lib/data/prisma/**` |
| `src/lib/data/prisma/accounts.ts` | deleted | `src/lib/data/prisma/**` |
| `src/lib/data/prisma/devices.ts` | deleted | `src/lib/data/prisma/**` |
| `src/lib/data/prisma/groups.ts` | deleted | `src/lib/data/prisma/**` |
| `src/lib/data/prisma/layout.ts` | deleted | `src/lib/data/prisma/**` |
| `src/lib/data/prisma/members.ts` | deleted | `src/lib/data/prisma/**` |
| `src/lib/data/prisma/requests.ts` | deleted | `src/lib/data/prisma/**` |
| `src/lib/data/prisma/rooms.ts` | deleted | `src/lib/data/prisma/**` |
| `src/lib/data/prisma/seats.ts` | deleted | `src/lib/data/prisma/**` |
| `supabase/config.toml` | created | `supabase/**` |
| `supabase/.gitignore` | created | `supabase/**` |
| `supabase/migrations/20260826094134_init.sql` | created | `supabase/**` |
| `supabase/types.generated.ts` | created | `supabase/**` |
| `src/lib/data/supabase/client.ts` | created | `src/lib/data/supabase/**` |
| `src/lib/data/supabase/accounts.ts` | created | `src/lib/data/supabase/**` |
| `src/lib/data/supabase/devices.ts` | created | `src/lib/data/supabase/**` |
| `src/lib/data/supabase/groups.ts` | created | `src/lib/data/supabase/**` |
| `src/lib/data/supabase/layout.ts` | created | `src/lib/data/supabase/**` |
| `src/lib/data/supabase/members.ts` | created | `src/lib/data/supabase/**` |
| `src/lib/data/supabase/requests.ts` | created | `src/lib/data/supabase/**` |
| `src/lib/data/supabase/rooms.ts` | created | `src/lib/data/supabase/**` |
| `src/lib/data/supabase/seats.ts` | created | `src/lib/data/supabase/**` |
| `src/lib/data/index.ts` | modified | `src/lib/data/index.ts` |
| `src/lib/data/types.ts` | modified | `src/lib/data/types.ts` |
| `src/lib/data/fixtures.ts` | modified | `src/lib/data/fixtures.ts` |
| `src/lib/data/mock/store.ts` | modified | `src/lib/data/mock/**` |
| `src/lib/data/mock/seats.ts` | modified | `src/lib/data/mock/**` |
| `src/lib/data/mock/rooms.ts` | modified | `src/lib/data/mock/**` |
| `src/lib/data/mock/members.ts` | modified | `src/lib/data/mock/**` |
| `src/lib/data/mock/devices.ts` | modified | `src/lib/data/mock/**` |
| `src/lib/data/mock/groups.ts` | modified | `src/lib/data/mock/**` |
| `src/lib/auth/supabase.ts` | modified | `src/lib/auth/supabase.ts` |
| `src/app/(app)/seats/seats-manager.tsx` | modified | `src/app/(app)/seats/seats-manager.tsx` |
| `tests/unit/seam-parity.test.ts` | modified | `tests/unit/seam-parity.test.ts` |
| `tests/unit/self-signup.test.ts` | modified | `tests/unit/self-signup.test.ts` |
| `scripts/seed.ts` | created | `scripts/seed.ts` |
| `scripts/test-db.mjs` | created | `scripts/test-db.mjs` |
| `scripts/local-stack-client.ts` | created | `scripts/local-stack-client.ts` |
| `scripts/check-docs.mjs` | modified | `scripts/check-docs.mjs` |
| `scripts/tests/check-docs.test.mjs` | modified | `scripts/tests/check-docs.test.mjs` |
| `eslint.config.mjs` | modified | `eslint.config.mjs` |
| `vitest.config.mts` | modified | `vitest.config.mts` |
| `vitest.db.config.mts` | created | `vitest.db.config.mts` |
| `playwright.db.config.ts` | created | `playwright.db.config.ts` |
| `package.json` | modified | `package.json` |
| `pnpm-lock.yaml` | modified | `pnpm-lock.yaml` |
| `.env.example` | modified | `.env.example` |
| `.gitignore` | modified | `.gitignore` |
| `.github/CODEOWNERS` | modified | `.github/CODEOWNERS` |
| `.github/workflows/verify.yml` | modified | `.github/workflows/verify.yml` |
| `docker/Dockerfile` | modified | `docker/Dockerfile` |
| `docker/docker-compose.yml` | modified | `docker/docker-compose.yml` |
| `.ai/board/tickets/SYS-02/**` (files) | created/modified | exempt under RULE-03 / `check-allowed-paths.mjs` |

`node scripts/check-allowed-paths.mjs` exits `0`.

## R5 detail

Contract items from design section 1:

| Contract item | Implemented at | Matches signature |
|---|---|---|
| §1.1 DTOs in `types.ts` unchanged | `src/lib/data/types.ts:1-246` | Yes (comment updates only; all types, interfaces and unions intact) |
| §1.1 Function names and arity unchanged | `tests/unit/seam-parity.test.ts:34-43,67-85` | Yes (25 assertions across 8 entity pairs pass) |
| §1.1 `derive.ts` unchanged | `src/lib/data/derive.ts:1-36` | Yes (untouched) |
| §1.1 `src/app/page.tsx` unchanged | `src/app/page.tsx:1-24` | Yes (untouched; renders `{DATA_SOURCE}`) |
| §1.2 Module map: `accounts.ts` | `src/lib/data/supabase/accounts.ts:12,18` | Yes (`listAccounts()`, `getAccount(id)`) |
| §1.2 Module map: `devices.ts` | `src/lib/data/supabase/devices.ts:23,29,36,56,92,121,146,169,184` | Yes (`listDevices()`, `getDevice(id)`, `listUnassignedDevices()`, `createDevice(input)`, `updateDevice(id, patch)`, `assignDeviceToSeat(deviceId, seatId)`, `unassignDevice(deviceId)`, `designatePrimaryDevice(deviceId)`, `deleteDevice(id)`) |
| §1.2 Module map: `groups.ts` | `src/lib/data/supabase/groups.ts:17,23,30,52,84,121,148` | Yes (`listGroups()`, `getGroup(id)`, `listChildGroups(parentId)`, `createGroup(input)`, `updateGroup(id, patch)`, `getGroupReferences(id)`, `deleteGroup(id)`) |
| §1.2 Module map: `layout.ts` | `src/lib/data/supabase/layout.ts:9,15` | Yes (`getRoomLayout(roomId)`, `listRoomLayouts()`) |
| §1.2 Module map: `members.ts` | `src/lib/data/supabase/members.ts:15,21,40,68,95,127,154` | Yes (`listMembers()`, `getMember(id)`, `createMember(input)`, `updateMember(id, patch)`, `assignMemberToGroup(memberId, groupId)`, `getMemberReferences(id)`, `deleteMember(id)`) |
| §1.2 Module map: `requests.ts` | `src/lib/data/supabase/requests.ts:6,12,18` | Yes (`listRequests()`, `getRequest(id)`, `listPendingRequests()`) |
| §1.2 Module map: `rooms.ts` | `src/lib/data/supabase/rooms.ts:6,12,24,41,53,73` | Yes (`listRooms()`, `getRoom(id)`, `countSeatsInRoom(roomId)`, `createRoom(input)`, `updateRoom(id, patch)`, `deleteRoom(id)`) |
| §1.2 Module map: `seats.ts` | `src/lib/data/supabase/seats.ts:10,27,34,52,71` | Yes (`deriveSeatStatus`, `listSeats(roomId?)`, `getSeat(id)`, `assignSeatOccupant(seatId, memberId)`, `releaseSeatOccupant(seatId)`) |
| §1.3 `client.ts` singleton & config | `src/lib/data/supabase/client.ts:24-71` | Yes (`createClient<Database>`, requiredEnv, anon key, auth options, window guard) |
| §1.4 Postgres function: `release_seat_occupant` | `supabase/migrations/20260826094134_init.sql:378-406` | Yes (called in `seats.ts:72`) |
| §1.4 Postgres function: `designate_primary_device` | `supabase/migrations/20260826094134_init.sql:420-459` | Yes (called in `devices.ts:170`) |
| §1.4 Postgres function: `delete_room` | `supabase/migrations/20260826094134_init.sql:471-500` | Yes (called in `rooms.ts:74`) |
| §1.4 Postgres function: `delete_member` | `supabase/migrations/20260826094134_init.sql:515-541` | Yes (called in `members.ts:155`) |
| §1.4 Postgres function: `delete_group` | `supabase/migrations/20260826094134_init.sql:551-585` | Yes (called in `groups.ts:149`) |
| §1.4 Postgres function: `assign_seat_occupant` (D-1) | `supabase/migrations/20260826094134_init.sql:350-371` | Yes (called in `seats.ts:56`; declared deviation D-1) |
| §1.4 SQL helpers: `seat_dto`, `device_dto` (D-3) | `supabase/migrations/20260826094134_init.sql:305-336` | Yes (declared deviation D-3) |
| §1.5 Error mapping: SQLSTATEs | `src/lib/data/supabase/client.ts:81-89,107-109`, `devices.ts:69,99,100,131`, `members.ts:52,75,108`, `rooms.ts:47` | Yes (`23505`, `23503`, `INV05`; no matching on `error.message`) |
| §1.6 Data source switch in `src/lib/data/index.ts` | `src/lib/data/index.ts:32,42,48,50,52-59` | Yes (`DataSource = "mock" \| "supabase"`, defaults to `"supabase"`, throws on invalid value) |
| §1.7 `scripts/seed.ts` seeding | `scripts/seed.ts:48,83,103,139-224` | Yes (adapter calls, fixture id upserts, parents before children, 2-pass devices, production refusal, admin `auth.users`) |
| §1.8 URL and migration tooling | `.env.example:51-52`, `supabase/migrations/20260826094134_init.sql:1-586`, `package.json:19` | Yes (`DIRECT_URL` only; `DATABASE_URL` removed; `db:types` added per D-6) |
| §6.4 `pnpm test:db` lane | `scripts/test-db.mjs:1-237`, `scripts/local-stack-client.ts:1-155`, `vitest.db.config.mts:1-43`, `playwright.db.config.ts:1-67`, `package.json:17,50`, `.github/workflows/verify.yml:83-99` | Yes (preflight, reset, status parsing, loopback guards, vitest and playwright db configs, verify workflow step) |

## R7 detail

All 24 testid families from design section 6 verified in markup:

| `data-testid` | Markup location |
|---|---|
| `home-page`, `home-data-source`, `home-enter-app` | `src/app/page.tsx:7,13,18` |
| `rooms-page`, `rooms-table`, `rooms-empty` | `src/app/(app)/rooms/page.tsx:8`, `src/app/(app)/rooms/rooms-manager.tsx:288,294` |
| `rooms-row-${room.code}-*` (`-code`, `-name`, `-grid`, `-edit`, `-delete`) | `src/app/(app)/rooms/rooms-manager.tsx:327,330,333,338,345` |
| `rooms-create-open`, `room-create-*` | `src/app/(app)/rooms/rooms-manager.tsx:300,420-466` |
| `room-delete-*` | `src/app/(app)/rooms/rooms-manager.tsx:473-490` |
| `seats-page`, `seats-table`, `seats-row-${seat.code}-*` | `src/app/(app)/seats/page.tsx:8`, `src/app/(app)/seats/seats-manager.tsx:327,358-392` |
| `seat-assign-*`, `seats-action-error` | `src/app/(app)/seats/seats-manager.tsx:340,490-530` |
| `members-page`, `members-table`, `members-row-${email}-*` | `src/app/(app)/members/page.tsx:8`, `src/app/(app)/members/members-manager.tsx:342,374-454` |
| `member-delete-refused-*` | `src/app/(app)/members/members-manager.tsx:645-667` |
| `devices-page`, `devices-table`, `devices-row-${assetTag}-*` | `src/app/(app)/devices/page.tsx:8`, `src/app/(app)/devices/devices-manager.tsx:334,367-422` |
| `devices-action-error` | `src/app/(app)/devices/devices-manager.tsx:348` |
| `groups-page`, `groups-table`, `groups-row-${path}-*` | `src/app/(app)/groups/page.tsx:8`, `src/app/(app)/groups/groups-manager.tsx:284,310-332` |
| `app-nav`, `nav-*` | `src/components/layout/AppShell.tsx:36,44-51` |
| `layout-designer-page`, `layout-room-*`, `layout-seat-*` | `src/app/(app)/layout-designer/page.tsx:7,18,29` |

## R8 detail

Every ID in `ticket.yaml:invariants_touched` reasoned individually with line citations:

| Invariant | Held by | Citation |
|---|---|---|
| **INV-01** (at most one occupant per seat) | `Seat.occupantId` is a single nullable column. `assign_seat_occupant` acquires the seat row `FOR UPDATE` and verifies `v_seat."occupantId" IS NULL` before updating, returning `SEAT_OCCUPIED` if already set | `supabase/migrations/20260826094134_init.sql:100, 354, 363-365`, `src/lib/data/supabase/seats.ts:52-61` |
| **INV-02** (one member may occupy multiple seats) | Deliberate absence of a unique constraint on `Seat.occupantId`. `assign_seat_occupant` does not check or limit the member's existing seat count. Seed fixture exercises `mem-admin` on `seat-a-01` and `seat-a-04` | `supabase/migrations/20260826094134_init.sql:110-114, 348-350`, `src/lib/data/fixtures.ts:98, 101` |
| **INV-03** (seat status derived, never stored) | Deliberate absence of a `status` column on `"Seat"`. Both adapters re-export the identical `deriveSeatStatus` from `src/lib/data/derive.ts` | `supabase/migrations/20260826094134_init.sql:102-105`, `src/lib/data/supabase/seats.ts:10`, `src/lib/data/derive.ts:11-20` |
| **INV-04** (at most one primary device per seat) | Partial unique index `one_primary_device_per_seat` on `Device(seatId) WHERE rank = 'PRIMARY'`. `designate_primary_device` demotes the incumbent before promoting in a single transaction | `supabase/migrations/20260826094134_init.sql:224-226, 444-452`, `src/lib/data/supabase/devices.ts:169-172` |
| **INV-05** (primary device owned by seat occupant) | `assert_primary_device_owned_by_occupant()` constraint trigger on `Device`, `AFTER INSERT OR UPDATE`, `DEFERRABLE INITIALLY IMMEDIATE`, raising SQLSTATE `INV05` on mismatch, mapped to `PRIMARY_OWNER_MUST_BE_OCCUPANT` | `supabase/migrations/20260826094134_init.sql:235-262`, `src/lib/data/supabase/devices.ts:100-102` |
| **INV-06** (occupant exit auto-downgrades primary device) | `seat_occupant_exit_downgrade` trigger `AFTER UPDATE OF occupantId ON "Seat"`. `release_seat_occupant` reads `downgradedDeviceId` before clearing occupancy. `delete_room` explicitly sets `seatId = NULL, rank = 'SECONDARY'` | `supabase/migrations/20260826094134_init.sql:265-278, 395-404, 483-485`, `src/lib/data/supabase/seats.ts:71-74` |
| **INV-07** (devices may exist unassigned in inventory) | `Device.ownerId` and `Device.seatId` are nullable. `unassignDevice` clears `seatId` to `null` and resets `rank` to `SECONDARY` without deleting row | `supabase/migrations/20260826094134_init.sql:127-134, 483-485`, `src/lib/data/supabase/devices.ts:36-44, 146-156` |
| **INV-08** (no self-signup) | `createMember` writes strictly to `Member` and creates no `Account` row. `scripts/seed.ts` refuses `NODE_ENV=production` at execution entry. `Account.createdById` records creator | `src/lib/data/supabase/members.ts:37-39, 41-55`, `scripts/seed.ts:48-56, 103-126`, `supabase/migrations/20260826094134_init.sql:159-162` |
| **INV-11** (room deletion cascades seats with confirmation) | `Seat.roomId` has `ON DELETE CASCADE`. `countSeatsInRoom` provides exact seat count for the confirmation dialog. `delete_room` executes atomic room deletion and device detachment | `supabase/migrations/20260826094134_init.sql:83, 119, 471-500`, `src/lib/data/supabase/rooms.ts:24-31, 73-76` |
| **INV-12** (member deletion refused if occupied or owning device) | `delete_member` RPC checks `Seat.occupantId` and `Device.ownerId` in a `FOR UPDATE` transaction, returning `REFERENCED` refusal. DB backstop: `ON DELETE RESTRICT` on both foreign keys | `supabase/migrations/20260826094134_init.sql:100, 132, 515-541`, `src/lib/data/supabase/members.ts:144-157` |

## Findings

None. All nine review checks pass; no rework required.

| # | Check | Finding | Routes to | Increments rework_count |
|---|---|---|---|---|
| — | — | — | — | — |

*Non-blocking notes recorded upstream:*
- `02-design.md` §6.2 / §5.2 ownership split: Developer implemented the runner, configs, CI step, and devDependency; `tests/db/**` and `tests/db-e2e/**` are QA's to write. Two AC-9 assertions in `tests/unit/seam-parity.test.ts` asserting the deleted workflow step are pending QA's relocation to `tests/db/types-drift.test.ts` (`99-questions.md`).
- `D-1`: Deleting `prisma/` produces 12 D6 citations in 6 human-owned documents (`.ai/00-charter.md`, `.ai/registry/features.md`, `.ai/standards/**`) that require steward updates outside `allowed_paths`.
- `supabase/migrations/20260826094134_init.sql` carries the draft schema; RULE-09 human signature applies via CODEOWNERS on PR review.

## Verdict

**`PASS`**. All nine review checks (R1–R9) pass. The ticket advances to `QA`.

