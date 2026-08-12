-- DRAFT — NOT APPLIED. Do not run this file.
--
-- INV-04 and INV-05 are not expressible in Prisma's schema language, so they need raw SQL at the
-- migration level. This is that SQL, drafted so the gap is visible rather than assumed to be
-- covered by the ORM. It becomes part of a migration only after prisma/schema.prisma is approved
-- (RULE-09).
--
-- The distinction that matters: Prisma can express "at most one X per Y" only through a unique
-- index over a column pair, and it cannot express a PARTIAL index — one that applies to a subset of
-- rows. INV-04 is exactly a partial constraint, because SECONDARY devices are unbounded per seat.


-- INV-04 — a seat has at most one primary device.
--
-- Partial unique index. Without the WHERE clause this would also forbid a second SECONDARY device on
-- a seat, which INV-04 does not say and which the fixture data contradicts (seat-a-01 holds one
-- PRIMARY and one SECONDARY).
CREATE UNIQUE INDEX one_primary_device_per_seat
  ON "Device" ("seatId")
  WHERE "rank" = 'PRIMARY';


-- INV-05 — a seat's primary device must be owned by that seat's current occupant.
--
-- TODO(verify): this is a cross-row constraint — it relates Device.ownerId to Seat.occupantId — and
-- PostgreSQL CHECK constraints cannot read another table. The three options, none yet chosen:
--
--   1. A trigger on Device INSERT/UPDATE, and a second trigger on Seat UPDATE for the case where the
--      occupant changes rather than the device. Two triggers, because either side can break it.
--   2. Denormalise Seat.occupantId onto Device as a redundant column, then a composite foreign key
--      plus a CHECK. Correct and cheap to enforce, at the cost of a column that can go stale.
--   3. Enforce it only in the seam. Rejected: an invariant enforced in application code is not an
--      invariant, and INV-07 escalation on first occurrence assumes the database is the backstop.
--
-- Option 1 is drafted below. It is not complete — the Seat-side trigger is missing, and that
-- omission is deliberate, because whether an occupant change should downgrade the device (INV-06) or
-- reject the change is a decision for the human approving this file.

CREATE OR REPLACE FUNCTION assert_primary_device_owned_by_occupant()
RETURNS TRIGGER AS $$
DECLARE
  seat_occupant TEXT;
BEGIN
  IF NEW."rank" <> 'PRIMARY' OR NEW."seatId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "occupantId" INTO seat_occupant FROM "Seat" WHERE "id" = NEW."seatId";

  IF seat_occupant IS NULL OR NEW."ownerId" IS DISTINCT FROM seat_occupant THEN
    RAISE EXCEPTION
      'INV-05: primary device % must be owned by the occupant of seat %', NEW."id", NEW."seatId";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_primary_owner_check
  BEFORE INSERT OR UPDATE ON "Device"
  FOR EACH ROW EXECUTE FUNCTION assert_primary_device_owned_by_occupant();


-- INV-06 — when an occupant exits a seat, that seat's primary device auto-downgrades to secondary.
--
-- TODO(verify): drafted as a trigger so the downgrade cannot be skipped by a write path that forgets
-- it. Whether this belongs in the database or in a single seam function that owns seat release is
-- open — a trigger is invisible to a reader of the application code, which is a real cost.

CREATE OR REPLACE FUNCTION downgrade_primary_on_occupant_exit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."occupantId" IS NOT NULL AND NEW."occupantId" IS DISTINCT FROM OLD."occupantId" THEN
    UPDATE "Device"
       SET "rank" = 'SECONDARY'
     WHERE "seatId" = NEW."id" AND "rank" = 'PRIMARY';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seat_occupant_exit_downgrade
  AFTER UPDATE OF "occupantId" ON "Seat"
  FOR EACH ROW EXECUTE FUNCTION downgrade_primary_on_occupant_exit();


-- INV-10 — within a room, no two seats may occupy overlapping grid cells.
--
-- TODO(verify): NOT APPLIED, and unlike the three above this one may never belong here at all.
--
-- Overlap is a predicate over pairs of rectangles scoped to a room. A unique index cannot express
-- it: a unique index enforces equality over a column set, and this is an inequality over four
-- columns compared against every other row in the same room.
--
-- PostgreSQL can enforce it natively with an exclusion constraint, sketched below. It needs the
-- btree_gist extension and a generated box column, both of which are schema decisions nobody has
-- approved — which is why this is a sketch and not a draft on the same footing as the three above.
--
--   CREATE EXTENSION IF NOT EXISTS btree_gist;
--
--   ALTER TABLE "Seat" ADD COLUMN "footprint" box
--     GENERATED ALWAYS AS (
--       box(point("gridX", "gridY"), point("gridX" + "gridW", "gridY" + "gridH"))
--     ) STORED;
--
--   ALTER TABLE "Seat" ADD CONSTRAINT seats_do_not_overlap_within_room
--     EXCLUDE USING gist ("roomId" WITH =, "footprint" WITH &&);
--
-- Until that decision is made, INV-10 is held by a check in src/lib/data/ on every placement write.
-- That is weaker than a constraint and the weakness is real: a write that bypasses the seam bypasses
-- the invariant. It holds only because RULE-02 makes bypassing the seam a lint failure. If a
-- direct-SQL write path is ever introduced, INV-10 must move into the database first.
--
-- Every LAY ticket lists INV-10 in invariants_touched so gate R8 forces a reviewer to reason about
-- it on any drag-and-drop work. Overlap is the failure dnd-kit produces most easily and the one the
-- eye catches least reliably: two seats a single cell into each other look correct in a screenshot
-- and are wrong in the data.
