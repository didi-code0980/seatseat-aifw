import type { CreateRoomOutcome, DeleteRoomOutcome, NewRoom, Room, RoomPatch } from "../types";
import { db, isCode, UNIQUE_VIOLATION, unwrapRpc } from "./client";

const COLUMNS = "id, name, code, gridWidth, gridHeight";

export async function listRooms(): Promise<Room[]> {
  const { data, error } = await db().from("Room").select(COLUMNS).order("id");
  if (error !== null) throw error;
  return data;
}

export async function getRoom(id: string): Promise<Room | null> {
  const { data, error } = await db().from("Room").select(COLUMNS).eq("id", id).maybeSingle();
  if (error !== null) throw error;
  return data;
}

/**
 * INV-11: the number the delete confirmation must name. It is answered by the seam rather than
 * counted by the client, so the figure a user consents to is the one the cascade will act on.
 *
 * `head: true` sends no rows back — the count is the whole answer.
 */
export async function countSeatsInRoom(roomId: string): Promise<number> {
  const { count, error } = await db()
    .from("Seat")
    .select("id", { count: "exact", head: true })
    .eq("roomId", roomId);
  if (error !== null) throw error;
  return count ?? 0;
}

/**
 * `Room_code_key` is what refuses a duplicate, so this is the seam agreeing with the schema rather
 * than adding a rule of its own. It returns a refusal instead of throwing: a code already in use is
 * an expected failure, not a programmer error (`coding-standards.md`).
 *
 * The id is minted here and never read from a caller, exactly as the mock mints it — `NewRoom` has
 * no field for one. The column's `gen_random_uuid()::text` default is a backstop, not this path.
 */
export async function createRoom(input: NewRoom): Promise<CreateRoomOutcome> {
  const { data, error } = await db()
    .from("Room")
    .insert({ id: crypto.randomUUID(), ...input })
    .select(COLUMNS)
    .single();
  if (isCode(error, UNIQUE_VIOLATION)) return { created: false, reason: "DUPLICATE_CODE" };
  if (error !== null) throw error;
  return { created: true, room: data };
}

/** Only the name is editable. `code`, `gridWidth` and `gridHeight` are left as they are. */
export async function updateRoom(id: string, patch: RoomPatch): Promise<Room | null> {
  const { data, error } = await db()
    .from("Room")
    .update({ name: patch.name })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error !== null) throw error;
  return data;
}

/**
 * INV-11: destructive, and the whole cascade happens in one transaction or none of it does —
 * `delete_room` in the first migration.
 *
 * The two counts are returned rather than inferred because after the room is gone there is nothing
 * left to count. INV-06's downgrade for devices on the doomed seats is not covered by any trigger:
 * the `Seat` trigger fires on `UPDATE OF "occupantId"`, not on `DELETE`, so the function detaches
 * the devices explicitly and before the delete. Devices are detached, never deleted — INV-07.
 */
export async function deleteRoom(id: string): Promise<DeleteRoomOutcome> {
  const { data, error } = await db().rpc("delete_room", { p_room_id: id });
  return unwrapRpc<DeleteRoomOutcome>(data, error, "deleteRoom");
}
