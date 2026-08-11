import { z } from "zod";

// TODO(verify): mirrors the DRAFT prisma/schema.prisma; changes when it is approved.

export const deviceRankSchema = z.enum(["PRIMARY", "SECONDARY"]);

export const createDeviceSchema = z.object({
  assetTag: z.string().trim().min(1).max(64),
  model: z.string().trim().min(1).max(120),
  // INV-07: a device may exist with no owner and no seat, so both are nullable rather than optional.
  ownerId: z.string().min(1).nullable(),
  seatId: z.string().min(1).nullable(),
  rank: deviceRankSchema,
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
