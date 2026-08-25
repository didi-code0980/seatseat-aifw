import type { AssignOccupantOutcome, ReleaseOccupantOutcome, Seat } from "../types";
// `members` comes from `../fixtures` rather than from `./store`: `store.ts` is the names for where
// the mock seam's WRITES go, and nothing in this ticket writes a member. The two bindings are the
// same array either way (02-design.md section 1.2). MEM-01 may add a `members` export to `store.ts`;
// SEA-01 must not.
import { members } from "../fixtures";
// `devices` is imported because INV-06 is a consequence of ending occupancy and the cascade lives
// with the operation that causes it, not with the entity that suffers it — the rule `deleteRoom`
// already follows from `mock/rooms.ts` (02-design.md section 3, and section 7 alternative A).
import { devices, seats } from "./store";

export { deriveSeatStatus } from "../derive";

export async function listSeats(roomId?: string): Promise<Seat[]> {
  const scoped = roomId === undefined ? seats : seats.filter((s) => s.roomId === roomId);
  return structuredClone(scoped);
}

export async function getSeat(id: string): Promise<Seat | null> {
  return structuredClone(seats.find((s) => s.id === id) ?? null);
}

/**
 * AC-2, AC-3, AC-4, AC-9, AC-11.
 *
 * **The order of the three checks is load-bearing.** SEAT_NOT_FOUND precedes MEMBER_NOT_FOUND
 * precedes SEAT_OCCUPIED: a seat that is gone has no occupancy to read, and reporting SEAT_OCCUPIED
 * for a seat that does not exist is a refusal for the right reason by accident — the same failure
 * mode `designatePrimaryDevice` orders its four checks against.
 *
 * It writes `occupantId` and nothing else. No device row is read and none is written, which is AC-11
 * and where INV-05 is at genuine risk: the seat may still carry the previous occupant's devices, and
 * promoting one would give the seat a primary device owned by a non-occupant. No path in this ticket
 * sets `rank = "PRIMARY"` at all.
 */
export async function assignSeatOccupant(
  seatId: string,
  memberId: string
): Promise<AssignOccupantOutcome> {
  const seat = seats.find((s) => s.id === seatId);
  if (seat === undefined) return { assigned: false, reason: "SEAT_NOT_FOUND" };
  // Design F-4. `Seat.occupantId` is a foreign key onto Member (prisma/schema.prisma:114-115), so
  // the seam agrees with the model rather than writing an occupantId no member answers to.
  if (!members.some((m) => m.id === memberId)) {
    return { assigned: false, reason: "MEMBER_NOT_FOUND" };
  }
  // INV-01. Under `prisma` the single nullable reference cannot hold two occupants; under `mock`
  // this line is the only mechanism, which is 01-story.md out-of-scope item 9 stated as code.
  if (seat.occupantId !== null) return { assigned: false, reason: "SEAT_OCCUPIED" };

  // INV-02: no check on how many other seats this member occupies. The invariant is the ABSENCE of
  // that constraint, and adding one is the only way to break it.
  seat.occupantId = memberId;
  return { assigned: true, seat: structuredClone(seat) };
}

/**
 * AC-5, AC-6, AC-7, AC-8.
 *
 * **It demotes before it clears, with no `await` between the first write and the last.** Under the
 * mock there is no constraint to refuse an intermediate state, so a seat that is vacant while a
 * device still points at it as PRIMARY must not be observable — that state is INV-05 false.
 * `mock/rooms.ts` states the same requirement for the room cascade.
 *
 * **It changes `rank` on exactly one device and `seatId` on none.** INV-06 says the primary device
 * becomes secondary; it does not say the device leaves the seat, and it does not say the device
 * leaves the system. INV-07 permits a device to sit unassigned and nothing here puts one there
 * (AC-7, and assumption A-2).
 */
export async function releaseSeatOccupant(seatId: string): Promise<ReleaseOccupantOutcome> {
  const seat = seats.find((s) => s.id === seatId);
  if (seat === undefined) return { released: false, reason: "SEAT_NOT_FOUND" };
  // AC-8. A release against a vacant seat is refused rather than succeeding silently: a write path
  // with nothing to write that still runs the INV-06 downgrade can demote a device on a seat that
  // never had an occupant to lose.
  if (seat.occupantId === null) return { released: false, reason: "SEAT_NOT_OCCUPIED" };

  // INV-06, and INV-04 is what makes this at most one device, so the first match is the only match.
  const primary = devices.find((d) => d.seatId === seatId && d.rank === "PRIMARY");
  let downgradedDeviceId: string | null = null;
  if (primary !== undefined) {
    primary.rank = "SECONDARY";
    downgradedDeviceId = primary.id;
  }
  seat.occupantId = null;

  return { released: true, seat: structuredClone(seat), downgradedDeviceId };
}
