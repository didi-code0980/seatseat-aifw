import type { Seat } from "../types";
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
