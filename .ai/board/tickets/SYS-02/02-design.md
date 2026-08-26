---
ticket: SYS-02
stage: DESIGN
agent: tech-lead-design
produced_at: 2026-08-26T09:22:00Z
inputs_read: [ .ai/board/tickets/SYS-02/ticket.yaml, .ai/board/tickets/SYS-02/01-story.md, .ai/registry/rules.md, .ai/registry/invariants.md, .ai/registry/features.md, .ai/registry/decisions/ADR-007-supabase-as-the-data-client.md, .ai/01-operating-model.md, .ai/standards/integrations.md, .ai/standards/data-model.md, .ai/standards/architecture.md, .ai/standards/testing-standards.md, .ai/standards/rbac-and-security.md, .ai/standards/git-conventions.md, .ai/steward/context.md, src/lib/data/index.ts, src/lib/data/types.ts, src/lib/data/derive.ts, src/lib/data/fixtures.ts, src/lib/data/prisma/**, src/lib/data/mock/seats.ts, src/lib/data/mock/store.ts, src/lib/auth/supabase.ts, src/app/page.tsx, prisma/schema.prisma, prisma/constraints.draft.sql, prisma/seed.ts, prisma.config.ts, package.json, eslint.config.mjs, scripts/check-docs.mjs, scripts/check-allowed-paths.mjs, scripts/tests/check-docs.test.mjs, tests/unit/seam-parity.test.ts, vitest.config.mts, playwright.config.ts, .env.example, .github/workflows/verify.yml, .github/CODEOWNERS, docker/docker-compose.yml, "node_modules/.pnpm/@supabase+supabase-js@2.112.4/**/dist/index.d.mts", "node_modules/.pnpm/@supabase+auth-js@2.112.4/**/GoTrueAdminApi.d.ts", "node_modules/.pnpm/@supabase+postgrest-js@2.112.4/**/dist/index.d.mts", "node_modules/.pnpm/vitest@4.1.10*/**/reporters.d.DtoKVV2s.d.ts", "https://supabase.com/docs/reference/cli/supabase-db-push", "https://supabase.com/docs/guides/local-development/cli/getting-started" ]
consulted:
  - with: none
    asked: "Nothing. No pair was consulted and no chat was opened. Every question this stage was routed — Q-3 in `01-story.md` — was answerable from installed types and the Supabase CLI's own reference, which is where the answer came from."
    answer: "n/a"
    resulted_in_amendment: false
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: IN_PROGRESS
---

# SYS-02 — Tech design: cutover to Supabase as the data client

**Three things to read before section 1. Each one is a decision this stage took that a reader would
otherwise discover at the wrong moment.**

**1. `size` is `L`, not `XL`, and it is not split.** `.ai/01-operating-model.md` §Sizing was amended
on 2026-08-26 (PR #54, merged after `01-story.md` was written) so that **a schema change with an
approved ADR linked is not XL on that ground**. `ticket.yaml` carries `adr: "ADR-007"` and ADR-007 is
`ACCEPTED`. The other two XL clauses do not fire either — no existing `src/lib/data/` function
changes its signature, and no DTO in `types.ts` changes shape. What remains is the file count, which
is `L`. `L`'s handling is *must split at DESIGN*, and `.ai/registry/features.md:152` forbids the
split; the same §Sizing now carries that exception by name. Not split, therefore, by the registry and
not by this stage's preference. **`size_estimate: M` and `size: L` disagree, and this design does not
route the ticket back to `ba` — see *Size verdict* below for why that is a judgement and not an
oversight.**

**2. Deleting `prisma/` turns check D6 red in six human-owned documents, and no document records
this.** It is verified rather than suspected: twelve path references across `.ai/00-charter.md`,
`.ai/registry/features.md`, `.ai/standards/architecture.md`, `.ai/standards/data-model.md`,
`.ai/standards/git-conventions.md`, `.ai/standards/integrations.md` and `.ai/standards/session-model.md`
resolve to files this ticket deletes. `docs-audit` runs in CI whenever a pull request touches `.ai/`
or `.claude/`, and this ticket's pull request touches `.ai/board/tickets/SYS-02/`, so it will run.
**Those files are registry and standards plane and are not in `allowed_paths`.** The full list and
the routing are in *Open questions* `D-1`. This does not block IN_PROGRESS; it blocks a green
`verify` on the pull request, and it needs a steward change landing with it.

**3. PostgREST has no multi-statement transaction, and four seam operations depend on one.** The
mock holds INV-05 and INV-06 by writing two objects with no `await` between them. Two PostgREST calls
are two transactions, and the state between them is INV-05 false and observable. The answer is
section 1.4: those operations become Postgres functions called through `.rpc()`, one transaction
each. This is the single largest shape decision in this design and it is not in ADR-007.

---

## Size verdict

`size: L`. Counted from `allowed_paths` in section 5: 13 files deleted, 13 created, 28 modified —
54, against `L`'s threshold of "more than 12".

**Not `XL`.** The three XL clauses in `.ai/01-operating-model.md` §Sizing, each answered:

| Clause | Verdict | Ground |
|---|---|---|
| changes the schema **with no approved ADR linked** | does not fire | `ticket.yaml` `adr: "ADR-007"`; ADR-007 §Status is `ACCEPTED — 2026-08-25, by the operator`. The clause was amended to this wording on 2026-08-26 for exactly this ticket. |
| changes the signature of an existing `src/lib/data/` function | does not fire | Section 3. Every exported name and arity is unchanged and `tests/unit/seam-parity.test.ts` is what holds it. |
| changes `types.ts` | does not fire | Section 1.1. `src/lib/data/types.ts` is in `allowed_paths` for **comment text only** — three comments name Prisma and one names a file that is being deleted. No type, no field and no union member changes. §Sizing's own explanation is the test to apply: *"XL is for changes that break the seam's existing contract … The test is whether existing callers must change."* No caller changes. |

**Not split, and the refusal is the registry's rather than this stage's.** `.ai/registry/features.md:152`:
*"Not to be split into two tickets: check D12 is red from the first commit until it is rewritten as a
two-package map, and splitting would place a red pull request in the middle on purpose."*
`.ai/01-operating-model.md` §Sizing carries the exception: *"A registry row may forbid the split that
`L` prescribes, and then it is not split."*

**On `size_estimate: M` versus `size: L`.** §Sizing says a story estimated `M` that designs out to `L`
was under-specified and DESIGN routes it back to SPEC. **That inference is false here and the ticket
is not routed back.** Three reasons, in order of weight:

1. `01-story.md` §Size states the disagreement *in advance*, names the exact rows it would match, and
   argues the inference. A story that predicts its own verdict is the opposite of under-specified.
2. The operator already decided this question once, on 2026-08-26, by reissuing `/spec SYS-02` after
   a `BLOCKED` verdict on this exact field. Routing back asks the same person the same question a
   third time — which is the argument §Sizing itself now uses against escalating an ADR-approved
   schema change.
3. Re-running SPEC changes nothing that could change the verdict. `size` is counted from
   `allowed_paths`, and `allowed_paths` is fixed by ADR-007's affected-documents table, not by the
   story's wording.

What the gap is evidence of is recorded and routed, not swallowed: `Q-1` in `01-story.md` remains
open against the steward, and PR #54 answered half of it — the XL row — while leaving the other half,
*a value in `size_estimate` for work that is correctly larger than `M`*, unaddressed. `D-2` below.

## 1. Contract

**This ticket adds no server action, no Zod schema and no DTO.** RULE-04's subject here is the
adapter module contract, which already exists and is already fixed by `src/lib/data/types.ts` and
`tests/unit/seam-parity.test.ts`. Section 1.1 states what does not change so that a change is a
review finding; 1.2 to 1.6 state everything that is new, in copy-pasteable form, because the
Developer may not invent a name.

### 1.1 What does not change, and is a finding if it does

- **Every type in `src/lib/data/types.ts`.** Not one interface, union member, field name or
  optionality. `types.ts` appears in `allowed_paths` for comment text only — lines 3, 7 and 139 name
  Prisma or `prisma/schema.prisma`, and the file they cite is deleted by this ticket. AC-5 is the
  criterion and review check R5 is where it is judged.
- **Every exported function name and arity in the eight entity modules.** The new
  `src/lib/data/supabase/` modules export exactly the names `src/lib/data/prisma/` exports today,
  with the same arity, because `tests/unit/seam-parity.test.ts` compares them against `mock/` and
  fails on either. The authoritative list is 1.2.
- **`src/lib/data/derive.ts`.** `deriveSeatStatus` stays the one derivation both sides re-export.
  INV-03.
- **`src/app/page.tsx`.** It renders `{DATA_SOURCE}` verbatim, so AC-3's two permitted values follow
  from 1.3 with no edit here. It is deliberately **not** in `allowed_paths`.
- **No caller anywhere under `src/app/**` changes to accommodate the new adapter**, with one
  exception that is a comment: `src/app/(app)/seats/seats-manager.tsx:157-158` reasons about
  `DATA_SOURCE=prisma` and ADR-007 §Consequences names it.

### 1.2 The module map — nine files, mirroring `src/lib/data/prisma/` exactly

`src/lib/data/prisma/` is deleted and `src/lib/data/supabase/` replaces it file for file. The
exported surface below is transcribed from the modules being replaced; it is not a new design.

```
src/lib/data/supabase/client.ts     replaces prisma/client.ts     (1.3)
src/lib/data/supabase/accounts.ts   listAccounts() getAccount(id)
src/lib/data/supabase/devices.ts    listDevices() getDevice(id) listUnassignedDevices()
                                    createDevice(input) updateDevice(id, patch)
                                    assignDeviceToSeat(deviceId, seatId) unassignDevice(deviceId)
                                    designatePrimaryDevice(deviceId) deleteDevice(id)
src/lib/data/supabase/groups.ts     listGroups() getGroup(id) listChildGroups(parentId)
                                    createGroup(input) updateGroup(id, patch)
                                    getGroupReferences(id) deleteGroup(id)
src/lib/data/supabase/layout.ts     getRoomLayout(roomId) listRoomLayouts()
src/lib/data/supabase/members.ts    listMembers() getMember(id) createMember(input)
                                    updateMember(id, patch) assignMemberToGroup(memberId, groupId)
                                    getMemberReferences(id) deleteMember(id)
src/lib/data/supabase/requests.ts   listRequests() getRequest(id) listPendingRequests()
src/lib/data/supabase/rooms.ts      listRooms() getRoom(id) countSeatsInRoom(roomId)
                                    createRoom(input) updateRoom(id, patch) deleteRoom(id)
src/lib/data/supabase/seats.ts      listSeats(roomId?) getSeat(id)
                                    assignSeatOccupant(seatId, memberId)
                                    releaseSeatOccupant(seatId)
                                    + export { deriveSeatStatus } from "../derive";
```

**The `deriveSeatStatus` re-export on `seats.ts` is not optional.** `mock/seats.ts:12` and
`prisma/seats.ts:6` both carry it, and `seam-parity.test.ts` compares exported *functions*, so
omitting it fails the suite. It is the single easiest line to lose in a file-for-file rewrite.

Every return type is the DTO or outcome union already declared in `src/lib/data/types.ts`. No module
may declare a new exported type.

### 1.3 `src/lib/data/supabase/client.ts` — the one module that constructs a client

```ts
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../../../supabase/types.generated";

/** Verified against @supabase/supabase-js 2.112.4 dist/index.d.mts:797 —
 *  createClient<Database>(supabaseUrl: string, supabaseKey: string, options?: SupabaseClientOptions<SchemaName>) */
function requiredEnv(name: "SUPABASE_URL" | "SUPABASE_ANON_KEY"): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is not set. The Supabase data adapter needs it; see .env.example.`);
  }
  return value;
}

let cached: ReturnType<typeof createClient<Database>> | null = null;

export function db(): ReturnType<typeof createClient<Database>> {
  if (typeof window !== "undefined") {
    throw new Error(
      "The Supabase data client was constructed in the browser. ADR-007 clause 4: every Supabase " +
        "client, for data as for auth, is constructed server-side only."
    );
  }
  if (cached === null) {
    cached = createClient<Database>(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return cached;
}
```

Five things about this module, each of which is a decision:

1. **It is a module-level singleton, and `src/lib/auth/supabase.ts` is deliberately not.** The auth
   client closes over one request's cookie store, which is why its own comment forbids a singleton.
   This client holds no session — the three `auth` options above are what guarantee it — so per-request
   construction would buy nothing and cost a client per request.
2. **`SUPABASE_ANON_KEY`, not the service-role key.** ADR-007's *Implementation decisions* put
   `SUPABASE_SERVICE_ROLE_KEY` in the seed script *"and to nothing else"*. **The consequence has to
   be stated because it is load-bearing and nothing else records it:** RLS is off (ADR-002), so the
   `anon` role reaches every table through Postgres GRANTs alone. The first migration must therefore
   **not** revoke the default `anon` grants on the `public` schema, or the adapter reads nothing —
   and leaving them is exactly why the anon key must never carry a `NEXT_PUBLIC_` prefix (AC-7).
3. **The runtime opens no Postgres connection.** `@supabase/supabase-js` speaks HTTP to PostgREST. It
   needs `SUPABASE_URL` and a key and **no connection string at all** — which is the first half of
   `01-story.md` `Q-3`'s answer, and the reason `DATABASE_URL` leaves the project (1.6).
4. **The `window` guard is a runtime refusal, not a control.** It is the same three lines
   `src/lib/auth/supabase.ts` carries and for the same reason: lint and D12 are the controls, and
   both live in files the same pull request can edit (MD-33).
5. **`Database` is imported from the committed generated types**, never fetched. AC-8.

### 1.4 Four operations become Postgres functions, because PostgREST has no transaction

**This is the decision that has no precedent in the repository, so it is argued rather than
asserted.** PostgREST wraps *one* request in *one* transaction. There is no client-side `BEGIN`. The
mock relies on the opposite: `mock/seats.ts:78-84` demotes the primary device and clears
`occupantId` with no `await` between them, and its own comment says why — *"a seat that is vacant
while a device still points at it as PRIMARY must not be observable — that state is INV-05 false."*
Two PostgREST calls make it observable, on the real database, under concurrency, in production.

The instrument is a `plpgsql` function in the `public` schema, invoked with `.rpc()`. PostgREST runs
it in one transaction, and `supabase gen types typescript` types it into `Database['public']['Functions']`
so `.rpc()` stays type-checked (verified against `@supabase/postgrest-js` 2.112.4 `dist/index.d.mts:5262`).

| Seam function | Why one statement is not enough | RPC |
|---|---|---|
| `releaseSeatOccupant(seatId)` | INV-06 downgrades a device while INV-01 clears the seat, and `downgradedDeviceId` must be read *before* the trigger fires or it cannot be reported at all | `release_seat_occupant(p_seat_id text)` |
| `designatePrimaryDevice(deviceId)` | the incumbent must be demoted and the new device promoted; INV-04's partial unique index refuses the intermediate state where both are `PRIMARY`, so the order is not a preference | `designate_primary_device(p_device_id text)` |
| `deleteRoom(id)` | `seatsDeleted` and `devicesDetached` are counted from rows the same statement destroys, and INV-06's downgrade for devices on those seats is not covered by any trigger — the `Seat` trigger fires on `UPDATE OF occupantId`, not on `DELETE` | `delete_room(p_room_id text)` |
| `deleteMember(id)` / `deleteGroup(id)` | INV-12 and AC-12 read the blocking references and then delete; two round trips is a time-of-check-to-time-of-use window in which the last blocker disappears and the refusal is wrong | `delete_member(p_member_id text)`, `delete_group(p_group_id text)` |

Each returns a single `jsonb` row whose shape is the outcome union in `types.ts`, so the adapter
narrows rather than re-derives. Example, and the pattern every other one follows:

```sql
-- returns: {"released": true, "seat": {...}, "downgradedDeviceId": "dev-01"|null}
--       or {"released": false, "reason": "SEAT_NOT_FOUND"|"SEAT_NOT_OCCUPIED"}
CREATE FUNCTION public.release_seat_occupant(p_seat_id text) RETURNS jsonb AS $$
DECLARE
  v_seat       "Seat"%ROWTYPE;
  v_downgraded text;
BEGIN
  SELECT * INTO v_seat FROM "Seat" WHERE "id" = p_seat_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('released', false, 'reason', 'SEAT_NOT_FOUND'); END IF;
  IF v_seat."occupantId" IS NULL THEN
    RETURN jsonb_build_object('released', false, 'reason', 'SEAT_NOT_OCCUPIED');
  END IF;

  SELECT "id" INTO v_downgraded FROM "Device"
   WHERE "seatId" = p_seat_id AND "rank" = 'PRIMARY';

  UPDATE "Seat" SET "occupantId" = NULL WHERE "id" = p_seat_id;  -- INV-06 trigger fires here

  RETURN jsonb_build_object(
    'released', true,
    'seat', (SELECT to_jsonb(s) FROM "Seat" s WHERE s."id" = p_seat_id),
    'downgradedDeviceId', v_downgraded
  );
END;
$$ LANGUAGE plpgsql;
```

**`FOR UPDATE` is not decoration.** It is what makes `assignSeatOccupant`'s INV-01 check and
`deleteMember`'s INV-12 check hold under two concurrent callers, which is the whole reason these are
functions rather than pairs of requests.

**Everything not in the table above stays a plain PostgREST call.** `listRooms`, `getSeat`,
`createRoom`, `updateMember`, `assignDeviceToSeat`, `unassignDevice` and the rest are one statement
each and gain nothing from an RPC. Adding one anyway is a review finding: a function is a second
place the logic lives and it is invisible to a reader of the TypeScript.

### 1.5 Error mapping — SQLSTATE, never message text

`PostgrestError.code` carries the Postgres SQLSTATE (verified, `@supabase/postgrest-js` 2.112.4
`dist/index.d.mts:26-29`). Every refusal in `types.ts` maps from a code. **No adapter may match on
`error.message`** — the text is a Postgres locale string and matching it is a test that passes until
the day it does not.

| SQLSTATE | Raised by | Maps to |
|---|---|---|
| `23505` unique_violation on `Room_code_key` | insert/update `Room` | `{ created: false, reason: "DUPLICATE_CODE" }` |
| `23505` on `Member_email_key` | insert/update `Member` | `DUPLICATE_EMAIL` |
| `23505` on `Device_assetTag_key` | insert/update `Device` | `DUPLICATE_ASSET_TAG` |
| `23505` on `one_primary_device_per_seat` | any write making a second `PRIMARY` | **never surfaces as a reason code.** INV-04 is unreachable through the seam by construction; if it is raised, the write path is wrong and the error propagates. RULE-07. |
| `INV05` | the INV-05 constraint trigger on `Device` | `PRIMARY_OWNER_MUST_BE_OCCUPANT` |
| `23503` foreign_key_violation | insert/update naming a missing row | the `*_NOT_FOUND` arm for the column named in `error.details` |

**The trigger raises with an explicit SQLSTATE and this is why.** `RAISE EXCEPTION` defaults to
`P0001` for everything, which makes INV-05 indistinguishable from any other raise in any other
function. `INV05` is a legal user-defined SQLSTATE — Postgres reserves classes beginning with `5`–`9`
and `I`–`Z` for exactly this. The migration in section 4 writes it as
`RAISE EXCEPTION '...' USING ERRCODE = 'INV05'`.

The constraint index names above (`Room_code_key`, `Member_email_key`, `Device_assetTag_key`) are
fixed by the migration in section 4 and are named here because the adapter reads them out of
`error.details`. A migration that names them differently silently breaks every duplicate refusal.

### 1.6 `src/lib/data/index.ts` — the switch

Exactly four edits. Nothing else in the file changes.

```ts
export type DataSource = "mock" | "supabase";

export function resolveDataSource(raw: string | undefined): DataSource {
  if (raw === undefined || raw === "") return "supabase";   // was: "mock"
  if (raw === "mock" || raw === "supabase") return raw;
  throw new Error(`DATA_SOURCE must be "mock" or "supabase", received ${JSON.stringify(raw)}`);
}

const useSupabase = DATA_SOURCE === "supabase";
// ...and the eight bindings read from ./supabase/* instead of ./prisma/*
```

`resolveDataSource`'s signature is unchanged — same parameter, same arity, same return type name.
That is what keeps this out of §Sizing's second XL clause. The **default flips**, which is ADR-007
clause 7 and AC-1, and the unrecognised-value throw stays a throw, which is the property the file's
own comment calls the failure it refuses to have.

**The file's header comment names `prisma/**` and `prisma/seed.ts` as the lint rule's exception list.
Rewrite it against section 5's actual list or it is false the moment it is committed.**

### 1.7 `scripts/seed.ts` — ADR-007 OQ-3, transcribed

`prisma/seed.ts` is deleted. `scripts/seed.ts` replaces it, run by
`pnpm db:seed` → `node --env-file-if-exists=.env.local node_modules/tsx/dist/cli.mjs scripts/seed.ts`.

```ts
// Imports the SAME fixtures the mock reads. `.ai/standards/data-model.md` §Seeding.
import { accounts, devices, groups, members, ports, requests, rooms, seats } from "../src/lib/data/fixtures";
```

Five rules, all of them from ADR-007 and none of them this stage's invention:

1. **It calls the adapter modules under `src/lib/data/supabase/` directly, never `src/lib/data/`
   itself.** ADR-007 OQ-3 states it and states why: RULE-02 makes the seam entry point the single
   authorization point, and a script with no session either gets refused or needs a synthetic
   session. **This is a declared exception, so review reads it as one rather than as an R4 breach.**
2. **Writes are upserts keyed on the fixture `id`.** AC-12's second clause — running it twice changes
   nothing and fails nothing.
3. **Insert order is parents before children:** `groups → members → accounts → rooms → seats → ports
   → devices → requests`. `prisma/seed.ts:14-15` already records this order; it is kept.
4. **Devices are written in two passes.** Every device lands `rank = 'SECONDARY'` first, then the two
   fixture primaries are promoted after their seats have occupants. A single-pass insert of
   `dev-01` as `PRIMARY` fires the INV-05 constraint trigger against a seat that has no occupant yet,
   and the seed fails on a fixture set that is valid. This is the one ordering the draft did not have,
   because the draft was never runnable.
5. **It refuses `NODE_ENV=production`, writes nothing, and exits non-zero.** AC-13. The refusal is the
   first statement in the file, before any client is constructed.

It creates the three `auth.users` rows with `supabase.auth.admin.createUser({ email, password,
email_confirm: true })` using the service-role key — verified against `@supabase/auth-js` 2.112.4
`GoTrueAdminApi.d.ts:332`, `createUser(attributes: AdminUserAttributes): Promise<UserResponse>` — and
writes the returned `id` into `Account.auth_user_id`. Passwords come from `.env.local`. **This is the
one file in the repository permitted to name `SUPABASE_SERVICE_ROLE_KEY`.**

### 1.8 Which URL the migration needs — `01-story.md` `Q-3`, answered

Verified against the Supabase CLI reference (`supabase db push`, `supabase gen types`,
`supabase db reset`) and the local-development guide, 2026-08-26, not from memory.

- **The tool is the Supabase CLI, installed as a devDependency**, not globally. The guide is explicit:
  *"Project dependency with npm, pnpm, or yarn installs the CLI into a single project (there is no
  global supabase command with this method). Run it through your package runner."* Add `supabase` to
  `devDependencies` and run `pnpm supabase <command>`. **The bare `supabase` package is the CLI and
  not an SDK, so it does not fail D12** — `scripts/check-docs.mjs:664-665` says so in terms and
  `scripts/tests/check-docs.test.mjs:394` is the test.
- **`DIRECT_URL` is the one connection string this project still needs, and `DATABASE_URL` leaves
  entirely.** `supabase db push` takes either `--linked` (a linked project plus a stored password) or
  `--db-url <string>`. `--db-url "$DIRECT_URL"` is the form this project uses: it keeps the credential
  in `.env.local` beside the three that are already there, and it writes no `supabase/.temp/` state
  and no OS-keychain entry into a three-worktree arrangement. Port 5432, no `pgbouncer` parameter —
  the pooler cannot hold the session state a migration needs, which is a property of Supabase's
  pooler and survives Prisma's departure unchanged. `DATABASE_URL` was the *runtime* connection and
  the runtime now speaks HTTP (1.3), so nothing reads it.
  **`TODO(verify):` confirm `--db-url` against the installed CLI with `pnpm supabase db push --help`
  before running it.** The reference documents the flag as *"Pushes to a self-hosted database"*; a
  hosted project's direct connection string is an ordinary Postgres URL and should be accepted, and
  that sentence is close enough to a caveat to be worth one command. If it refuses, the fallback is
  `supabase link --project-ref <ref>` then `supabase db push --linked`, and `supabase/.temp/` joins
  `.gitignore`.
- **Type generation needs Docker, and `.ai/standards/integrations.md` §"Docker is optional" is about
  to be wrong.** ADR-007 OQ-2's answer is `supabase db reset` against `supabase/migrations/` followed
  by `supabase gen types typescript --local`; `--local` is the CLI's own Postgres stack and the guide
  states *"That stack runs in Docker containers, so you need a container runtime installed first."*
  This ticket does not change that standard — `D-1` routes it.

## 2. Permission model

**No `ROLE_RANK` gate is added, removed or changed. `src/lib/auth/permissions.ts` is not in
`allowed_paths`.**

`01-story.md` §Permissions is correct and this stage confirms it against the tree rather than
restating it: there is no session, no `Member.role` read at request time, and no rank to compare, so
the application is ungated before this ticket and ungated after it. ADR-007's affected-documents
table does not name `permissions.ts`, and nothing here gives a role a new verb.

**Three security facts that are not permissions, stated because this is the section a reviewer reads
when asking whether the change is safe.**

| Fact | Where it is held | What breaks it |
|---|---|---|
| RULE-02 has lost its compiler backstop | `eslint.config.mjs` and check D12, both editable in the pull request that breaches them | nothing automatic. MD-33. R4 is load-bearing rather than routine. |
| RLS stays off on one clause | ADR-007 §5 rests entirely on §4, server-side clients only | a `@supabase/*` import in a `"use client"` file. AC-7, and ADR-007's own revert condition: RLS becomes **mandatory**, not advisable. |
| The `anon` key is a full-access credential here | the absence of `NEXT_PUBLIC_` on its name — Next inlines only prefixed variables into the browser bundle | renaming it, or reading it into a client component. 1.3 note 2. |

**The seed's service-role key is the one privilege escalation in this ticket and it is bounded by
three things**: it is named in `scripts/seed.ts` and nowhere else, the script refuses `NODE_ENV=production`
(AC-13), and `scripts/**` is outside the Next build graph so it cannot reach a bundle.

**PermissionGate is untouched.** No control appears or disappears, so there is no UI affordance to
gate and no denial to enumerate.

## 3. Seam impact

**No function in `src/lib/data/` changes its name, its arity, its parameters or its return type. The
implementation behind eight of them is replaced wholesale.**

| Change | Detail |
|---|---|
| `src/lib/data/prisma/**` | **deleted**, nine modules |
| `src/lib/data/supabase/**` | **created**, nine modules, the map in 1.2 |
| `src/lib/data/index.ts` | the switch — four edits, 1.6 |
| `src/lib/data/types.ts` | **comment text only**, three lines. No type changes. |
| `src/lib/data/derive.ts` | unchanged |
| `src/lib/data/mock/**` | **comment text only**. Five modules cite `prisma/schema.prisma:NNN` for a file this ticket deletes. **No mock behaviour changes** — AC-12 requires both modes to render identically and the unit suite is what proves it. |
| `src/lib/data/fixtures.ts` | **comment text only**, line 1 names `prisma/seed.ts` |

**`tests/unit/seam-parity.test.ts` is the gate on all of it and it must be edited, not left alone.**
It imports the eight `@/lib/data/prisma/*` modules by name (lines 22-29) and its `PAIRS` table is
built from them. Repoint every import and every table entry at `@/lib/data/supabase/*`. **Its
`eslint.config.mjs` exemption moves with it** — the file is currently exempted so it may name Prisma,
and after this ticket it must be exempted to name the data adapter directory instead (section 5,
and 1.2's warning about `deriveSeatStatus`).

**A new function is not added to the seam by this ticket.** The template's clause about a new function
appearing on both sides does not apply, and adding one is a review finding rather than a convenience.

## 4. Schema delta

**Not `none`. `ADR-007` is the approved decision — `.ai/registry/decisions/ADR-007-supabase-as-the-data-client.md`,
`ACCEPTED — 2026-08-25, by the operator`, and `ticket.yaml` carries `adr: "ADR-007"`.**

**Applying it is a human act under RULE-09 and this design does not approve a schema.** Drafting is
design work; the signature is the operator's, on the pull request, through CODEOWNERS. `ticket.yaml`'s
header instructs DESIGN not to raise that as a blocker and this stage does not — it is the one stop
inside the ticket and it is expected.

### 4.1 One migration file, `supabase/migrations/<timestamp>_init.sql`

Generated by `pnpm supabase migration new init`, which fixes the `<timestamp>_<name>.sql` pattern.
It is the whole schema: `prisma/schema.prisma` and `prisma/constraints.draft.sql` collapse into it
(ADR-007 clause 6).

**Identifiers keep the draft's casing.** `"Room"`, `"Seat"`, `"gridWidth"`, `"occupantId"` — quoted,
PascalCase tables, camelCase columns, exactly as `prisma/schema.prisma` declares them and exactly as
`src/lib/data/types.ts` names its fields. The cost is quoting every identifier in every statement
forever. The benefit is that the adapter maps rows onto DTOs with no renaming layer, which is what
ADR-007 §1's *module-for-module, against the same DTOs* means in practice, and what AC-5 needs. A
snake_case migration would be more idiomatic Postgres and would put a rename table in nine modules.

**Ids are `text`, defaulting to `gen_random_uuid()::text`**, and the adapter mints explicitly with
`crypto.randomUUID()` as the mock does (`mock/rooms.ts:34`). The DTO says `id: string` and the
fixtures use readable ids like `room-a`; a `uuid` column would refuse them.

| Object | Content |
|---|---|
| enums | `"Role"`, `"DeviceRank"`, `"RequestKind"`, `"RequestState"` — the four in `prisma/schema.prisma`, same members |
| tables | `"Room"` `"Seat"` `"NetworkPort"` `"Group"` `"Member"` `"Device"` `"SeatRequest"` `"Account"` |
| `Account.auth_user_id` | `uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL`, **nullable** — ADR-007 *Implementation decisions*, verbatim. The one snake_case name in the schema, kept because the ADR writes it that way. |
| unique | `Room_code_key`, `Seat_code_key`, `NetworkPort_portCode_key`, `Member_email_key`, `Device_assetTag_key`, `Account_memberId_key`, `Account_email_key` — **the names are read by 1.5 and are not free to change** |
| indexes | `Seat(roomId)`, `Seat(occupantId)`, `NetworkPort(seatId)`, `Group(parentId)`, `Member(groupId)`, `Device(ownerId)`, `Device(seatId)`, `SeatRequest(requesterId)`, `SeatRequest(state)` |

### 4.2 The delete rules, invariant by invariant

**This is where a first migration silently omits an invariant, so every rule is stated with the
invariant it holds rather than copied from the draft.**

| Foreign key | Rule | Invariant |
|---|---|---|
| `Seat.roomId → Room` | `ON DELETE CASCADE` | INV-11, and the draft says the cascade is the decision |
| `NetworkPort.seatId → Seat` | `ON DELETE CASCADE` | INV-11's chain |
| `Device.seatId → Seat` | `ON DELETE SET NULL` | INV-07 — a device survives its seat, unassigned |
| `Seat.occupantId → Member` | **`ON DELETE RESTRICT`** | **INV-12, and this is a change from the draft, which says `SetNull`.** ADR-005 requires the deletion to be *refused, not cascaded*. With `SET NULL` the database would silently vacate every seat underneath a refusal the seam is meant to give — `01-story.md` names this as the way INV-12 becomes unenforceable at the layer that matters. `RESTRICT` never fires on a legal path, because `deleteMember` only proceeds when `getMemberReferences` is empty; it fires exactly when something bypassed the seam. |
| `Device.ownerId → Member` | **`ON DELETE RESTRICT`** | INV-12's second half, same reasoning |
| `Account.memberId → Member` | `ON DELETE CASCADE` | ADR-003 — the login dies with the person. Unchanged from the draft, which ADR-007 calls *"already right"*. |
| `Account.createdById → Member` | `ON DELETE SET NULL` | INV-08 keeps the record of who created an account; losing the creator must not delete the account |
| `Group.parentId → Group` | `ON DELETE SET NULL` | children survive as top-level; `deleteGroup` refuses `HAS_CHILDREN` before this can fire |
| `Member.groupId → Group` | `ON DELETE SET NULL` | `membersDetached` in `DeleteGroupOutcome` |
| `SeatRequest.requesterId → Member` | `ON DELETE CASCADE` | draft, unchanged |
| `SeatRequest.seatId → Seat` | `ON DELETE SET NULL` | draft, unchanged |

**INV-02 is held by an absence and the absence is deliberate: there is no unique constraint on
`Seat.occupantId`.** One person occupies several seats — `fixtures.ts` has `mem-admin` on two of them.
A tidy first migration adds that index by reflex and nothing downstream notices until a second seat
is refused.

**INV-07 is held by an absence too: `Device.ownerId` and `Device.seatId` are nullable.** `NOT NULL` is
the tidier-looking choice and it makes `dev-05` — the documented unassigned-inventory case —
unrepresentable.

**INV-03 is held by an absence: `"Seat"` has no `status` column, and no `CHECK`, no view and no
generated column produces one.** The invariant's own note names this ticket twice.

### 4.3 The three constraints, together — ADR-007 OQ-5

```sql
-- INV-04: a seat has at most one primary device. Partial, because SECONDARY is unbounded per seat.
CREATE UNIQUE INDEX one_primary_device_per_seat
  ON "Device" ("seatId") WHERE "rank" = 'PRIMARY';

-- INV-05: a seat's primary device is owned by that seat's occupant.
-- DEFERRABLE INITIALLY IMMEDIATE per ADR-007 OQ-5: it checks at statement end, so a single
-- statement that fixes both sides is legal, and a caller that needs a two-statement window can
-- SET CONSTRAINTS ... DEFERRED inside one of section 1.4's functions.
CREATE FUNCTION assert_primary_device_owned_by_occupant() RETURNS TRIGGER AS $$
DECLARE seat_occupant text;
BEGIN
  IF NEW."rank" <> 'PRIMARY' OR NEW."seatId" IS NULL THEN RETURN NEW; END IF;
  SELECT "occupantId" INTO seat_occupant FROM "Seat" WHERE "id" = NEW."seatId";
  IF seat_occupant IS NULL OR NEW."ownerId" IS DISTINCT FROM seat_occupant THEN
    RAISE EXCEPTION 'INV-05: primary device % must be owned by the occupant of seat %',
      NEW."id", NEW."seatId" USING ERRCODE = 'INV05';   -- 1.5
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER device_primary_owner_check
  AFTER INSERT OR UPDATE ON "Device"
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION assert_primary_device_owned_by_occupant();

-- INV-06: occupant exit downgrades the seat's primary device. This closes the Seat side of INV-05,
-- which a Device-only trigger leaves open — the device can stop being owned by the occupant because
-- the OCCUPANT changed, and nothing on Device fires. prisma/constraints.draft.sql recorded the gap
-- and left this unwritten pending ADR-007 OQ-5.
CREATE FUNCTION downgrade_primary_on_occupant_exit() RETURNS TRIGGER AS $$
BEGIN
  IF OLD."occupantId" IS NOT NULL AND NEW."occupantId" IS DISTINCT FROM OLD."occupantId" THEN
    UPDATE "Device" SET "rank" = 'SECONDARY'
     WHERE "seatId" = NEW."id" AND "rank" = 'PRIMARY';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER seat_occupant_exit_downgrade
  AFTER UPDATE OF "occupantId" ON "Seat"
  FOR EACH ROW EXECUTE FUNCTION downgrade_primary_on_occupant_exit();
```

**The draft's `BEFORE INSERT OR UPDATE` becomes `AFTER … CONSTRAINT TRIGGER`.** `CREATE CONSTRAINT
TRIGGER` is only legal `AFTER`, and ADR-007 OQ-5 asks for a constraint trigger by name. That is the
whole of the difference from `prisma/constraints.draft.sql`.

**INV-10 does not enter and is not added back.** `.ai/registry/features.md:152` and `ticket.yaml`'s
header both instruct it; both are registry plane. It stays enforced at the seam, as debt.
`01-story.md` `Q-5` records that compliance is not agreement, and this stage does not reopen it.

**The migration must not `REVOKE` the default `public`-schema grants on `anon`.** 1.3 note 2. It is
the one line whose *absence* the adapter depends on, and it will not be noticed by reading the
migration for what it contains.

## 5. allowed_paths

Enumerated, not globbed for convenience. Written back into `ticket.yaml`.

```yaml
allowed_paths:
  - "supabase/**"
  - "src/lib/data/index.ts"
  - "src/lib/data/types.ts"
  - "src/lib/data/fixtures.ts"
  - "src/lib/data/mock/**"
  - "src/lib/data/prisma/**"
  - "src/lib/data/supabase/**"
  - "src/lib/auth/supabase.ts"
  - "src/app/(app)/seats/seats-manager.tsx"
  - "tests/unit/seam-parity.test.ts"
  - "scripts/seed.ts"
  - "scripts/check-docs.mjs"
  - "scripts/tests/check-docs.test.mjs"
  - "prisma/**"
  - "prisma.config.ts"
  - "eslint.config.mjs"
  - "vitest.config.mts"
  - "package.json"
  - "pnpm-lock.yaml"
  - ".env.example"
  - ".gitignore"
  - ".github/CODEOWNERS"
  - ".github/workflows/verify.yml"
  - "docker/Dockerfile"
  - "docker/docker-compose.yml"
```

`scripts/check-allowed-paths.mjs` matches **every** changed path including deletions, so `prisma/**`,
`prisma.config.ts` and `src/lib/data/prisma/**` are on the list in order to be removed. The ticket's
own directory is exempt in the checker and is deliberately not listed.

**Why each entry that is not obviously the implementation is on the list:**

| Path | Why |
|---|---|
| `src/lib/auth/supabase.ts` | **`ticket.yaml` and `.ai/registry/features.md:152` both require it.** Its header comment says *"NO FILE IN THIS REPOSITORY MAY NAME THE CORE SUPABASE CLIENT PACKAGE"* and ADR-007 reverses that. RULE-03 refuses the one edit that has to happen if this path is left off. **The code is untouched — comment text only.** |
| `src/lib/data/mock/**`, `fixtures.ts`, `types.ts` | comment text only. Twenty-seven citations of `prisma/schema.prisma` and `prisma/seed.ts` across the seam name files this ticket deletes. **No behaviour, no type, no fixture value changes**, and AC-12 plus the unit suite is what holds that. |
| `src/app/(app)/seats/seats-manager.tsx` | comment only, lines 157-158, named by ADR-007 §Consequences |
| `scripts/check-docs.mjs`, `scripts/tests/check-docs.test.mjs` | D12 becomes the two-package map, ADR-007 §8. MD-16's ten failing tests are here and are rewritten here — verified: `node --test scripts/tests/check-docs.test.mjs` fails exactly ten, all D12. |
| `vitest.config.mts` | `test.env = { DATA_SOURCE: "mock" }`. AC-2, and section 6.3. |
| `.github/workflows/verify.yml` | AC-9's regenerate-and-diff job |
| `.github/CODEOWNERS` | `/prisma/` leaves; **`/supabase/` joins**, which is what puts RULE-09's human signature on the migration mechanically rather than by memory |
| `.gitignore` | `supabase/.temp/`, `supabase/.branches/` |
| `docker/**` | `docker-compose.yml:19-21` offers `prisma` as a `DATA_SOURCE` value; the Dockerfile comment reasons about Prisma 7's Node floor |

**Not on the list, on purpose:**

- `src/lib/auth/permissions.ts`, `src/lib/auth/self-signup.ts` — section 2.
- `src/app/page.tsx` — 1.1. It renders `{DATA_SOURCE}`; AC-3 needs no edit here.
- `src/lib/validation/**` and `src/app/(app)/members/page.tsx` — nine comment citations of
  `prisma/schema.prisma` survive this ticket as stale. Comments only, no check reads them, and
  widening `allowed_paths` across the validation layer to fix prose is a worse trade than the stale
  prose. `D-3`.
- `.ai/registry/**` and `.ai/standards/**` — `D-1`. They need changing and this ticket may not.
- `playwright.config.ts` — it already pins `DATA_SOURCE: "mock"` on the web server, which is what
  keeps the e2e suite off the single Supabase project. `01-story.md` `Q-2` owns that question and it
  is out of scope here.

## 6. Testability contract

**No `data-testid` is added, removed or renamed by this ticket.** The table is the complete channel
RULE-05 gives QA, so it enumerates the existing selectors each AC needs rather than saying "unchanged".

**Row selectors are templated by a business key, not by an id.** The three patterns QA needs:
`rooms-row-${room.code}-*`, `members-row-${member.email}-*`, `devices-row-${device.assetTag}-*`,
`seats-row-${seat.code}-*`, `groups-row-${path}-*`. Fixture values are in `src/lib/data/fixtures.ts`
and are the same in both modes — `ROOM-A`, `SEAT-A-01`, `ada@example.internal`, `AST-0001`.

| data-testid | Element | Used by |
|---|---|---|
| `home-page` | the home page main element | AC-1, AC-3 |
| `home-data-source` | the span rendering the active adapter name — **exactly `mock` or `supabase`, never `prisma`** | AC-3 |
| `home-enter-app` | link into the application | AC-1 |
| `rooms-page` | the rooms page | AC-1, AC-12 |
| `rooms-table` / `rooms-empty` | the rooms table, and its empty state | AC-12 |
| `rooms-row-ROOM-A-code`, `-name`, `-grid`, `-edit`, `-delete` | one room row's cells and controls | AC-1, AC-12 |
| `rooms-create-open` | opens the create-room dialog | AC-1 |
| `room-create-dialog`, `room-create-name`, `room-create-code`, `room-create-grid-width`, `room-create-grid-height`, `room-create-submit`, `room-create-cancel` | the create-room dialog and its fields | AC-1 — this is the write whose survival across a restart is the criterion |
| `room-delete-dialog`, `room-delete-seat-count`, `room-delete-confirm`, `room-delete-cancel` | the INV-11 confirmation, which names the seats that will be lost | AC-11 |
| `seats-page`, `seats-table` | the seats page | AC-12 |
| `seats-row-SEAT-A-01-code`, `-room`, `-ports`, `-occupant`, `-status`, `-assign`, `-release` | one seat row; `-status` is the INV-03 derived value and is never a stored column | AC-11, AC-12 |
| `seat-assign-dialog`, `seat-assign-seat`, `seat-assign-occupant`, `seat-assign-submit` | assigning an occupant | AC-11 |
| `seats-action-error` | the refusal surface on the seats page | AC-11 |
| `members-page`, `members-table` | the members page | AC-12 |
| `members-row-ada@example.internal-name`, `-email`, `-role`, `-group`, `-seats`, `-signin`, `-edit`, `-assign`, `-delete` | one member row | AC-12 |
| `member-delete-refused-dialog`, `member-delete-refused-seats`, `member-delete-refused-devices`, `member-delete-refused-message`, `member-delete-refused-dismiss` | INV-12's refusal, naming both blockers | AC-11 |
| `devices-page`, `devices-table` | the devices page | AC-12 |
| `devices-row-AST-0001-tag`, `-model`, `-owner`, `-seat`, `-rank`, `-occupant`, `-assign`, `-unassign`, `-primary`, `-edit`, `-delete` | one device row; `-rank` is where the INV-06 downgrade becomes visible | AC-11, AC-12 |
| `devices-action-error` | the refusal surface on the devices page | AC-11 |
| `groups-page`, `groups-table`, `groups-row-Engineering-name`, `-parent`, `-children` | the groups page | AC-12 |
| `app-nav`, `nav-rooms`, `nav-seats`, `nav-members`, `nav-devices`, `nav-groups`, `nav-requests` | navigation between the surfaces AC-12 compares | AC-12 |
| `layout-designer-page`, `layout-room-room-a`, `layout-seat-seat-a-01` | the layout designer | AC-12 |

### 6.1 The four criteria that are not testable through a selector

RULE-05 gives QA no `src/**` access, so these are stated here as the commands and files QA runs against.

| AC | How it is observed |
|---|---|
| AC-4 | `package.json` holds neither `prisma` nor `@prisma/client` in any dependency field; `prisma/`, `src/lib/data/prisma/`, `prisma.config.ts` are absent; `db:push` and `db:studio` are absent from `scripts`; `grep -r "@prisma/client" src` returns nothing |
| AC-6 | `pnpm lint` exits 0 and `node scripts/check-docs.mjs` reports no D12 finding, on the tree this ticket produces |
| AC-7 | no file matched by `grep -rl "use client" src` names `@supabase/`; no `NEXT_PUBLIC_` name in `.env.example` or in `src/**` carries a Supabase key |
| AC-8 | `pnpm typecheck` exits 0 with no `SUPABASE_*` variable set and no network |

### 6.2 AC-9 — the CI job that stops the committed types drifting

A step in `.github/workflows/verify.yml`: start the CLI's local stack, `supabase db reset` against
`supabase/migrations/`, `supabase gen types typescript --local > /tmp/types.ts`, then
`diff supabase/types.generated.ts /tmp/types.ts`. **A difference fails the run; it must not rewrite
the file.** ADR-007 OQ-2 says why in one line: generating from the cloud project would make the
committed types describe whatever that project currently holds, and the migrations are meant to be
the only source. Requires Docker on the runner, which `ubuntu-latest` has.

### 6.3 AC-2 — how `DATA_SOURCE=mock` gets set, in one place

`vitest.config.mts` gains `test: { env: { DATA_SOURCE: "mock" } }` — verified against vitest 4.1.10,
`reporters.d.DtoKVV2s.d.ts:3053`, *"Custom environment variables assigned to `process.env` before
running tests."* One line, no test file changes, and it cannot be forgotten by a new test.
`.ai/standards/testing-standards.md` requires every unit and component test to set it *deliberately*;
this is that declaration, made once where a reader of the config sees it, rather than pasted into
sixteen files where one omission reaches for a network and fails as a connection error.

Playwright already pins it on its web server (`playwright.config.ts:36`) and this ticket does not
change that.

## 7. Rejected alternatives

**A. Keep the seam's multi-step operations as two PostgREST calls and hold INV-05 and INV-06 in
TypeScript, as the mock does.** Genuinely plausible: it is what the mock already does, it needs no
`plpgsql`, and every line stays visible to a reader of the TypeScript — which is a real cost of
section 1.4 and `prisma/constraints.draft.sql` names it (*"a trigger is invisible to a reader of the
application code"*). **Rejected because the mock's own comment is the argument against it.**
`mock/seats.ts:78-84` demotes then clears *"with no `await` between the first write and the last"*,
precisely so the INV-05-false state is unobservable. Over PostgREST there is always an await between
them, and there is no client-side `BEGIN` to remove it. The intermediate state stops being a
theoretical window and becomes the wire protocol. `.ai/registry/invariants.md` requires the database
to be the backstop, and a two-request write path makes the backstop the thing that fires.

**B. Snake_case the migration and map column names in the adapter.** Idiomatic Postgres, and it would
stop this project quoting every identifier in every statement for the rest of its life. **Rejected on
ADR-007 §1**, which requires the replacement to be module-for-module *against the same DTOs*. A rename
layer in nine modules is exactly the propagation RULE-04 exists to stop: the mapping table becomes a
place a name can be wrong, `types.ts` and the schema stop being readable against each other, and the
generated types stop matching the DTOs they are meant to describe. The cost of quoting is paid in
SQL that a human reviews once per migration; the cost of a mapping layer is paid on every read.

**C. Split the ticket — schema and migration first, adapter cutover second.** The obvious answer to
`size: L`, and `L`'s prescribed handling. **Rejected because `.ai/registry/features.md:152` forbids
it** and states a reason the sizing table cannot see: D12 is red from the first commit until it is
rewritten as a two-package map, so a split places a red pull request in the middle deliberately.
`.ai/01-operating-model.md` §Sizing now carries that exception by name. Registry is RULE-01 and
outranks a handling default.

**D. Generate the types from the linked cloud project rather than from a local reset.** One command,
no Docker, no CLI stack. **Rejected by ADR-007 OQ-2's answer**, which went further than its own
recommendation for a reason worth repeating: types generated from the cloud describe whatever that
project currently holds, which is not necessarily what the migrations say. With one Supabase project
(`ticket.yaml` precondition 2) that is not a hypothetical — a hand-edit in the dashboard would
propagate into the committed types and nothing would catch it. Generating from a local reset makes
the migrations the only source and the CI diff is what holds them to it. The price is Docker, and
`D-1` records that it contradicts a standard.

**E. Keep `prisma` as a dev-only tool for introspection.** **Rejected by the operator on 2026-08-26**,
ADR-007 OQ-1, in their own words: *there is no query to port, and keeping it rebuilds exactly the
two-owners problem.* Recorded here rather than re-argued.

## Open questions

`D-1` does not block IN_PROGRESS and does block a green pull request. `D-2` and `D-3` block nothing.

### D-1 — BLOCKS A GREEN `verify`, NOT THIS STAGE — deleting `prisma/` turns D6 red in six human-owned documents

**Routed to:** the steward. **Blocks:** DESIGN, no. IN_PROGRESS, no. A green `verify` on this ticket's
pull request, **yes**.

Twelve path references in `.ai/registry/**` and `.ai/standards/**` resolve to files this ticket
deletes. Verified by running D6's own `pathCandidates` and existence test over the governed corpus
against this ticket's deletion set, not by reading:

| Document | Reference |
|---|---|
| `.ai/00-charter.md` | `prisma/` |
| `.ai/registry/features.md` | `prisma/schema.prisma`, `prisma/constraints.draft.sql`, `src/lib/data/prisma/` |
| `.ai/standards/architecture.md` | `prisma/**`, `src/lib/data/prisma/**` |
| `.ai/standards/data-model.md` | `prisma/schema.prisma`, `prisma/seed.ts` |
| `.ai/standards/git-conventions.md` | `prisma/` |
| `.ai/standards/integrations.md` | `prisma/schema.prisma`, `prisma/constraints.draft.sql` |
| `.ai/standards/session-model.md` | `src/lib/data/prisma/client.ts` |

`.ai/registry/decisions/**` is exempt from D6 (MD-38), which is why ADR-002, ADR-006 and ADR-007 are
not on the list and why this was not visible when ADR-007's affected-documents table was written.
`.github/workflows/verify.yml:43-45` runs `docs-audit` whenever a pull request touches `.ai/` or
`.claude/`; this ticket's pull request carries `.ai/board/tickets/SYS-02/**`, so it runs.

**Two further contradictions in the same corpus, found while verifying the above.** Neither is a D6
finding — both are prose that this ticket makes false:

- `.ai/standards/integrations.md` §"Docker is optional" — *"`pnpm dev` and `pnpm verify` need Node
  and … Neither needs a container."* ADR-007 OQ-2's `--local` type generation needs one (1.8).
- `.ai/standards/integrations.md` §"Two connection strings" — the `TODO(verify):` on which reader
  gets which URL. **1.8 answers it**: `DIRECT_URL` for migrations through the CLI, and `DATABASE_URL`
  is not read by anything and leaves the project.

**What this stage did about it: nothing, deliberately.** Both planes are human-only and neither is in
`allowed_paths`. Putting them there would make an agent the author of the registry to keep a checker
green, which is the pressure MD-38 was written about.

### D-2 — OPEN — `size_estimate` still has no value for work that is correctly larger than `M`

**Routed to:** the steward. **Blocks:** nothing.

PR #54 answered half of `01-story.md` `Q-1` on 2026-08-26 — the XL row now reads *with no approved ADR
linked*, so an ADR-approved schema change no longer escalates, and this ticket is `L` rather than
`XL` because of it. **The other half is untouched.** Definition of Ready item 5 still admits only `S`
or `M`, `.ai/templates/ticket.yaml` still comments the field `# S|M`, and a BA facing work that is
honestly larger still has no value to write. SYS-02 reached the gap first; the next ticket with a
non-`none` `schema_delta` reaches it again, and the answer is now a precedent rather than a decision.

`Q-1`'s own recommendation is the fix shape and it is unchanged: a value in `size_estimate` for work
correctly larger than `M`, and a sentence in DoR item 5 saying where such a ticket goes.

### D-3 — OPEN — nine comment citations of `prisma/schema.prisma` survive outside `allowed_paths`

**Routed to:** a follow-up chore. **Blocks:** nothing.

`src/lib/validation/{room,seat,member,group,device}.ts` and `src/app/(app)/members/page.tsx` cite
`prisma/schema.prisma:NNN` in comments for a file this ticket deletes. No check reads `src/**` for
path references, so nothing goes red. Section 5 states the trade: widening `allowed_paths` across the
validation layer to correct prose weakens R1 more than the stale prose costs. The seam's own
twenty-seven citations **are** corrected, because `src/lib/data/**` is the ticket's subject.

## Changelog

- `2026-08-26T09:22:00Z` — design created at DESIGN. Gate PASS. `size: L`, not split, per
  `.ai/registry/features.md:152` and `.ai/01-operating-model.md` §Sizing as amended by PR #54.
  `allowed_paths` enumerated, 25 entries. `01-story.md` `Q-3` answered in 1.8 against the Supabase
  CLI reference and the installed `@supabase/*` types. Three decisions taken that no upstream
  document holds: section 1.4 (four operations become `plpgsql` functions, because PostgREST has no
  multi-statement transaction), section 1.5 (`INV05` as an explicit SQLSTATE, so refusals map from a
  code and never from message text), and section 4.2 (`Seat.occupantId` and `Device.ownerId` become
  `ON DELETE RESTRICT`, against the draft schema's `SetNull`, because INV-12 is *refused, not
  cascaded*). `D-1` raised against the steward: deleting `prisma/` turns D6 red in six human-owned
  documents and ADR-007's affected-documents table does not cover it. Raised by `tech-lead-design`.
  Amended by `tech-lead-design`.
