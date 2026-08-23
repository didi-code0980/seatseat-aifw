import type { CreateRoomOutcome, DeleteRoomOutcome, NewRoom, Room, RoomPatch } from "../types";
import { devices, rooms, seats } from "./store";

export async function listRooms(): Promise<Room[]> {
  return structuredClone(rooms);
}

export async function getRoom(id: string): Promise<Room | null> {
  return structuredClone(rooms.find((r) => r.id === id) ?? null);
}

/**
 * INV-11: the number the delete confirmation must name. It is answered by the seam rather than
 * counted by the client, so the figure a user consents to is the one the cascade will act on.
 */
export async function countSeatsInRoom(roomId: string): Promise<number> {
  return seats.filter((s) => s.roomId === roomId).length;
}

/**
 * AC-12: `Room.code` is `@unique`, so a duplicate is the seam agreeing with the model rather than
 * adding a rule of its own. It returns a refusal instead of throwing — a code already in use is an
 * expected failure, not a programmer error (coding-standards.md, "Error handling").
 *
 * The id is minted here with `crypto.randomUUID()` and is never read from a caller. A
 * caller-supplied id would let the UI invent a primary key; the Prisma model uses `@default(cuid())`
 * for the same reason and the mock cannot.
 */
export async function createRoom(input: NewRoom): Promise<CreateRoomOutcome> {
  if (rooms.some((r) => r.code === input.code)) {
    return { created: false, reason: "DUPLICATE_CODE" };
  }

  const room: Room = { id: crypto.randomUUID(), ...input };
  rooms.push(room);
  return { created: true, room: structuredClone(room) };
}

/** AC-4: only the name is editable. `code`, `gridWidth` and `gridHeight` are left as they are. */
export async function updateRoom(id: string, patch: RoomPatch): Promise<Room | null> {
  const room = rooms.find((r) => r.id === id);
  if (room === undefined) return null;

  room.name = patch.name;
  return structuredClone(room);
}

/**
 * INV-11: destructive, and the whole cascade happens here or none of it does. There is no await on
 * anything outside this module between the first write and the last, so no caller can observe or
 * interleave with a half-applied cascade — a room without its seats, or a seat without its room, is
 * a state this function refuses to make reachable.
 *
 * The order is deliberate. Devices are detached *before* their seats are removed, so a device is
 * never left pointing at a seat that no longer exists (INV-04, INV-05) and never left `PRIMARY`
 * with no occupant to own it (INV-06). Deleting a seat is the most complete occupant exit there is.
 *
 * What goes, and by what mechanism:
 *   - the room row
 *   - its seats, and with each seat its `ports` and its `occupantId` — both are fields *of* the
 *     seat object, so INV-01's occupancy cannot survive its seat and a partial cascade is not
 *     expressible. Members are untouched: this destroys an occupancy, not a person.
 *   - nothing else. Devices are detached, never deleted (INV-07, AC-14).
 */
export async function deleteRoom(id: string): Promise<DeleteRoomOutcome> {
  const roomIndex = rooms.findIndex((r) => r.id === id);
  if (roomIndex === -1) return { deleted: false, reason: "NOT_FOUND" };

  const doomedSeatIds = new Set(seats.filter((s) => s.roomId === id).map((s) => s.id));

  // INV-06 and INV-07: the device survives, unassigned and not primary. INV-07 is what makes that a
  // legal resting state rather than a leak.
  let devicesDetached = 0;
  for (const device of devices) {
    if (device.seatId !== null && doomedSeatIds.has(device.seatId)) {
      device.seatId = null;
      device.rank = "SECONDARY";
      devicesDetached += 1;
    }
  }

  // Filtered in place rather than reassigned: `store.ts` exports the array binding, and every other
  // mock module holds that same object.
  let seatsDeleted = 0;
  for (let i = seats.length - 1; i >= 0; i -= 1) {
    const seat = seats[i];
    if (seat !== undefined && doomedSeatIds.has(seat.id)) {
      seats.splice(i, 1);
      seatsDeleted += 1;
    }
  }

  rooms.splice(roomIndex, 1);

  return { deleted: true, seatsDeleted, devicesDetached };
}
