import type {
  CreateGroupOutcome,
  DeleteGroupOutcome,
  Group,
  GroupPatch,
  GroupReferences,
  NewGroup,
  UpdateGroupOutcome,
} from "../types";
// `groups` moves from `../fixtures` to `./store` in GRP-01, because this module becomes a writing
// one (02-design.md section 3). `store.ts` re-exports the fixture arrays themselves, so this reads
// and writes the same objects every other mock module holds.
//
// `members` is imported because AC-13 detaches them, and it is read as an array rather than through
// `listMembers()` for the reason `mock/members.ts` gives: a seam module calling another seam
// module's clone-returning read to answer a predicate is a structured clone of the whole collection
// on every delete.
//
// **Nothing else is imported, and that is the mechanism behind AC-10.** There is no path from this
// module to a seat or a device, so "no seat, device or occupancy is touched" is a property of the
// file rather than a discipline anyone has to keep. An import of `seats` or `devices` here is a
// review finding under R8 regardless of what it is used for (02-design.md section 3.1).
import { groups, members } from "./store";

export async function listGroups(): Promise<Group[]> {
  return structuredClone(groups);
}

export async function getGroup(id: string): Promise<Group | null> {
  return structuredClone(groups.find((g) => g.id === id) ?? null);
}

/** Groups nest. Maximum depth is an open question in the glossary, so nothing here assumes one. */
export async function listChildGroups(parentId: string): Promise<Group[]> {
  return structuredClone(groups.filter((g) => g.parentId === parentId));
}

/**
 * AC-2, AC-3, AC-4a.
 *
 * Both refusals are the seam's, because both turn on stored data the caller did not supply.
 * `PARENT_NOT_FOUND` is checked first (rule 2): a parent id that names no group is not a uniqueness
 * question, and answering it as one would report the wrong refusal for a group that was deleted in
 * another tab.
 *
 * Every check runs before the first write (rule 1). `id` is minted here and never read from a
 * caller — `NewGroup` has no field for one.
 */
export async function createGroup(input: NewGroup): Promise<CreateGroupOutcome> {
  if (input.parentId !== null && !groups.some((g) => g.id === input.parentId)) {
    return { created: false, reason: "PARENT_NOT_FOUND" };
  }

  if (siblingNameTaken(input.name, input.parentId, null)) {
    return { created: false, reason: "DUPLICATE_NAME_IN_PARENT" };
  }

  const group: Group = {
    id: crypto.randomUUID(),
    name: input.name,
    parentId: input.parentId,
  };
  groups.push(group);
  return { created: true, group: structuredClone(group) };
}

/**
 * AC-5, AC-5a, AC-6, AC-6a, AC-7, AC-8. One function covers the rename and the move, because they
 * are the same operation with a different field varied — `GroupPatch` carries both either way, and
 * so both reach the same sibling-uniqueness check.
 *
 * The refusal order is rules 2 and 3 and it is a decision rather than an accident:
 *
 * 1. `PARENT_NOT_FOUND`, for the reason `createGroup` gives.
 * 2. `ANCESTOR_CYCLE` before `DUPLICATE_NAME_IN_PARENT`. AC-8 and AC-6a can both be true of one
 *    submission — moving `Engineering` beneath its own child `Platform` while a second `Platform`
 *    sits at the destination. The cycle wins, because the destination's set of siblings is not well
 *    defined inside a cycle, and reporting a name collision for a move that could never have been
 *    performed sends the operator to fix the wrong thing.
 *
 * Every check runs before the first write (rule 1). AC-5's *no other group is changed in any
 * respect*, AC-6a's *no change is saved* and AC-8's *the tree is unchanged* are all assertions about
 * a refusal having written nothing, and a partially applied patch — a new name saved beside a
 * refused parent — fails them even though the illegal state never existed.
 */
export async function updateGroup(id: string, patch: GroupPatch): Promise<UpdateGroupOutcome> {
  const group = groups.find((g) => g.id === id);
  if (group === undefined) return { updated: false, reason: "NOT_FOUND" };

  if (patch.parentId !== null && !groups.some((g) => g.id === patch.parentId)) {
    return { updated: false, reason: "PARENT_NOT_FOUND" };
  }

  if (wouldCycle(id, patch.parentId)) {
    return { updated: false, reason: "ANCESTOR_CYCLE" };
  }

  // A group keeping its own name under its own parent is not a duplicate of itself, which is why
  // this excludes `id` rather than reusing `createGroup`'s test (rule 5).
  if (siblingNameTaken(patch.name, patch.parentId, id)) {
    return { updated: false, reason: "DUPLICATE_NAME_IN_PARENT" };
  }

  group.name = patch.name;
  group.parentId = patch.parentId;
  return { updated: true, group: structuredClone(group) };
}

/**
 * AC-12's predicate, read rather than enforced. The surface calls it to decide which delete dialog
 * to open (02-design.md 1.5, F-4): a group that cannot be deleted is never asked to confirm
 * something that will not happen, so the refusal is raised at the point of request.
 *
 * It is not the enforcement — `deleteGroup` recomputes the same references itself and trusts no
 * caller (rule 6). A surface that asked and a seam that assumed would put AC-12 in the client.
 *
 * Both halves are always returned, empty and zero for a group nothing refers to, because AC-12 and
 * AC-13 must fail independently. A pure read: it writes nothing, and it returns null for a group
 * that does not exist.
 */
export async function getGroupReferences(id: string): Promise<GroupReferences | null> {
  if (!groups.some((g) => g.id === id)) return null;
  return referencesTo(id);
}

/**
 * AC-11, AC-12, AC-13, and the answers to Q-1 and Q-2.
 *
 * **A group with children is refused, not cascaded and not reparented.** Q-1 rejected both
 * alternatives. The refusal carries the references so the message can name the children — ADR-005's
 * requirement, because a bare "cannot delete" sends the operator hunting. It writes nothing on that
 * path at all, which is the strongest way to hold AC-12's *the whole tree is unchanged*.
 *
 * **Its members are detached, not deleted** — Q-2, AC-13, and the reason `invariants_touched` is
 * empty. INV-12 is not engaged because no member is removed: `DeleteGroupOutcome` has no arm that
 * could report having done so, and the only write here is one field on rows that keep existing.
 *
 * `membersDetached` is counted during the write rather than inferred afterwards: once the group is
 * gone there is nothing left to read the membership off.
 *
 * 02-design.md F-5 records that `Group_parentId_fkey` is declared `ON DELETE SET NULL` on
 * `Group.parent` and would therefore perform the silent reparent Q-1 rejected. The refusal is the
 * seam's on both sides; the model disagreeing with it is a human's to resolve under RULE-09.
 *
 * Spliced in place rather than reassigned: `store.ts` exports the array binding and every other mock
 * module holds that same object.
 */
export async function deleteGroup(id: string): Promise<DeleteGroupOutcome> {
  const group = groups.find((g) => g.id === id);
  if (group === undefined) return { deleted: false, reason: "NOT_FOUND" };

  const references = referencesTo(id);
  if (references.childGroupNames.length > 0) {
    return { deleted: false, reason: "HAS_CHILDREN", references };
  }

  let membersDetached = 0;
  for (const member of members) {
    if (member.groupId !== id) continue;
    member.groupId = null;
    membersDetached += 1;
  }

  groups.splice(groups.indexOf(group), 1);
  return { deleted: true, groupId: id, membersDetached };
}

/**
 * The one predicate AC-12 and AC-13 turn on, so the read and the enforcement cannot drift apart. It
 * takes an id that has already been found, and answers only the question of what refers to it.
 *
 * Direct children only — AC-12 refuses on a group having children at all, so a descendant walk would
 * answer a question nobody asked. Names and not ids, sorted, because a cuid names nothing to a
 * person and the refusal dialog renders this list.
 */
function referencesTo(groupId: string): GroupReferences {
  const childGroupNames = groups
    .filter((g) => g.parentId === groupId)
    .map((g) => g.name)
    .sort();
  const memberCount = members.filter((m) => m.groupId === groupId).length;
  return { childGroupNames, memberCount };
}

/**
 * Sibling uniqueness, one predicate called from both write paths (rule 5).
 *
 * Comparison is `===` on the name and `===` on `parentId`, where `null === null` is the top-level
 * case — which is exactly why a database index could not have held this rule: Postgres treats NULL
 * as distinct from NULL, so `@@unique([parentId, name])` would not have refused two top-level groups
 * with the same name (02-design.md F-2, section 7 alternative D).
 *
 * The name is compared as given. `groupNameSchema` trims before this is reached, so `  Platform  `
 * arrives as `Platform` and collides; trimming again here would be the same rule in two places.
 * The comparison is exact and not case-folded — `Platform` and `platform` may sit under one parent,
 * and refusing that would be a rule this ticket invented (F-2, section 7 alternative H).
 *
 * `excludeId` is null on the create path, which excludes nothing because no group has a null id.
 */
function siblingNameTaken(name: string, parentId: string | null, excludeId: string | null): boolean {
  return groups.some((g) => g.id !== excludeId && g.parentId === parentId && g.name === name);
}

/**
 * AC-8's refusal (rule 4). It climbs `parentId` from the PROPOSED parent and refuses if it reaches
 * the group's own id.
 *
 * `parentId === id` — setting a group's parent to itself, AC-8's second clause — falls out of the
 * same walk on step zero and needs no special case.
 *
 * **The walk is bounded, and the bound is not defensive noise.** The store is a process-global
 * mutable array, so a walk over data that is already cyclic would hang the server rather than fail a
 * test. More steps than there are groups cannot be a legal chain, so it is refused.
 *
 * A chain that reaches a `parentId` naming no group terminates without a cycle. The direct parent is
 * checked by the caller before this runs, so that state is a corrupt store rather than a reachable
 * input, and the walk reports what it actually found: it did not reach `id`.
 */
function wouldCycle(id: string, proposedParentId: string | null): boolean {
  let cursor = proposedParentId;
  let steps = 0;

  while (cursor !== null) {
    if (cursor === id) return true;
    if (steps > groups.length) return true;

    const parent = groups.find((g) => g.id === cursor);
    if (parent === undefined) return false;

    cursor = parent.parentId;
    steps += 1;
  }

  return false;
}
