"use server";

// Server actions for rooms — ROO-01.
//
// Every write action runs the same five steps in the order `coding-standards.md` fixes: "use
// server", parse with the Zod schema named in design section 1, check permission, call the seam,
// return a typed result. Step 3 is absent on this ticket by specification rather than by oversight,
// and each action says so at the line where the check belongs. See 02-design.md section 2.
//
// Each parameter is `unknown` and is narrowed by its schema inside the action. A server action is a
// network boundary; typing the parameter as `CreateRoomInput` would claim a guarantee the caller
// never had to honour.

import { revalidatePath } from "next/cache";

import { rooms } from "@/lib/data";
import type { Room } from "@/lib/data";
import { createRoomSchema, deleteRoomSchema, updateRoomSchema } from "@/lib/validation/room";

export type RoomFieldName = "name" | "code" | "gridWidth" | "gridHeight";

export type RoomActionError =
  | { kind: "VALIDATION"; fields: Partial<Record<RoomFieldName, string>> }
  | { kind: "DUPLICATE_CODE"; fields: { code: string } }
  | { kind: "NOT_FOUND"; message: string };

export type RoomActionResult<T> = { ok: true; data: T } | { ok: false; error: RoomActionError };

export type DeleteRoomData = { id: string; seatsDeleted: number; devicesDetached: number };

const ROOM_FIELD_NAMES: readonly string[] = ["name", "code", "gridWidth", "gridHeight"];

function isRoomFieldName(value: PropertyKey | undefined): value is RoomFieldName {
  return typeof value === "string" && ROOM_FIELD_NAMES.includes(value);
}

/**
 * `VALIDATION.fields` is a map rather than a single field because AC-3 requires a message against
 * *each* offending field, and a one-field error cannot express two blank inputs.
 *
 * The raw `ZodError` never crosses this boundary (coding-standards.md, "Error handling"): it
 * carries the schema's internal shape, and returning it would make the client's rendering depend on
 * Zod's issue format.
 *
 * `updateRoomSchema` and `deleteRoomSchema` also validate `id`, which is not a `RoomFieldName` and
 * so maps to no entry here. That is deliberate: `id` is never typed by a user, it comes from a
 * rendered row, and the contract's field map covers the four fields a form collects.
 */
function fieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[]
): Partial<Record<RoomFieldName, string>> {
  const fields: Partial<Record<RoomFieldName, string>> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    // First message per field wins. A field can raise several issues and the later ones are
    // usually the less specific, so overwriting would degrade the message AC-3 asks for.
    if (isRoomFieldName(key) && fields[key] === undefined) fields[key] = issue.message;
  }
  return fields;
}

export async function getRooms(): Promise<Room[]> {
  return rooms.listRooms();
}

export async function createRoom(input: unknown): Promise<RoomActionResult<Room>> {
  const parsed = createRoomSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { kind: "VALIDATION", fields: fieldErrors(parsed.error.issues) } };
  }

  // Step 3 — permission check. NOT IMPLEMENTED, by specification. ROO-01 enforces no rank check on
  // any room operation: no session exists to read a role from. See 01-story.md out-of-scope item 5,
  // which carries the guard to the AUT group. When it is built it goes on this line, as a `can()`
  // comparison against ROLE_RANK — not in PermissionGate, which hides a control and does not
  // protect an operation.

  const outcome = await rooms.createRoom(parsed.data);
  if (!outcome.created) {
    // AC-12. The refusal is the seam's (Room.code is @unique); this only names the field it belongs
    // against, so the message renders where the user typed the value.
    return {
      ok: false,
      error: { kind: "DUPLICATE_CODE", fields: { code: "That code is already in use." } },
    };
  }

  revalidatePath("/rooms");
  return { ok: true, data: outcome.room };
}

export async function renameRoom(input: unknown): Promise<RoomActionResult<Room>> {
  const parsed = updateRoomSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { kind: "VALIDATION", fields: fieldErrors(parsed.error.issues) } };
  }

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: no rank check, no session.
  // 01-story.md out-of-scope item 5, AUT group. The check belongs on this line.

  // AC-4: only the name is sent, so code, gridWidth and gridHeight cannot be touched by a rename.
  const room = await rooms.updateRoom(parsed.data.id, { name: parsed.data.name });
  if (room === null) {
    return { ok: false, error: { kind: "NOT_FOUND", message: "That room no longer exists." } };
  }

  revalidatePath("/rooms");
  return { ok: true, data: room };
}

/**
 * INV-11. The cascade itself is the seam's; this action's job is to carry its counts back so the
 * caller can report what was destroyed. `seatsDeleted` is the number AC-6 asserts and
 * `devicesDetached` is the AC-14 side of it.
 */
export async function deleteRoom(input: unknown): Promise<RoomActionResult<DeleteRoomData>> {
  const parsed = deleteRoomSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { kind: "VALIDATION", fields: fieldErrors(parsed.error.issues) } };
  }

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: no rank check, no session.
  // 01-story.md out-of-scope item 5, AUT group. The check belongs on this line, and on a
  // permanently destructive operation it is the one that will matter most.

  const outcome = await rooms.deleteRoom(parsed.data.id);
  if (!outcome.deleted) {
    return { ok: false, error: { kind: "NOT_FOUND", message: "That room no longer exists." } };
  }

  revalidatePath("/rooms");
  return {
    ok: true,
    data: {
      id: parsed.data.id,
      seatsDeleted: outcome.seatsDeleted,
      devicesDetached: outcome.devicesDetached,
    },
  };
}
