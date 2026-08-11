import { z } from "zod";

// TODO(verify): mirrors the DRAFT prisma/schema.prisma; changes when it is approved.

export const roleSchema = z.enum(["USER", "MANAGER", "ADMIN"]);

export const createMemberSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  email: z.email().max(254),
  role: roleSchema,
  groupId: z.string().min(1).nullable(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
