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

export const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: roomCodeSchema,
  gridWidth: z.number().int().min(1).max(200),
  gridHeight: z.number().int().min(1).max(200),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
