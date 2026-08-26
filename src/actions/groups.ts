"use server";

// Server actions for groups — GRP-01.
//
// Every write action runs the same five steps in the order `coding-standards.md` fixes: "use
// server", parse with the Zod schema named in design section 1.3, check permission, call the seam,
// return a typed result. Step 3 is absent on this ticket by specification rather than by oversight,
// and each action says so at the line where the check belongs. See 02-design.md section 2.
//
// Each parameter is `unknown` and is narrowed by its schema inside the action. A server action is a
// network boundary; typing the parameter as `CreateGroupInput` would claim a guarantee the caller
// never had to honour.

import { revalidatePath } from "next/cache";

// **The three write actions revalidate `/groups` and nothing else** — 02-design.md section 1.4,
// step 5.
//
// `grep -rln "groups\|groupId" src/app src/actions src/components` returns exactly two files:
// `src/app/(app)/groups/page.tsx` and `src/app/(app)/layout.tsx`, and the layout holds nav labels
// only. No second route renders group data, which is why this ticket does not repeat MEM-01's
// two-path revalidation.
//
// **`/members` is deliberately not revalidated, although AC-13 writes `Member.groupId`.** MEM-01
// dropped the group column from the member list on purpose — a group id is not a group name and no
// seam function resolves one — so no rendered cell anywhere depends on the field this ticket
// writes. Adding the path would be revalidating a route against a change it cannot display. The
// ticket that restores a group column to `/members` — `GRP-02`, out-of-scope items 1 and 2 — makes
// `/members` a second reader and must add the path in the same change.
//
// `getGroupReferences` does not revalidate. It writes nothing, and revalidating on a read would
// re-render the page every time a delete button is pressed, including the times it is then
// cancelled.

import { groups } from "@/lib/data";
import type { Group, GroupReferences } from "@/lib/data";
import {
  createGroupSchema,
  groupIdOnlySchema,
  updateGroupSchema,
} from "@/lib/validation/group";

export type GroupFieldName = "name" | "parentId";

/**
 * `DUPLICATE_NAME`, `PARENT_NOT_FOUND` and `ANCESTOR_CYCLE` all carry a field map, so one helper
 * renders all three against the input they belong to. `HAS_CHILDREN` carries structure and no
 * sentence, for `MemberActionError`'s reason: AC-12 asserts the children are named, the client
 * composes the sentence and renders the list in its own element, and a caller should not have to
 * parse prose for a name.
 */
export type GroupActionError =
  | { kind: "VALIDATION"; fields: Partial<Record<GroupFieldName, string>> }
  | { kind: "DUPLICATE_NAME"; fields: { name: string } }
  | { kind: "PARENT_NOT_FOUND"; fields: { parentId: string } }
  | { kind: "ANCESTOR_CYCLE"; fields: { parentId: string } }
  | { kind: "HAS_CHILDREN"; references: GroupReferences }
  | { kind: "NOT_FOUND"; message: string };

export type GroupActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: GroupActionError };

// The four message strings, fixed in 02-design.md section 1.4 so that the surface and the tests do
// not each invent one.
const DUPLICATE_NAME_MESSAGE = "That name is already used in that parent.";
const PARENT_GONE_MESSAGE = "That parent group no longer exists.";
const ANCESTOR_CYCLE_MESSAGE =
  "A group cannot be moved inside itself or one of its own child groups.";
const GROUP_GONE_MESSAGE = "That group no longer exists.";

const GROUP_FIELD_NAMES: readonly string[] = ["name", "parentId"];

function isGroupFieldName(value: PropertyKey | undefined): value is GroupFieldName {
  return typeof value === "string" && GROUP_FIELD_NAMES.includes(value);
}

/**
 * The raw `ZodError` never crosses this boundary (coding-standards.md, "Error handling"): it carries
 * the schema's internal shape, and returning it would make the client's rendering depend on Zod's
 * issue format.
 *
 * `updateGroupSchema` and `groupIdOnlySchema` also validate `id`, which is not a `GroupFieldName`
 * and so maps to no entry here. That is deliberate: `id` is never typed by a person, it comes from
 * a rendered row, and the contract's field map covers the fields a form collects.
 */
function fieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[]
): Partial<Record<GroupFieldName, string>> {
  const fields: Partial<Record<GroupFieldName, string>> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    // First message per field wins, as `actions/members.ts` does it. A field can raise several
    // issues and the later ones are usually the less specific.
    if (isGroupFieldName(key) && fields[key] === undefined) fields[key] = issue.message;
  }
  return fields;
}

function validationError(
  issues: readonly { path: PropertyKey[]; message: string }[]
): { ok: false; error: GroupActionError } {
  return { ok: false, error: { kind: "VALIDATION", fields: fieldErrors(issues) } };
}

function notFound(): { ok: false; error: GroupActionError } {
  return { ok: false, error: { kind: "NOT_FOUND", message: GROUP_GONE_MESSAGE } };
}

/** AC-4a, AC-5a, AC-6a. Named against `name`, so the message renders where the value was typed. */
function duplicateName(): { ok: false; error: GroupActionError } {
  return {
    ok: false,
    error: { kind: "DUPLICATE_NAME", fields: { name: DUPLICATE_NAME_MESSAGE } },
  };
}

/** A concurrent delete of the chosen parent. No criterion covers it; the refusal still has to land. */
function parentNotFound(): { ok: false; error: GroupActionError } {
  return {
    ok: false,
    error: { kind: "PARENT_NOT_FOUND", fields: { parentId: PARENT_GONE_MESSAGE } },
  };
}

/** AC-8, and it renders against the parent field because the parent is what was refused. */
function ancestorCycle(): { ok: false; error: GroupActionError } {
  return {
    ok: false,
    error: { kind: "ANCESTOR_CYCLE", fields: { parentId: ANCESTOR_CYCLE_MESSAGE } },
  };
}

/**
 * AC-2, AC-3, AC-4, AC-4a, AC-4b.
 *
 * Two fields reach the seam. Neither refusal below is decided here: both turn on stored data the
 * caller did not supply, and `coding-standards.md` puts that at the seam (02-design.md section 3.1).
 */
export async function createGroup(input: unknown): Promise<GroupActionResult<Group>> {
  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification. 02-design.md section 2 gates this
  // operation at ADMIN — `can(role, "ADMIN")` — and there is no session and no `Member.role` to
  // compare, because the `AUT` feature was withdrawn from the registry on 2026-08-25.
  //
  // The exposure is stated rather than implied: with no gate, anyone who can reach the application
  // can restructure the organization's group tree. The check belongs on this line, and the ticket
  // that builds the session has this comment as an insertion point rather than a search.

  const outcome = await groups.createGroup({
    name: parsed.data.name,
    parentId: parsed.data.parentId,
  });

  if (!outcome.created) {
    if (outcome.reason === "PARENT_NOT_FOUND") return parentNotFound();
    return duplicateName();
  }

  revalidatePath("/groups");
  return { ok: true, data: outcome.group };
}

/**
 * AC-5, AC-5a, AC-6, AC-6a, AC-7, AC-8. One action covers the rename and the move, because they are
 * the same operation with a different field varied — `GroupPatch` carries both either way, and so
 * both reach the same sibling-uniqueness check.
 *
 * The four refusals stay distinguishable all the way out to the client. `ANCESTOR_CYCLE` and
 * `DUPLICATE_NAME_IN_PARENT` are both a refused move (AC-8 and AC-6a), and collapsing them here
 * would let one criterion pass by accident.
 */
export async function updateGroup(input: unknown): Promise<GroupActionResult<Group>> {
  const parsed = updateGroupSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: gated at ADMIN by 02-design.md
  // section 2, no session to read a role from. `Q-6` fixed the four write verbs at ADMIN and the
  // story records that a Manager may not perform any of them.

  const outcome = await groups.updateGroup(parsed.data.id, {
    name: parsed.data.name,
    parentId: parsed.data.parentId,
  });

  if (!outcome.updated) {
    if (outcome.reason === "NOT_FOUND") return notFound();
    if (outcome.reason === "PARENT_NOT_FOUND") return parentNotFound();
    if (outcome.reason === "ANCESTOR_CYCLE") return ancestorCycle();
    return duplicateName();
  }

  revalidatePath("/groups");
  return { ok: true, data: outcome.group };
}

/**
 * AC-12, AC-13. A read, and the only action that does not revalidate.
 *
 * It is what decides which delete dialog opens (F-4). It is not what enforces AC-12 — `deleteGroup`
 * recomputes the same references itself and trusts no caller (02-design.md 1.2, rule 6).
 */
export async function getGroupReferences(
  input: unknown
): Promise<GroupActionResult<GroupReferences>> {
  const parsed = groupIdOnlySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: gated at ADMIN by 02-design.md
  // section 2. It is a read, and it takes the gate of the operation it exists to serve — a caller
  // who may not delete has no use for it, and it discloses how many people are in a department.

  const references = await groups.getGroupReferences(parsed.data.id);
  if (references === null) return notFound();

  return { ok: true, data: references };
}

/**
 * AC-11, AC-12, AC-13, and the answers to Q-1 and Q-2.
 *
 * The `HAS_CHILDREN` refusal is passed through unchanged: the references reach the client as data,
 * and the sentence naming the children is composed there. `membersDetached` is returned because the
 * confirmation stated a number and AC-13 asserts the members survived — the count is the seam's
 * answer to what it actually did.
 */
export async function deleteGroup(
  input: unknown
): Promise<GroupActionResult<{ id: string; membersDetached: number }>> {
  const parsed = groupIdOnlySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: gated at ADMIN by 02-design.md
  // section 2. On the one operation here that removes a row, it is the absence that will matter
  // most.

  const outcome = await groups.deleteGroup(parsed.data.id);
  if (!outcome.deleted) {
    if (outcome.reason === "NOT_FOUND") return notFound();
    return { ok: false, error: { kind: "HAS_CHILDREN", references: outcome.references } };
  }

  revalidatePath("/groups");
  return {
    ok: true,
    data: { id: outcome.groupId, membersDetached: outcome.membersDetached },
  };
}
