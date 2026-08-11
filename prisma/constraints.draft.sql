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
