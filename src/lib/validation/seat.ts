import { z } from "zod";

// Zod schemas are the contract's runtime half. The field names here must match 02-design.md section 1
// exactly (RULE-04) — a schema that accepts a field the contract does not name is how an invented
// name reaches the database.
//
// TODO(verify): these mirror the DRAFT prisma/schema.prisma. They change when it is approved.

export const seatIdSchema = z.string().trim().min(1);

// AC-9's "no member chosen" is refused here and nowhere else. The occupant control is a `<select>`
// whose first option is a placeholder with `value=""`, so an unmade choice submits the empty string
// and fails `.min(1)`. No `required` attribute is relied on: that is a browser affordance, and the
// server action is a network boundary.
export const occupantIdSchema = z.string().trim().min(1);

// The form field is named `occupantId`, not `memberId`. It names the role the member plays on this
// seat and it is the field it lands in (`Seat.occupantId`); the glossary defines an Occupant as the
// person currently assigned to a seat. The seam parameter stays `memberId`, because at that boundary
// it is an id of a member and nothing yet makes it an occupant (02-design.md section 1.3).
export const assignSeatSchema = z.object({
  seatId: seatIdSchema,
  occupantId: occupantIdSchema,
});

export const releaseSeatSchema = z.object({ seatId: seatIdSchema });

export type AssignSeatInput = z.infer<typeof assignSeatSchema>;
export type ReleaseSeatInput = z.infer<typeof releaseSeatSchema>;

// No `seatCodeSchema` and no `gridX`. Nothing on this surface creates a seat or moves one —
// 01-story.md out-of-scope items 1 and 2.
