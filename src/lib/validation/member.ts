import { z } from "zod";

// Zod schemas are the contract's runtime half. The field names here must match design section 1
// exactly (RULE-04) — a schema that accepts a field the contract does not name is how an invented
// name reaches the database.
//
// TODO(verify): these mirror the DRAFT prisma/schema.prisma. They change when it is approved.

// `.trim()` runs before `.min(1)`, so "   " fails rather than passing as three characters (AC-3).
export const memberFullNameSchema = z.string().trim().min(1, "A name is required.").max(120);

// `.min(1)` is placed BEFORE `.email()` deliberately, and the order is load-bearing. Zod 4 reports
// every failing check on a field, and the action's `fieldErrors` helper takes the first message per
// field — so a blank input reports "An email address is required." rather than "That is not a valid
// email address.", which is the message AC-3's blank case wants. Reversing the two silently degrades
// the message and no type or test would notice.
//
// The format check itself is finding F-3: `prisma/schema.prisma:164` types this column `String` with
// no pattern, so refusing `banana` is this design's judgement and not a transcription. `.max(254)` is
// the practical address limit and is likewise not from the model.
export const memberEmailSchema = z
  .string()
  .trim()
  .min(1, "An email address is required.")
  .email("That is not a valid email address.")
  .max(254);

// A three-value enum, not free text (A-3). `rbac-and-security.md` fixes ROLE_RANK as
// USER < MANAGER < ADMIN, and a fourth value is one no rank comparison has a result for. The values
// are transcribed from the `Role` DTO in src/lib/data/types.ts; they are not invented here.
export const memberRoleSchema = z.enum(["USER", "MANAGER", "ADMIN"]);

/**
 * The Phase B scaffold's name for the same enum, kept because nothing in this ticket asks for it to
 * go and it was not written by MEM-01. It is an alias rather than a second `z.enum(...)`: two
 * definitions of one three-value set is a rule that exists in two places and can disagree in one.
 */
export const roleSchema = memberRoleSchema;

export const memberIdSchema = z.string().trim().min(1);

export const createMemberSchema = z.object({
  fullName: memberFullNameSchema,
  email: memberEmailSchema,
  role: memberRoleSchema,
});

// One schema per field on both paths, for the reason `roomNameSchema` was extracted: a value
// acceptable at creation and rejected at edit is a rule that exists in two places and agrees in
// neither. `groupId` is absent from both — group membership is out-of-scope item 5, no form field
// collects one, and the seam writes null (02-design.md 1.1).
export const updateMemberSchema = z.object({
  id: memberIdSchema,
  fullName: memberFullNameSchema,
  email: memberEmailSchema,
  role: memberRoleSchema,
});

// `getMemberReferences` and `deleteMember` both take an id and nothing else.
export const memberIdOnlySchema = z.object({ id: memberIdSchema });

/**
 * GRP-02. A group id, required.
 *
 * It is NOT `groupParentIdSchema` from `./group`, and the difference is the whole of out-of-scope
 * item 2. That schema maps `z.literal("")` to null because a top-level group legitimately has no
 * parent; here the empty string arrives from the chooser's placeholder and mapping it to null would
 * silently build the "remove from group" verb the story neither grants nor refuses (Q-4), with no
 * criterion to fail. 02-design.md F-4 and section 7 alternative E.
 *
 * It carries its own message rather than reusing `groupIdSchema`, which has none: the action's
 * `fieldErrors` helper renders the first message per field, and Zod's default for `.min(1)` is not
 * a sentence anyone should read.
 */
export const memberGroupIdSchema = z.string().trim().min(1, "A group is required.");

/** AC-3, AC-4. The id comes from a rendered row; the group id comes from the chooser. */
export const assignMemberToGroupSchema = z.object({
  id: memberIdSchema,
  groupId: memberGroupIdSchema,
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type AssignMemberToGroupInput = z.infer<typeof assignMemberToGroupSchema>;
