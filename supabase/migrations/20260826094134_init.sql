-- SYS-02 — the first migration. ADR-007 clause 6, drafted at 02-design.md section 4.
--
-- NOT APPROVED BY WRITING IT. RULE-09 puts a human signature on every schema change, and that
-- signature is the operator's on this ticket's pull request through CODEOWNERS (`/supabase/`).
-- Drafting is design and implementation work; applying is not. Nothing in this repository applies
-- it — `pnpm supabase db push --db-url "$DIRECT_URL"` is a human's command.
--
-- It is the WHOLE schema. `prisma/schema.prisma` and `prisma/constraints.draft.sql` collapse into
-- this one file, in the language the constraints already had to be written in, and both are deleted
-- by the same ticket. Where this file departs from those two drafts it says so on the line.
--
-- IDENTIFIERS KEEP THE DRAFT'S CASING — quoted, PascalCase tables, camelCase columns — exactly as
-- `src/lib/data/types.ts` names its fields. The cost is quoting every identifier in every statement
-- forever. The benefit is that the adapter maps rows onto DTOs with no renaming layer, which is what
-- ADR-007 clause 1's *module-for-module, against the same DTOs* means in practice. 02-design.md
-- section 7 alternative B is where snake_case was weighed and rejected.
--
-- IDS ARE `text`, not `uuid`. The DTO says `id: string` and `src/lib/data/fixtures.ts` uses readable
-- ids like `room-a`; a `uuid` column would refuse them. The adapter mints explicitly with
-- `crypto.randomUUID()`, as the mock does, so the default below is a backstop and not the usual path.
--
-- THERE IS NO `REVOKE` IN THIS FILE AND THAT IS LOAD-BEARING. RLS is off (ADR-002) and the data
-- adapter authenticates as `anon` with the anon key (02-design.md 1.3 note 2), so it reaches every
-- table through the default `public`-schema grants alone. Revoking them is the one line whose
-- ABSENCE the adapter depends on, and it will not be noticed by reading this file for what it
-- contains. It is also exactly why `SUPABASE_ANON_KEY` must never carry a `NEXT_PUBLIC_` prefix.


-- ---------------------------------------------------------------------------------------------
-- Enums — the four in `prisma/schema.prisma`, same members, same order.
-- ---------------------------------------------------------------------------------------------

CREATE TYPE "Role"         AS ENUM ('USER', 'MANAGER', 'ADMIN');
CREATE TYPE "DeviceRank"   AS ENUM ('PRIMARY', 'SECONDARY');
CREATE TYPE "RequestKind"  AS ENUM ('TARGETED', 'OPEN');
CREATE TYPE "RequestState" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');


-- ---------------------------------------------------------------------------------------------
-- Tables
--
-- `createdAt` and `updatedAt` are carried over from the draft models. No DTO in
-- `src/lib/data/types.ts` names either and no seam function reads or writes one, so both default and
-- neither has a touch trigger — Prisma's `@updatedAt` was client-side behaviour, and reproducing it
-- as a trigger would be a rule this ticket invented.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE "Group" (
  "id"        text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"      text NOT NULL,
  -- Children survive their parent as top-level groups. `deleteGroup` refuses `HAS_CHILDREN` before
  -- this can ever fire, so SET NULL is the behaviour of a path the seam does not offer.
  "parentId"  text REFERENCES "Group" ("id") ON DELETE SET NULL
);

CREATE TABLE "Member" (
  "id"        text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fullName"  text NOT NULL,
  "email"     text NOT NULL,
  "role"      "Role" NOT NULL DEFAULT 'USER',
  -- `membersDetached` in `DeleteGroupOutcome` is this rule counted.
  "groupId"   text REFERENCES "Group" ("id") ON DELETE SET NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "Room" (
  "id"         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"       text NOT NULL,
  "code"       text NOT NULL,
  -- The layout grid, deliberately finer than one cell per seat.
  "gridWidth"  integer NOT NULL,
  "gridHeight" integer NOT NULL,
  "createdAt"  timestamptz NOT NULL DEFAULT now(),
  "updatedAt"  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "Seat" (
  "id"     text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code"   text NOT NULL,
  -- INV-11: deleting a room deletes its seats. The cascade is the decision, not an oversight, and
  -- INV-11's guard is the confirmation in the interface that names the number of seats to be lost.
  "roomId" text NOT NULL REFERENCES "Room" ("id") ON DELETE CASCADE,

  -- INV-10 is NOT held here. It needs `btree_gist` and a generated `box` column, nobody has chosen
  -- the shape, and `.ai/registry/features.md:152` instructs this ticket not to add it. It stays
  -- enforced at the seam, as debt. A tidy migration is exactly where it would get added by reflex.
  "gridX" integer NOT NULL,
  "gridY" integer NOT NULL,
  "gridW" integer NOT NULL,
  "gridH" integer NOT NULL,

  -- INV-01: at most one occupant, expressed as a nullable single reference rather than a collection.
  --
  -- INV-12: `RESTRICT`, and this is the one delete rule that departs from `prisma/schema.prisma`,
  -- which said `SetNull`. ADR-005 requires a member deletion to be REFUSED, not cascaded; with
  -- SET NULL the database would silently vacate every seat underneath a refusal the seam is meant to
  -- give. It never fires on a legal path — `deleteMember` proceeds only when the references are
  -- empty — so it fires exactly when something bypassed the seam, which is what a backstop is for.
  "occupantId" text REFERENCES "Member" ("id") ON DELETE RESTRICT,

  -- INV-03 IS HELD BY AN ABSENCE. There is no `status` column here, and no CHECK, no view and no
  -- generated column produces one. Status is derived on read by `src/lib/data/derive.ts`, on both
  -- sides of the seam. The invariant's own note names this ticket twice.

  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- INV-02 IS HELD BY AN ABSENCE TOO: there is deliberately NO unique constraint on
-- `Seat.occupantId`. One person occupies several seats — `fixtures.ts` puts `mem-admin` on two — and
-- a tidy first migration adds that index by reflex, after which the second seat is refused and
-- nothing downstream explains why.

CREATE TABLE "NetworkPort" (
  "id"       text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "portCode" text NOT NULL,
  -- INV-11's chain: a port belongs to a seat, and dies with it.
  "seatId"   text NOT NULL REFERENCES "Seat" ("id") ON DELETE CASCADE
);

CREATE TABLE "Device" (
  "id"       text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "assetTag" text NOT NULL,
  "model"    text NOT NULL,

  -- INV-07 IS HELD BY AN ABSENCE: both references are NULLABLE. `NOT NULL` is the tidier-looking
  -- choice and it makes `dev-05` — the documented unassigned-inventory case — unrepresentable.
  --
  -- `ownerId` is INV-12's second half and carries the same `RESTRICT` as `Seat.occupantId`, and for
  -- the same ADR-005 reason. `seatId` is `SET NULL`: a device survives its seat, unassigned.
  "ownerId"  text REFERENCES "Member" ("id") ON DELETE RESTRICT,
  "seatId"   text REFERENCES "Seat" ("id") ON DELETE SET NULL,

  "rank" "DeviceRank" NOT NULL DEFAULT 'SECONDARY',

  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "SeatRequest" (
  "id"          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "requesterId" text NOT NULL REFERENCES "Member" ("id") ON DELETE CASCADE,
  "kind"        "RequestKind" NOT NULL,
  -- Null for an OPEN request, which names only a room.
  "seatId"      text REFERENCES "Seat" ("id") ON DELETE SET NULL,
  "roomId"      text NOT NULL REFERENCES "Room" ("id") ON DELETE CASCADE,
  "state"       "RequestState" NOT NULL DEFAULT 'PENDING',
  "createdAt"   timestamptz NOT NULL DEFAULT now(),
  "updatedAt"   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "Account" (
  "id"       text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  -- ADR-003: the login dies with the person. The draft calls this direction *already right*.
  "memberId" text NOT NULL REFERENCES "Member" ("id") ON DELETE CASCADE,
  "email"    text NOT NULL,

  -- INV-08 keeps the record of who created an account, so losing the creator must not delete it.
  -- Nullable only for the bootstrap administrator, who by definition has no creator.
  "createdById" text REFERENCES "Member" ("id") ON DELETE SET NULL,

  -- ADR-007 *Implementation decisions*, verbatim. Nullable because ADR-003 holds that a Member
  -- exists without a login; ON DELETE SET NULL because ADR-003 holds that deleting a login must not
  -- delete the Member. The one snake_case name in this schema, kept because the ADR writes it that
  -- way. It supersedes ADR-006 OQ-3, which put the key on `Member`.
  "auth_user_id" uuid UNIQUE REFERENCES auth.users ("id") ON DELETE SET NULL,

  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------------------------
-- Unique constraints
--
-- THE NAMES ARE NOT FREE TO CHANGE. 02-design.md 1.5 maps SQLSTATE 23505 on each of these onto a
-- reason code in `src/lib/data/types.ts`, and the migration is what fixes them.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE "Room"        ADD CONSTRAINT "Room_code_key"            UNIQUE ("code");
ALTER TABLE "Seat"        ADD CONSTRAINT "Seat_code_key"            UNIQUE ("code");
ALTER TABLE "NetworkPort" ADD CONSTRAINT "NetworkPort_portCode_key" UNIQUE ("portCode");
ALTER TABLE "Member"      ADD CONSTRAINT "Member_email_key"         UNIQUE ("email");
ALTER TABLE "Device"      ADD CONSTRAINT "Device_assetTag_key"      UNIQUE ("assetTag");
ALTER TABLE "Account"     ADD CONSTRAINT "Account_memberId_key"     UNIQUE ("memberId");
ALTER TABLE "Account"     ADD CONSTRAINT "Account_email_key"        UNIQUE ("email");

-- Groups have NO sibling-name unique constraint, and that is not an omission. Postgres treats NULL
-- as distinct from NULL, so a unique index over ("parentId", "name") would not refuse two top-level
-- groups sharing a name — which is the case `DUPLICATE_NAME_IN_PARENT` exists for. The rule is the
-- seam's on both sides of `DATA_SOURCE`, and `src/lib/data/mock/groups.ts` records the same reason.


-- ---------------------------------------------------------------------------------------------
-- Indexes — the nine on the draft models.
-- ---------------------------------------------------------------------------------------------

CREATE INDEX "Seat_roomId_idx"           ON "Seat"        ("roomId");
CREATE INDEX "Seat_occupantId_idx"       ON "Seat"        ("occupantId");
CREATE INDEX "NetworkPort_seatId_idx"    ON "NetworkPort" ("seatId");
CREATE INDEX "Group_parentId_idx"        ON "Group"       ("parentId");
CREATE INDEX "Member_groupId_idx"        ON "Member"      ("groupId");
CREATE INDEX "Device_ownerId_idx"        ON "Device"      ("ownerId");
CREATE INDEX "Device_seatId_idx"         ON "Device"      ("seatId");
CREATE INDEX "SeatRequest_requesterId_idx" ON "SeatRequest" ("requesterId");
CREATE INDEX "SeatRequest_state_idx"       ON "SeatRequest" ("state");


-- ---------------------------------------------------------------------------------------------
-- The three invariant constraints, together — ADR-007 OQ-5.
--
-- They enter together because INV-06 closes the `Seat` side of INV-05. A trigger on `Device` alone
-- leaves the other direction open: the device can stop being owned by the occupant because the
-- OCCUPANT changed, and nothing on `Device` fires. `prisma/constraints.draft.sql` recorded that gap
-- and left the Seat-side trigger unwritten pending this decision.
-- ---------------------------------------------------------------------------------------------

-- INV-04 — a seat has at most one primary device.
--
-- PARTIAL, and the WHERE clause is the whole point: without it this would also forbid a second
-- SECONDARY device on a seat, which INV-04 does not say and which the fixture data contradicts —
-- `seat-a-01` holds one PRIMARY and one SECONDARY.
CREATE UNIQUE INDEX "one_primary_device_per_seat"
  ON "Device" ("seatId")
  WHERE "rank" = 'PRIMARY';

-- INV-05 — a seat's primary device is owned by that seat's occupant.
--
-- IT RAISES WITH AN EXPLICIT SQLSTATE. `RAISE EXCEPTION` defaults to P0001 for everything, which
-- makes INV-05 indistinguishable from any other raise in any other function; the adapter would then
-- have to match on message text, which is a Postgres locale string. `INV05` is a legal user-defined
-- SQLSTATE — Postgres reserves classes beginning 5-9 and I-Z for exactly this — and
-- 02-design.md 1.5 is where it maps to `PRIMARY_OWNER_MUST_BE_OCCUPANT`.
CREATE FUNCTION assert_primary_device_owned_by_occupant() RETURNS TRIGGER AS $$
DECLARE
  seat_occupant text;
BEGIN
  IF NEW."rank" <> 'PRIMARY' OR NEW."seatId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "occupantId" INTO seat_occupant FROM "Seat" WHERE "id" = NEW."seatId";

  IF seat_occupant IS NULL OR NEW."ownerId" IS DISTINCT FROM seat_occupant THEN
    RAISE EXCEPTION 'INV-05: primary device % must be owned by the occupant of seat %',
      NEW."id", NEW."seatId" USING ERRCODE = 'INV05';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- A CONSTRAINT TRIGGER, per ADR-007 OQ-5, and therefore AFTER — `CREATE CONSTRAINT TRIGGER` is only
-- legal AFTER. That is the whole of the difference from `prisma/constraints.draft.sql`, which wrote
-- it BEFORE. `DEFERRABLE INITIALLY IMMEDIATE` checks at statement end, so a single statement that
-- fixes both sides is legal, and a caller that needs a two-statement window can
-- `SET CONSTRAINTS "device_primary_owner_check" DEFERRED` inside one of the functions below.
CREATE CONSTRAINT TRIGGER "device_primary_owner_check"
  AFTER INSERT OR UPDATE ON "Device"
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION assert_primary_device_owned_by_occupant();

-- INV-06 — occupant exit downgrades the seat's primary device.
CREATE FUNCTION downgrade_primary_on_occupant_exit() RETURNS TRIGGER AS $$
BEGIN
  IF OLD."occupantId" IS NOT NULL AND NEW."occupantId" IS DISTINCT FROM OLD."occupantId" THEN
    UPDATE "Device" SET "rank" = 'SECONDARY'
     WHERE "seatId" = NEW."id" AND "rank" = 'PRIMARY';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "seat_occupant_exit_downgrade"
  AFTER UPDATE OF "occupantId" ON "Seat"
  FOR EACH ROW EXECUTE FUNCTION downgrade_primary_on_occupant_exit();


-- ---------------------------------------------------------------------------------------------
-- Six operations that cannot be one PostgREST request — 02-design.md section 1.4.
--
-- PostgREST wraps ONE request in ONE transaction and there is no client-side BEGIN. The mock holds
-- INV-05 and INV-06 by writing two objects with no `await` between them; two PostgREST calls are two
-- transactions, and the state between them is INV-05 false and observable. So the operations that
-- need more than one statement become `plpgsql` functions invoked with `.rpc()`, one transaction
-- each, and `supabase gen types typescript` types them into `Database['public']['Functions']`.
--
-- EVERYTHING NOT HERE STAYS A PLAIN PostgREST CALL. `listRooms`, `getSeat`, `createRoom`,
-- `updateMember`, `assignDeviceToSeat`, `unassignDevice`, `deleteDevice` and the rest are one
-- statement each and gain nothing from an RPC. Adding one anyway is a review finding: a function is
-- a second place the logic lives and it is invisible to a reader of the TypeScript.
--
-- `FOR UPDATE` IS NOT DECORATION. It is what makes `assign_seat_occupant`'s INV-01 check and
-- `delete_member`'s INV-12 check hold under two concurrent callers, which is the whole reason these
-- are functions rather than pairs of requests.
--
-- EACH RETURNS ONE `jsonb` ROW WHOSE SHAPE IS THE OUTCOME UNION IN `src/lib/data/types.ts`, so the
-- adapter narrows rather than re-derives.
-- ---------------------------------------------------------------------------------------------

-- The `Seat` DTO, built once. `Seat` carries its ports (`src/lib/data/types.ts`), so `to_jsonb(row)`
-- is the wrong shape twice over: it omits `ports` and it adds `createdAt` and `updatedAt`, which no
-- DTO names. Four call sites would otherwise each build this by hand.
CREATE FUNCTION public.seat_dto(p_seat_id text) RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'id',         s."id",
    'roomId',     s."roomId",
    'code',       s."code",
    'gridX',      s."gridX",
    'gridY',      s."gridY",
    'gridW',      s."gridW",
    'gridH',      s."gridH",
    'ports', COALESCE(
      (SELECT jsonb_agg(
                jsonb_build_object('id', p."id", 'seatId', p."seatId", 'portCode', p."portCode")
                ORDER BY p."id")
         FROM "NetworkPort" p WHERE p."seatId" = s."id"),
      '[]'::jsonb),
    'occupantId', s."occupantId"
  )
  FROM "Seat" s WHERE s."id" = p_seat_id;
$$ LANGUAGE sql STABLE;

-- The `Device` DTO. Same reason, minus the nesting.
CREATE FUNCTION public.device_dto(p_device_id text) RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'id',       d."id",
    'assetTag', d."assetTag",
    'model',    d."model",
    'ownerId',  d."ownerId",
    'seatId',   d."seatId",
    'rank',     d."rank"
  )
  FROM "Device" d WHERE d."id" = p_device_id;
$$ LANGUAGE sql STABLE;


-- INV-01, and the three refusals in `AssignOccupantOutcome`.
--
-- ONE STATEMENT CANNOT DO THIS. `UPDATE ... WHERE "occupantId" IS NULL` affects zero rows both when
-- the seat is missing and when it is occupied, and those are two different refusals that
-- `01-story.md` and `mock/seats.ts` both require to stay distinguishable. The check order is
-- load-bearing and is the mock's: SEAT_NOT_FOUND, then MEMBER_NOT_FOUND, then SEAT_OCCUPIED — a
-- seat that is gone has no occupancy to read, and reporting SEAT_OCCUPIED for a seat that does not
-- exist is a refusal for the right reason by accident.
--
-- INV-02: no check on how many other seats this member already occupies. The invariant is the
-- ABSENCE of that check, and adding one is the only way to break it.
CREATE FUNCTION public.assign_seat_occupant(p_seat_id text, p_member_id text) RETURNS jsonb AS $$
DECLARE
  v_seat "Seat"%ROWTYPE;
BEGIN
  SELECT * INTO v_seat FROM "Seat" WHERE "id" = p_seat_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'SEAT_NOT_FOUND');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "Member" WHERE "id" = p_member_id) THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'MEMBER_NOT_FOUND');
  END IF;

  IF v_seat."occupantId" IS NOT NULL THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'SEAT_OCCUPIED');
  END IF;

  UPDATE "Seat" SET "occupantId" = p_member_id WHERE "id" = p_seat_id;

  RETURN jsonb_build_object('assigned', true, 'seat', public.seat_dto(p_seat_id));
END;
$$ LANGUAGE plpgsql;


-- INV-01 clears the seat while INV-06 downgrades the device, and `downgradedDeviceId` must be read
-- BEFORE the trigger fires or it cannot be reported at all — after the UPDATE there is no PRIMARY
-- device on that seat to find. INV-04 is what makes it at most one, so the first match is the only
-- match.
CREATE FUNCTION public.release_seat_occupant(p_seat_id text) RETURNS jsonb AS $$
DECLARE
  v_seat       "Seat"%ROWTYPE;
  v_downgraded text;
BEGIN
  SELECT * INTO v_seat FROM "Seat" WHERE "id" = p_seat_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('released', false, 'reason', 'SEAT_NOT_FOUND');
  END IF;

  -- A release against a vacant seat is refused rather than succeeding silently: a write path with
  -- nothing to write that still runs the INV-06 downgrade can demote a device on a seat that never
  -- had an occupant to lose.
  IF v_seat."occupantId" IS NULL THEN
    RETURN jsonb_build_object('released', false, 'reason', 'SEAT_NOT_OCCUPIED');
  END IF;

  SELECT "id" INTO v_downgraded FROM "Device"
   WHERE "seatId" = p_seat_id AND "rank" = 'PRIMARY';

  UPDATE "Seat" SET "occupantId" = NULL WHERE "id" = p_seat_id;  -- the INV-06 trigger fires here

  RETURN jsonb_build_object(
    'released', true,
    'seat', public.seat_dto(p_seat_id),
    'downgradedDeviceId', v_downgraded
  );
END;
$$ LANGUAGE plpgsql;


-- The incumbent must be demoted and the new device promoted; INV-04's partial unique index refuses
-- the intermediate state where both are PRIMARY, so the ORDER IS NOT A PREFERENCE.
--
-- The four refusals are ordered as `mock/devices.ts` orders them, and the order is load-bearing:
-- NOT_ASSIGNED before SEAT_HAS_NO_OCCUPANT because an unassigned device has no seat to read an
-- occupant from; SEAT_HAS_NO_OCCUPANT before OWNER_IS_NOT_OCCUPANT because a null occupant compared
-- with `IS DISTINCT FROM` looks like an owner mismatch and would be refused for the right reason by
-- accident, hiding the defect the fourth arm exists to catch.
--
-- Designating a device that is already its seat's primary succeeds and demotes nothing: the
-- incumbent search excludes the target, so there is no self-demotion to undo.
CREATE FUNCTION public.designate_primary_device(p_device_id text) RETURNS jsonb AS $$
DECLARE
  v_device  "Device"%ROWTYPE;
  v_seat    "Seat"%ROWTYPE;
  v_demoted text;
BEGIN
  SELECT * INTO v_device FROM "Device" WHERE "id" = p_device_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('designated', false, 'reason', 'NOT_FOUND');
  END IF;

  IF v_device."seatId" IS NULL THEN
    RETURN jsonb_build_object('designated', false, 'reason', 'NOT_ASSIGNED');
  END IF;

  SELECT * INTO v_seat FROM "Seat" WHERE "id" = v_device."seatId" FOR UPDATE;
  IF NOT FOUND OR v_seat."occupantId" IS NULL THEN
    RETURN jsonb_build_object('designated', false, 'reason', 'SEAT_HAS_NO_OCCUPANT');
  END IF;

  IF v_device."ownerId" IS DISTINCT FROM v_seat."occupantId" THEN
    RETURN jsonb_build_object('designated', false, 'reason', 'OWNER_IS_NOT_OCCUPANT');
  END IF;

  SELECT "id" INTO v_demoted FROM "Device"
   WHERE "seatId" = v_device."seatId" AND "rank" = 'PRIMARY' AND "id" <> p_device_id;

  IF v_demoted IS NOT NULL THEN
    UPDATE "Device" SET "rank" = 'SECONDARY' WHERE "id" = v_demoted;
  END IF;

  UPDATE "Device" SET "rank" = 'PRIMARY' WHERE "id" = p_device_id;

  RETURN jsonb_build_object(
    'designated', true,
    'device', public.device_dto(p_device_id),
    'demotedDeviceId', v_demoted
  );
END;
$$ LANGUAGE plpgsql;


-- INV-11. `seatsDeleted` and `devicesDetached` are counted from rows the same statement destroys,
-- and INV-06's downgrade for devices on those seats is not covered by any trigger — the `Seat`
-- trigger fires on UPDATE OF "occupantId", not on DELETE.
--
-- The order is the mock's and it is deliberate: devices are detached BEFORE their seats are removed,
-- so a device is never left pointing at a seat that no longer exists (INV-04, INV-05) and never left
-- PRIMARY with no occupant to own it (INV-06). Deleting a seat is the most complete occupant exit
-- there is. Devices are detached, never deleted — INV-07 is what makes that a legal resting state
-- rather than a leak.
CREATE FUNCTION public.delete_room(p_room_id text) RETURNS jsonb AS $$
DECLARE
  v_seats_deleted    integer;
  v_devices_detached integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Room" WHERE "id" = p_room_id FOR UPDATE) THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'NOT_FOUND');
  END IF;

  SELECT count(*) INTO v_seats_deleted FROM "Seat" WHERE "roomId" = p_room_id;

  WITH detached AS (
    UPDATE "Device" SET "seatId" = NULL, "rank" = 'SECONDARY'
     WHERE "seatId" IN (SELECT "id" FROM "Seat" WHERE "roomId" = p_room_id)
     RETURNING 1
  )
  SELECT count(*) INTO v_devices_detached FROM detached;

  -- The seats and their ports go with the room, by ON DELETE CASCADE. A seat's occupancy is a column
  -- OF the seat, so INV-01's occupancy cannot survive its seat. Members are untouched: this destroys
  -- an occupancy, not a person.
  DELETE FROM "Room" WHERE "id" = p_room_id;

  RETURN jsonb_build_object(
    'deleted', true,
    'seatsDeleted', v_seats_deleted,
    'devicesDetached', v_devices_detached
  );
END;
$$ LANGUAGE plpgsql;


-- INV-12 and ADR-005: a member who occupies a seat or owns a device may not be deleted, and the
-- deletion is REFUSED rather than cascaded. The refusal carries both halves so the message can name
-- what is blocking it — a bare "cannot delete" sends the operator hunting.
--
-- ONE TRANSACTION, not two round trips. Reading the blockers and then deleting from the adapter
-- would be a time-of-check-to-time-of-use window in which the last blocker disappears and the
-- refusal is wrong. `ON DELETE RESTRICT` on `Seat.occupantId` and `Device.ownerId` is the backstop
-- underneath this, and it fires exactly when something bypassed the seam.
--
-- Seat CODES, not ids, sorted ascending: AC-10 requires the refusal to name each seat and a uuid
-- names nothing to a person. Both halves are always returned, empty and zero for a member nothing
-- refers to, because the two must fail independently.
CREATE FUNCTION public.delete_member(p_member_id text) RETURNS jsonb AS $$
DECLARE
  v_seat_codes text[];
  v_device_count integer;
  v_references jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Member" WHERE "id" = p_member_id FOR UPDATE) THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'NOT_FOUND');
  END IF;

  SELECT COALESCE(array_agg("code" ORDER BY "code"), '{}')
    INTO v_seat_codes FROM "Seat" WHERE "occupantId" = p_member_id;
  SELECT count(*) INTO v_device_count FROM "Device" WHERE "ownerId" = p_member_id;

  IF array_length(v_seat_codes, 1) IS NOT NULL OR v_device_count > 0 THEN
    v_references := jsonb_build_object(
      'occupiedSeatCodes', to_jsonb(v_seat_codes),
      'ownedDeviceCount', v_device_count
    );
    RETURN jsonb_build_object('deleted', false, 'reason', 'REFERENCED', 'references', v_references);
  END IF;

  DELETE FROM "Member" WHERE "id" = p_member_id;

  RETURN jsonb_build_object('deleted', true, 'memberId', p_member_id);
END;
$$ LANGUAGE plpgsql;


-- A group with children is REFUSED, not cascaded and not reparented, and the refusal carries the
-- child names. Its members are DETACHED, not deleted — INV-12 is not engaged, because no member is
-- removed and `DeleteGroupOutcome` has no arm that could report having done so.
--
-- `membersDetached` is counted during the write rather than inferred afterwards: once the group is
-- gone there is nothing left to read the membership off. Direct children only — the refusal turns on
-- a group having children at all, so a descendant walk would answer a question nobody asked.
CREATE FUNCTION public.delete_group(p_group_id text) RETURNS jsonb AS $$
DECLARE
  v_child_names text[];
  v_member_count integer;
  v_detached integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Group" WHERE "id" = p_group_id FOR UPDATE) THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'NOT_FOUND');
  END IF;

  SELECT COALESCE(array_agg("name" ORDER BY "name"), '{}')
    INTO v_child_names FROM "Group" WHERE "parentId" = p_group_id;
  SELECT count(*) INTO v_member_count FROM "Member" WHERE "groupId" = p_group_id;

  IF array_length(v_child_names, 1) IS NOT NULL THEN
    RETURN jsonb_build_object(
      'deleted', false,
      'reason', 'HAS_CHILDREN',
      'references', jsonb_build_object(
        'childGroupNames', to_jsonb(v_child_names),
        'memberCount', v_member_count
      )
    );
  END IF;

  WITH detached AS (
    UPDATE "Member" SET "groupId" = NULL WHERE "groupId" = p_group_id RETURNING 1
  )
  SELECT count(*) INTO v_detached FROM detached;

  DELETE FROM "Group" WHERE "id" = p_group_id;

  RETURN jsonb_build_object('deleted', true, 'groupId', p_group_id, 'membersDetached', v_detached);
END;
$$ LANGUAGE plpgsql;
