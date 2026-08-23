import { z } from "zod";

// Zod schemas are the contract's runtime half. The field names here must match design section 1
// exactly (RULE-04) — a schema that accepts a field the contract does not name is how an invented
// name reaches the database.
//
// TODO(verify): these mirror the DRAFT prisma/schema.prisma. They change when it is approved.

export const roomCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[A-Z0-9-]+$/, "A room code is uppercase letters, digits, and hyphens.");

// `.trim()` runs before `.min(1)`, so "   " fails rather than passing as three characters (AC-3).
// Extracted from the inline rule `createRoomSchema` used to carry so the create and rename paths
// cannot drift: a name that is acceptable at creation and rejected at rename would be a rule that
// exists in two places and agrees in neither.
export const roomNameSchema = z.string().trim().min(1).max(120);

export const roomIdSchema = z.string().trim().min(1);

// `.int()` rejects 2.5 and `.min(1)` rejects 0 and -4, which is AC-13 exactly, and INV-10's
// mechanism on this ticket: a room created with a zero or negative dimension hands the Layout
// Designer a coordinate space in which no placement is well defined.
//
// `z.coerce.number()` is deliberately NOT used. It turns "" into 0, and this schema must be able to
// tell a caller that sent nothing from a caller that sent zero. The client coerces instead, with
// `Number(value)`; the trap that survives either choice is that `Number("")` is also 0, so an empty
// grid input lands on `.min(1)` rather than on the NaN path. AC-3 and AC-13 both want a message
// against the field, and both get one.
const gridDimensionSchema = z.number().int().min(1).max(200);

export const createRoomSchema = z.object({
  name: roomNameSchema,
  code: roomCodeSchema,
  gridWidth: gridDimensionSchema,
  gridHeight: gridDimensionSchema,
});

export const updateRoomSchema = z.object({
  id: roomIdSchema,
  name: roomNameSchema,
});

export const deleteRoomSchema = z.object({
  id: roomIdSchema,
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type DeleteRoomInput = z.infer<typeof deleteRoomSchema>;
