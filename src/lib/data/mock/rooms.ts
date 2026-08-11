import { rooms } from "../fixtures";
import type { Room } from "../types";

export async function listRooms(): Promise<Room[]> {
  return structuredClone(rooms);
}

export async function getRoom(id: string): Promise<Room | null> {
  return structuredClone(rooms.find((r) => r.id === id) ?? null);
}
