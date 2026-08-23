import type { Seat } from "../types";
import { seats } from "./store";

export { deriveSeatStatus } from "../derive";

export async function listSeats(roomId?: string): Promise<Seat[]> {
  const scoped = roomId === undefined ? seats : seats.filter((s) => s.roomId === roomId);
  return structuredClone(scoped);
}

export async function getSeat(id: string): Promise<Seat | null> {
  return structuredClone(seats.find((s) => s.id === id) ?? null);
}
