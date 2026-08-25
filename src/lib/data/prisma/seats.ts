import type { AssignOccupantOutcome, ReleaseOccupantOutcome, Seat } from "../types";
import { notWired } from "./client";

// INV-03 is derived, not queried. Both sides re-export the same function so the Prisma
// implementation cannot drift into selecting a stored status column that must never exist.
export { deriveSeatStatus } from "../derive";

export async function listSeats(roomId?: string): Promise<Seat[]> {
  void roomId;
  return notWired("listSeats");
}

export async function getSeat(id: string): Promise<Seat | null> {
  void id;
  return notWired("getSeat");
}

// The two occupancy writes carry their final signatures and throw, like every other unwired seam
// function. `tests/unit/seam-parity.test.ts` holds this module to the same exported names and the
// same arity as `../mock/seats.ts`, so filling a body in later cannot change the shape a caller sees.
export async function assignSeatOccupant(
  seatId: string,
  memberId: string
): Promise<AssignOccupantOutcome> {
  void seatId;
  void memberId;
  return notWired("assignSeatOccupant");
}

export async function releaseSeatOccupant(seatId: string): Promise<ReleaseOccupantOutcome> {
  void seatId;
  return notWired("releaseSeatOccupant");
}
