import type { AssignOccupantOutcome, ReleaseOccupantOutcome, Seat } from "../types";
import { db, unwrapRpc } from "./client";

// INV-03 is derived, not queried. Both sides re-export the same function so this implementation
// cannot drift into selecting a stored status column that must never exist.
//
// THIS LINE IS NOT OPTIONAL. `mock/seats.ts` carries it, and `tests/unit/seam-parity.test.ts`
// compares exported FUNCTIONS, so omitting it fails the suite. It is the single easiest line to
// lose in a file-for-file rewrite.
export { deriveSeatStatus } from "../derive";

// `Seat` carries its ports (`../types.ts`), so the ports come back as an embedded resource rather
// than a second round trip. The alias `ports` is the DTO's field name; `NetworkPort` is the table.
const COLUMNS = "id, roomId, code, gridX, gridY, gridW, gridH, occupantId, ports:NetworkPort(id, seatId, portCode)";

/**
 * Ports arrive in no defined order from PostgREST. The mock returns them in fixture order, which for
 * the seeded set is id order (`seat-a-01-p1` before `seat-a-01-p2`), so sorting here is what makes
 * AC-12's two modes render the same cells. Sorted in TypeScript rather than through
 * `order(..., { referencedTable })` because the sort is a property of the DTO both sides return,
 * not of one transport.
 */
function withSortedPorts(seat: Seat): Seat {
  return { ...seat, ports: [...seat.ports].sort((a, b) => a.id.localeCompare(b.id)) };
}

export async function listSeats(roomId?: string): Promise<Seat[]> {
  const query = db().from("Seat").select(COLUMNS).order("id");
  const { data, error } = await (roomId === undefined ? query : query.eq("roomId", roomId));
  if (error !== null) throw error;
  return data.map(withSortedPorts);
}

export async function getSeat(id: string): Promise<Seat | null> {
  const { data, error } = await db().from("Seat").select(COLUMNS).eq("id", id).maybeSingle();
  if (error !== null) throw error;
  return data === null ? null : withSortedPorts(data);
}

/**
 * INV-01, INV-02, and the three refusals in `AssignOccupantOutcome`.
 *
 * ONE POSTGRES FUNCTION, ONE TRANSACTION — `assign_seat_occupant` in the first migration. An
 * `UPDATE ... WHERE "occupantId" IS NULL` affects zero rows both when the seat is missing and when
 * it is occupied, and those are two refusals `../types.ts` requires to stay distinguishable; the
 * `FOR UPDATE` inside the function is what makes the INV-01 check hold under two concurrent
 * callers, rather than being a read followed by a write with a window between them.
 *
 * The three checks are ordered inside the function, not here. Their order is `mock/seats.ts`'s and
 * the reason is recorded there and in the migration.
 */
export async function assignSeatOccupant(
  seatId: string,
  memberId: string
): Promise<AssignOccupantOutcome> {
  const { data, error } = await db().rpc("assign_seat_occupant", {
    p_seat_id: seatId,
    p_member_id: memberId,
  });
  return unwrapRpc<AssignOccupantOutcome>(data, error, "assignSeatOccupant");
}

/**
 * INV-01 clears the seat and INV-06 downgrades its primary device, in one transaction.
 *
 * `downgradedDeviceId` is read BEFORE the seat is cleared, inside the function, because the INV-06
 * trigger fires on that write and afterwards there is no primary device on the seat left to name.
 * That ordering is the reason this is an RPC and not two requests: over PostgREST there is always
 * an await between two calls, and the state in between is INV-05 false and observable.
 */
export async function releaseSeatOccupant(seatId: string): Promise<ReleaseOccupantOutcome> {
  const { data, error } = await db().rpc("release_seat_occupant", { p_seat_id: seatId });
  return unwrapRpc<ReleaseOccupantOutcome>(data, error, "releaseSeatOccupant");
}
