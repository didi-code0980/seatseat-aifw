import type {
  CreateGroupOutcome,
  DeleteGroupOutcome,
  Group,
  GroupPatch,
  GroupReferences,
  NewGroup,
  UpdateGroupOutcome,
} from "../types";
import { db, unwrapRpc } from "./client";

// This module names no seat and no device. "No seat, device or occupancy is touched" is a property
// of the import list rather than a discipline anyone has to keep.

const COLUMNS = "id, name, parentId";

export async function listGroups(): Promise<Group[]> {
  const { data, error } = await db().from("Group").select(COLUMNS).order("id");
  if (error !== null) throw error;
  return data;
}

export async function getGroup(id: string): Promise<Group | null> {
  const { data, error } = await db().from("Group").select(COLUMNS).eq("id", id).maybeSingle();
  if (error !== null) throw error;
  return data;
}

/** Groups nest. Maximum depth is an open question in the glossary, so nothing here assumes one. */
export async function listChildGroups(parentId: string): Promise<Group[]> {
  const { data, error } = await db()
    .from("Group")
    .select(COLUMNS)
    .eq("parentId", parentId)
    .order("id");
  if (error !== null) throw error;
  return data;
}

/**
 * Both refusals are the seam's on both sides of `DATA_SOURCE`, and the second one CANNOT be the
 * schema's. Postgres treats NULL as distinct from NULL, so a unique index over
 * `("parentId", "name")` would not refuse two top-level groups sharing a name — which is exactly
 * the case `DUPLICATE_NAME_IN_PARENT` covers. The first migration therefore carries no such index
 * and says so, and this check is the only mechanism on either side.
 *
 * `PARENT_NOT_FOUND` is checked first: a parent id that names no group is not a uniqueness
 * question, and answering it as one reports the wrong refusal for a group deleted in another tab.
 *
 * Every check runs before the insert. `id` is minted here and never read from a caller.
 */
export async function createGroup(input: NewGroup): Promise<CreateGroupOutcome> {
  if (input.parentId !== null && !(await exists(input.parentId))) {
    return { created: false, reason: "PARENT_NOT_FOUND" };
  }
  const siblings = await listSiblings(input.parentId);
  if (siblings.some((g) => g.name === input.name)) {
    return { created: false, reason: "DUPLICATE_NAME_IN_PARENT" };
  }

  const { data, error } = await db()
    .from("Group")
    .insert({ id: crypto.randomUUID(), name: input.name, parentId: input.parentId })
    .select(COLUMNS)
    .single();
  if (error !== null) throw error;
  return { created: true, group: data };
}

/**
 * One function covers the rename and the move, because they are the same operation with a different
 * field varied — `GroupPatch` carries both either way, so both reach the same sibling check.
 *
 * The refusal order is a decision rather than an accident. `ANCESTOR_CYCLE` precedes
 * `DUPLICATE_NAME_IN_PARENT` because both can be true of one submission — moving `Engineering`
 * beneath its own child `Platform` while a second `Platform` sits at the destination — and the
 * cycle wins: the destination's set of siblings is not well defined inside a cycle, and reporting a
 * name collision for a move that could never have been performed sends the operator to fix the
 * wrong thing.
 *
 * Every check runs before the update. A partially applied patch — a new name saved beside a refused
 * parent — would fail *no change is saved* even though the illegal state never existed.
 */
export async function updateGroup(id: string, patch: GroupPatch): Promise<UpdateGroupOutcome> {
  const all = await listGroups();
  if (!all.some((g) => g.id === id)) return { updated: false, reason: "NOT_FOUND" };

  if (patch.parentId !== null && !all.some((g) => g.id === patch.parentId)) {
    return { updated: false, reason: "PARENT_NOT_FOUND" };
  }
  if (wouldCycle(all, id, patch.parentId)) {
    return { updated: false, reason: "ANCESTOR_CYCLE" };
  }
  // A group keeping its own name under its own parent is not a duplicate of itself, which is why
  // this excludes `id` rather than reusing `createGroup`'s test.
  if (all.some((g) => g.id !== id && g.parentId === patch.parentId && g.name === patch.name)) {
    return { updated: false, reason: "DUPLICATE_NAME_IN_PARENT" };
  }

  const { data, error } = await db()
    .from("Group")
    .update({ name: patch.name, parentId: patch.parentId })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error !== null) throw error;
  if (data === null) return { updated: false, reason: "NOT_FOUND" };
  return { updated: true, group: data };
}

/**
 * The predicate the delete refusal turns on, read rather than enforced. The surface calls it to
 * decide which delete dialog to open, so a group that cannot be deleted is never asked to confirm
 * something that will not happen.
 *
 * It is NOT the enforcement — `delete_group` recomputes the same references inside its own
 * transaction. Direct children only: the refusal turns on a group having children at all, so a
 * descendant walk would answer a question nobody asked. Names and not ids, sorted, because a uuid
 * names nothing to a person.
 */
export async function getGroupReferences(id: string): Promise<GroupReferences | null> {
  if (!(await exists(id))) return null;

  const [children, members] = await Promise.all([
    db().from("Group").select("name").eq("parentId", id),
    db().from("Member").select("id", { count: "exact", head: true }).eq("groupId", id),
  ]);
  if (children.error !== null) throw children.error;
  if (members.error !== null) throw members.error;

  return {
    childGroupNames: children.data.map((g) => g.name).sort(),
    memberCount: members.count ?? 0,
  };
}

/**
 * A group with children is REFUSED, not cascaded and not reparented, and the refusal carries the
 * child names so the message can say what is blocking it. Its members are DETACHED, not deleted —
 * INV-12 is not engaged, because no member is removed and `DeleteGroupOutcome` has no arm that
 * could report having done so.
 *
 * `delete_group` does both in one transaction. `membersDetached` is counted during the write: once
 * the group is gone there is nothing left to read the membership off. `Group_parentId_fkey` is
 * `ON DELETE SET NULL` and would perform the silent reparent the refusal exists to prevent — the
 * refusal is what keeps that path unreachable.
 */
export async function deleteGroup(id: string): Promise<DeleteGroupOutcome> {
  const { data, error } = await db().rpc("delete_group", { p_group_id: id });
  return unwrapRpc<DeleteGroupOutcome>(data, error, "deleteGroup");
}

async function exists(id: string): Promise<boolean> {
  const { count, error } = await db()
    .from("Group")
    .select("id", { count: "exact", head: true })
    .eq("id", id);
  if (error !== null) throw error;
  return (count ?? 0) > 0;
}

/**
 * Siblings under a parent, where "no parent" IS a parent value and not a separate rule. PostgREST
 * spells the two cases differently — `.is("parentId", null)` against `.eq("parentId", id)` — which
 * is the same NULL-is-not-a-value fact that stops a unique index holding this rule.
 */
async function listSiblings(parentId: string | null): Promise<Group[]> {
  const base = db().from("Group").select(COLUMNS);
  const { data, error } = await (parentId === null
    ? base.is("parentId", null)
    : base.eq("parentId", parentId));
  if (error !== null) throw error;
  return data;
}

/**
 * The cycle refusal. It climbs `parentId` from the PROPOSED parent and refuses if it reaches the
 * group's own id; `parentId === id` falls out of the same walk on step zero and needs no special
 * case.
 *
 * It walks a list already read in one query rather than issuing one request per level — a recursive
 * read over the network would make the depth of the tree the cost of every move, and the whole
 * collection is what `updateGroup` needed anyway for the sibling check.
 *
 * The walk is bounded: more steps than there are groups cannot be a legal chain, so it is refused
 * rather than followed. A chain reaching a `parentId` naming no group terminates without a cycle —
 * the direct parent is checked by the caller before this runs, so that state is corrupt data rather
 * than a reachable input, and the walk reports what it actually found.
 */
function wouldCycle(all: Group[], id: string, proposedParentId: string | null): boolean {
  let cursor = proposedParentId;
  let steps = 0;

  while (cursor !== null) {
    if (cursor === id) return true;
    if (steps > all.length) return true;

    const parent = all.find((g) => g.id === cursor);
    if (parent === undefined) return false;

    cursor = parent.parentId;
    steps += 1;
  }

  return false;
}
