import type { CreateRoomOutcome, DeleteRoomOutcome, NewRoom, Room, RoomPatch } from "../types";
import { notWired } from "./client";

export async function listRooms(): Promise<Room[]> {
  return notWired("listRooms");
}

export async function getRoom(id: string): Promise<Room | null> {
  void id;
  return notWired("getRoom");
}

export async function countSeatsInRoom(roomId: string): Promise<number> {
  void roomId;
  return notWired("countSeatsInRoom");
}

/**
 * TODO(verify): when this is wired, the duplicate refusal reads the `@unique` violation on
 * `Room.code` and returns `{ created: false, reason: "DUPLICATE_CODE" }` rather than letting the
 * Prisma error escape. AC-12 is a refusal, not an exception.
 */
export async function createRoom(input: NewRoom): Promise<CreateRoomOutcome> {
  void input;
  return notWired("createRoom");
}

export async function updateRoom(id: string, patch: RoomPatch): Promise<Room | null> {
  void id;
  void patch;
  return notWired("updateRoom");
}

/**
 * TODO(verify): `schema.prisma` already declares the cascade this needs — `Seat.room onDelete:
 * Cascade`, `NetworkPort.seat onDelete: Cascade`, `Device.seat onDelete: SetNull` — so the database
 * does most of INV-11 on its own. The one part it does not do is INV-06: `SetNull` clears `seatId`
 * and leaves `rank` as it was, so a formerly-primary device would stay `PRIMARY` with no seat. The
 * downgrade must be written explicitly, in the same transaction as the delete
 * (02-design.md section 4).
 */
export async function deleteRoom(id: string): Promise<DeleteRoomOutcome> {
  void id;
  return notWired("deleteRoom");
}
