// Database seed. ADR-007 OQ-3.
//
// It reads the SAME fixture module the mock seam reads (`src/lib/data/fixtures.ts`), so a seeded
// database and `DATA_SOURCE=mock` render identically. If this file held its own copy of the data the
// two modes would drift, and the mock would stop being a faithful stand-in for the thing it stands
// in for. `supabase/seed.sql` is deliberately not used for the same reason — it would be a second
// copy of the fixture data, and the cost accepted is that `supabase db reset` no longer seeds by
// itself.
//
// IT CALLS THE ADAPTER MODULES DIRECTLY, NOT `src/lib/data/`, AND THAT IS A DECLARED EXCEPTION
// RATHER THAN AN R4 BREACH. ADR-007 OQ-3 states it and states why: RULE-02 makes the seam entry
// point the single AUTHORIZATION point, and a script with no session would either be refused there
// or would need a synthetic session, and inventing one is worse than declaring the seed a
// privileged path. `eslint.config.mjs` ignores `scripts/**` entirely, so no exemption entry exists
// or should; this comment is the record.
//
// THIS IS THE ONE FILE IN THE REPOSITORY PERMITTED TO NAME `SUPABASE_SERVICE_ROLE_KEY`. With RLS
// off (ADR-002) that key is simply full read and write on every table. It is bounded by three
// things: it is named here and nowhere else, this script refuses `NODE_ENV=production`, and
// `scripts/**` is outside the Next build graph so it cannot reach a bundle.
//
// Run with `pnpm db:seed`, which loads `.env.local` through Node's `--env-file-if-exists`.

import { createClient } from "@supabase/supabase-js";

import * as devicesAdapter from "../src/lib/data/supabase/devices";
import * as groupsAdapter from "../src/lib/data/supabase/groups";
import * as membersAdapter from "../src/lib/data/supabase/members";
import * as roomsAdapter from "../src/lib/data/supabase/rooms";
import * as seatsAdapter from "../src/lib/data/supabase/seats";
// Imports the SAME fixtures the mock reads. `.ai/standards/data-model.md` §Seeding.
import {
  accounts,
  devices,
  groups,
  members,
  ports,
  requests,
  rooms,
  seats,
} from "../src/lib/data/fixtures";

/**
 * AC-13, and it is the FIRST statement in the file's execution path, before any client is
 * constructed. A guard that runs after a connection is opened is a guard that has already had the
 * chance to be wrong.
 */
function refuseProduction(): void {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "scripts/seed.ts refuses to run with NODE_ENV=production. It writes fixture data and creates " +
        "auth users with the service-role key; neither belongs to a production database."
    );
    process.exit(1);
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is not set. See .env.example; real values live in .env.local.`);
  }
  return value;
}

/**
 * The service-role client, used for the two things the anon client cannot do: create `auth.users`
 * rows through the admin API, and write the tables the adapter modules do not cover — ports,
 * requests and accounts have read-only seam modules or none at all, and a seed has to write them.
 */
function admin() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Every write is an UPSERT KEYED ON THE FIXTURE `id`. AC-12's second clause: running the seed twice
 * changes nothing and fails nothing. That is also why the fixture ids are readable strings and the
 * `id` columns are `text` — a `uuid` column would refuse `room-a`, and a minted id would make the
 * second run a duplicate rather than a no-op.
 */
async function upsert(table: string, rows: object[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await admin().from(table).upsert(rows, { onConflict: "id" });
  if (error !== null) throw new Error(`seeding ${table} failed: ${error.code} ${error.message}`);
}

/**
 * The three fixture accounts become three Supabase auth users, and `Account.auth_user_id` records
 * which. Without this the cutover produces a full database nobody can sign in to — which looks like
 * a successful cutover and is discovered at the first attempt to use it.
 *
 * Verified against @supabase/auth-js 2.112.4 `GoTrueAdminApi.d.ts:332` —
 * `createUser(attributes: AdminUserAttributes): Promise<UserResponse>`.
 *
 * Passwords come from `.env.local`, one variable per account, and there is no default: a seeded
 * login with a password baked into version control is a credential in version control.
 *
 * Idempotent by listing first. `createUser` on an existing address fails, and a seed that fails on
 * its second run fails AC-12.
 */
async function seedAuthUsers(): Promise<Map<string, string>> {
  const client = admin();
  const byEmail = new Map<string, string>();

  const { data: existing, error: listError } = await client.auth.admin.listUsers();
  if (listError !== null) throw listError;
  for (const user of existing.users) {
    if (user.email !== undefined) byEmail.set(user.email, user.id);
  }

  for (const account of accounts) {
    if (byEmail.has(account.email)) continue;
    const password = requiredEnv(passwordVar(account.id));
    const { data, error } = await client.auth.admin.createUser({
      email: account.email,
      password,
      email_confirm: true,
    });
    if (error !== null) throw new Error(`creating auth user ${account.email} failed: ${error.message}`);
    if (data.user !== null) byEmail.set(account.email, data.user.id);
  }

  return byEmail;
}

/** `acc-admin` -> `SEED_PASSWORD_ACC_ADMIN`. Named in `.env.example`. */
function passwordVar(accountId: string): string {
  return `SEED_PASSWORD_${accountId.toUpperCase().replaceAll("-", "_")}`;
}

async function main(): Promise<void> {
  refuseProduction();

  // PARENTS BEFORE CHILDREN. Every foreign key in the first migration points backwards along this
  // order, so no insert can name a row that does not exist yet. `prisma/seed.ts` already recorded
  // this order and it is kept.
  await upsert("Group", groups.map((g) => ({ id: g.id, name: g.name, parentId: g.parentId })));
  await upsert(
    "Member",
    members.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      email: m.email,
      role: m.role,
      groupId: m.groupId,
    }))
  );

  const authUserIds = await seedAuthUsers();
  await upsert(
    "Account",
    accounts.map((a) => ({
      id: a.id,
      memberId: a.memberId,
      email: a.email,
      createdById: a.createdById,
      auth_user_id: authUserIds.get(a.email) ?? null,
    }))
  );

  await upsert(
    "Room",
    rooms.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      gridWidth: r.gridWidth,
      gridHeight: r.gridHeight,
    }))
  );
  await upsert(
    "Seat",
    seats.map((s) => ({
      id: s.id,
      code: s.code,
      roomId: s.roomId,
      gridX: s.gridX,
      gridY: s.gridY,
      gridW: s.gridW,
      gridH: s.gridH,
      occupantId: s.occupantId,
    }))
  );
  await upsert(
    "NetworkPort",
    ports.map((p) => ({ id: p.id, portCode: p.portCode, seatId: p.seatId }))
  );

  // DEVICES IN TWO PASSES, and this is the one ordering the draft did not have because the draft was
  // never runnable. Every device lands SECONDARY first; the two fixture primaries are promoted
  // afterwards, once their seats have occupants. A single-pass insert of `dev-01` as PRIMARY fires
  // the INV-05 constraint trigger against a seat whose occupant has not been written yet, and the
  // seed fails on a fixture set that is valid.
  await upsert(
    "Device",
    devices.map((d) => ({
      id: d.id,
      assetTag: d.assetTag,
      model: d.model,
      ownerId: d.ownerId,
      seatId: d.seatId,
      rank: "SECONDARY" as const,
    }))
  );
  for (const device of devices.filter((d) => d.rank === "PRIMARY")) {
    const outcome = await devicesAdapter.designatePrimaryDevice(device.id);
    if (!outcome.designated) {
      throw new Error(`promoting ${device.id} to PRIMARY failed: ${outcome.reason}`);
    }
  }

  await upsert(
    "SeatRequest",
    requests.map((r) => ({
      id: r.id,
      requesterId: r.requesterId,
      kind: r.kind,
      seatId: r.seatId,
      roomId: r.roomId,
      state: r.state,
    }))
  );

  // Read back through the adapter modules — the same code paths the application uses. A seed that
  // only writes has not shown that what it wrote is reachable.
  const [seededGroups, seededMembers, seededRooms, seededSeats, seededDevices] = await Promise.all([
    groupsAdapter.listGroups(),
    membersAdapter.listMembers(),
    roomsAdapter.listRooms(),
    seatsAdapter.listSeats(),
    devicesAdapter.listDevices(),
  ]);

  console.log("Seeded, read back through src/lib/data/supabase/:");
  console.log(`  groups   ${seededGroups.length}`);
  console.log(`  members  ${seededMembers.length}`);
  console.log(`  accounts ${accounts.length}`);
  console.log(`  rooms    ${seededRooms.length}`);
  console.log(`  seats    ${seededSeats.length}`);
  console.log(`  ports    ${ports.length}`);
  console.log(
    `  devices  ${seededDevices.length} ` +
      `(${seededDevices.filter((d) => d.rank === "PRIMARY").length} primary, ` +
      `${seededDevices.filter((d) => d.seatId === null).length} unassigned — INV-07)`
  );
  console.log(`  requests ${requests.length}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
