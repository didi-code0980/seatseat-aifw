import { z } from "zod";

// Zod schemas are the contract's runtime half. The field names here must match design section 1
// exactly (RULE-04) — a schema that accepts a field the contract does not name is how an invented
// name reaches the database.
//
// TODO(verify): these mirror the DRAFT prisma/schema.prisma. They change when it is approved.

// Phase B scaffold, kept. DEV-01 replaces `createDeviceSchema` because design section 1.3 gives it
// a different shape — three collected fields, no `seatId` and no `rank` — but nothing in this ticket
// asks for this enum to go, and it was not written by DEV-01. `DeviceRank` crosses the seam as a
// value the seam itself sets (02-design.md 1.2, rules 1, 3 and 4); no form collects one.
export const deviceRankSchema = z.enum(["PRIMARY", "SECONDARY"]);

// `.trim()` runs before `.min(1)`, so "   " fails rather than passing as three characters (AC-3).
//
// No format regex. `Device.assetTag` carries `@unique` and no pattern (prisma/schema.prisma:185),
// and a format rule invented here would refuse values the model accepts. The upper bounds are a UI
// sanity limit and are not from the model — the column is an unbounded `text` — which is the same
// class of choice `roomNameSchema` makes and is recorded as such rather than presented as a
// constraint the domain imposes.
export const deviceAssetTagSchema = z.string().trim().min(1).max(64);
export const deviceModelSchema = z.string().trim().min(1).max(120);

export const deviceIdSchema = z.string().trim().min(1);

// AC-3's "no owner chosen" is refused here and nowhere else. The owner control is a `<select>` whose
// first option is a placeholder with `value=""`, so an unmade choice submits the empty string and
// fails `.min(1)`. There is no separate "is one selected" check and no reliance on a `required`
// attribute: that is a browser affordance, and the server action is a network boundary.
export const deviceOwnerIdSchema = z.string().trim().min(1);
export const deviceSeatIdSchema = z.string().trim().min(1);

export const createDeviceSchema = z.object({
  assetTag: deviceAssetTagSchema,
  model: deviceModelSchema,
  ownerId: deviceOwnerIdSchema,
});

// One schema for a field on both paths, for the reason `roomNameSchema` was extracted: a value
// acceptable at creation and rejected at edit is a rule that exists in two places and agrees in
// neither. `seatId` and `rank` are absent — an attribute edit may not move a device or change its
// designation (AC-4), and the schema is where that is refused rather than merely not offered.
export const updateDeviceSchema = z.object({
  id: deviceIdSchema,
  assetTag: deviceAssetTagSchema,
  model: deviceModelSchema,
  ownerId: deviceOwnerIdSchema,
});

export const assignDeviceSchema = z.object({
  id: deviceIdSchema,
  seatId: deviceSeatIdSchema,
});

export const unassignDeviceSchema = z.object({ id: deviceIdSchema });
export const designatePrimaryDeviceSchema = z.object({ id: deviceIdSchema });
export const deleteDeviceSchema = z.object({ id: deviceIdSchema });

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type AssignDeviceInput = z.infer<typeof assignDeviceSchema>;
