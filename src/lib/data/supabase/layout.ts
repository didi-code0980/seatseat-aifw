import type { RoomLayout } from "../types";
import { getRoom, listRooms } from "./rooms";
import { listSeats } from "./seats";

// Composed from the two entity modules rather than issuing its own queries. `RoomLayout` is a Room
// and its Seats and nothing else, so a third query shape here would be a second place the seat
// projection — the embedded ports, the port ordering — could drift from `./seats.ts`.

export async function getRoomLayout(roomId: string): Promise<RoomLayout | null> {
  const room = await getRoom(roomId);
  if (room === null) return null;
  return { room, seats: await listSeats(roomId) };
}

export async function listRoomLayouts(): Promise<RoomLayout[]> {
  const [rooms, seats] = await Promise.all([listRooms(), listSeats()]);
  return rooms.map((room) => ({ room, seats: seats.filter((s) => s.roomId === room.id) }));
}
