import { rooms, seats } from "../fixtures";
import type { RoomLayout } from "../types";

export async function getRoomLayout(roomId: string): Promise<RoomLayout | null> {
  const room = rooms.find((r) => r.id === roomId);
  if (room === undefined) return null;
  return structuredClone({ room, seats: seats.filter((s) => s.roomId === roomId) });
}

export async function listRoomLayouts(): Promise<RoomLayout[]> {
  return structuredClone(rooms.map((room) => ({ room, seats: seats.filter((s) => s.roomId === room.id) })));
}
