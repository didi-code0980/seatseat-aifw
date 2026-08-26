import { z } from "zod";

// Zod schemas are the contract's runtime half. The field names here must match 02-design.md section
// 1.3 exactly (RULE-04) — a schema that accepts a field the contract does not name is how an
// invented name reaches the database.
//
// TODO(verify): these mirror the DRAFT prisma/schema.prisma. They change when it is approved.
//
// **No schema here refuses a duplicate name and none refuses a cycle.** Both are facts about stored
// data rather than about the submitted value, and `coding-standards.md` puts them at the seam. A Zod
// refinement that reached into the store to answer them would be the authorization-check-in-the-UI
// mistake with a different subject.

// `.trim()` runs before `.min(1)`, so "   " fails rather than passing as three characters (AC-4).
// It is also what makes `  Platform  ` collide with an existing `Platform`: the seam compares the
// value it is handed, and this is where that value is normalised (02-design.md section 6.4 item 2).
export const groupNameSchema = z.string().trim().min(1, "A name is required.").max(120);

export const groupIdSchema = z.string().trim().min(1);

/**
 * The parent select's placeholder carries `value=""`, which is how "no parent chosen" reaches the
 * server (AC-2, AC-7). It is mapped to null HERE rather than in the action or the seam, so that
 * `NewGroup.parentId` and `GroupPatch.parentId` are `string | null` and the empty string is not a
 * third state anything downstream has to know about.
 *
 * `z.literal("")` is first in the union deliberately: `groupIdSchema` would reject "" with a message
 * about a required field, and a top-level group is not a validation failure.
 */
export const groupParentIdSchema = z.union([
  z.literal("").transform(() => null),
  z.null(),
  groupIdSchema,
]);

// One schema per field on both paths, for the reason `roomNameSchema` was extracted: a value
// acceptable at creation and rejected at edit is a rule that exists in two places and agrees in
// neither.
export const createGroupSchema = z.object({
  name: groupNameSchema,
  parentId: groupParentIdSchema,
});

export const updateGroupSchema = z.object({
  id: groupIdSchema,
  name: groupNameSchema,
  parentId: groupParentIdSchema,
});

// `getGroupReferences` and `deleteGroup` both take an id and nothing else.
export const groupIdOnlySchema = z.object({ id: groupIdSchema });

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
