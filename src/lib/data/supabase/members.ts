import type {
  AssignMemberToGroupOutcome,
  CreateMemberOutcome,
  DeleteMemberOutcome,
  Member,
  MemberPatch,
  MemberReferences,
  NewMember,
  UpdateMemberOutcome,
} from "../types";
import { db, FOREIGN_KEY_VIOLATION, isCode, UNIQUE_VIOLATION, unwrapRpc } from "./client";

const COLUMNS = "id, fullName, email, role, groupId";

export async function listMembers(): Promise<Member[]> {
  const { data, error } = await db().from("Member").select(COLUMNS).order("id");
  if (error !== null) throw error;
  return data;
}

export async function getMember(id: string): Promise<Member | null> {
  const { data, error } = await db().from("Member").select(COLUMNS).eq("id", id).maybeSingle();
  if (error !== null) throw error;
  return data;
}

/**
 * `Member_email_key` is what refuses a duplicate, so this is the seam agreeing with the schema
 * rather than adding a rule of its own. The comparison is Postgres's and therefore case-sensitive,
 * exactly as the mock's is — matching case-insensitively here would be a stricter rule than the
 * schema imposes.
 *
 * `groupId` is written literally as null rather than taken from `input`, which is what makes
 * "created into no group" a property of this function rather than of its callers — `NewMember` has
 * no field for one.
 *
 * INV-08: it writes to `Member` and to nothing else. In particular it creates no `Account` row and
 * there is no code path from here to one, which is the mechanism rather than the discipline.
 */
export async function createMember(input: NewMember): Promise<CreateMemberOutcome> {
  const { data, error } = await db()
    .from("Member")
    .insert({
      id: crypto.randomUUID(),
      fullName: input.fullName,
      email: input.email,
      role: input.role,
      groupId: null,
    })
    .select(COLUMNS)
    .single();
  if (isCode(error, UNIQUE_VIOLATION)) return { created: false, reason: "DUPLICATE_EMAIL" };
  if (error !== null) throw error;
  return { created: true, member: data };
}

/**
 * Three fields are editable and neither `id` nor `groupId` is among them — `MemberPatch` has no
 * field for either, so an edit cannot move a member between groups whatever the caller sends.
 *
 * ONE STATEMENT, so there is no partial patch to observe: the refusal writes nothing because the
 * unique index refuses the whole row, not a field of it. A member keeping its own address is not a
 * duplicate of itself, which the index gives for free where the mock needs an explicit exclusion.
 *
 * It touches no seat and no device: changing a role or an address is not an occupancy change and
 * not a change of device ownership.
 */
export async function updateMember(id: string, patch: MemberPatch): Promise<UpdateMemberOutcome> {
  const { data, error } = await db()
    .from("Member")
    .update({ fullName: patch.fullName, email: patch.email, role: patch.role })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (isCode(error, UNIQUE_VIOLATION)) return { updated: false, reason: "DUPLICATE_EMAIL" };
  if (error !== null) throw error;
  if (data === null) return { updated: false, reason: "NOT_FOUND" };
  return { updated: true, member: data };
}

/**
 * `previousGroupId` is the one value PostgREST cannot return, because it is `OLD.groupId` and an
 * update returns the new row. So the member is read first — which is also where `MEMBER_NOT_FOUND`
 * is decided, keeping the mock's check order — and the update follows.
 *
 * TWO REQUESTS, DELIBERATELY NOT A POSTGRES FUNCTION. 02-design.md 1.4 enumerates the operations
 * that become functions and this is not one of them: the only value at risk in the window between
 * the two is `previousGroupId`, which is reported and not enforced, and no invariant is held by it.
 * Adding a function anyway is what that section calls a review finding.
 *
 * `GROUP_NOT_FOUND` is the schema's refusal, read off `Member_groupId_fkey`: whether the chosen
 * group still exists is stored data the caller did not supply, and the chooser was rendered from a
 * read taken before it was deleted.
 */
export async function assignMemberToGroup(
  memberId: string,
  groupId: string
): Promise<AssignMemberToGroupOutcome> {
  const existing = await getMember(memberId);
  if (existing === null) return { assigned: false, reason: "MEMBER_NOT_FOUND" };

  const { data, error } = await db()
    .from("Member")
    .update({ groupId })
    .eq("id", memberId)
    .select(COLUMNS)
    .maybeSingle();
  if (isCode(error, FOREIGN_KEY_VIOLATION)) return { assigned: false, reason: "GROUP_NOT_FOUND" };
  if (error !== null) throw error;
  if (data === null) return { assigned: false, reason: "MEMBER_NOT_FOUND" };
  return { assigned: true, member: data, previousGroupId: existing.groupId };
}

/**
 * INV-12's predicate, read rather than enforced. The surface calls it to decide which delete dialog
 * to open, so a member who cannot be deleted is never asked to confirm something that will not
 * happen.
 *
 * It is NOT the enforcement — `deleteMember` recomputes both halves inside its own transaction and
 * trusts no caller. A surface that asked and a seam that assumed would put the invariant in the
 * client.
 *
 * Both halves are always returned, empty and zero for a member nothing refers to, because the two
 * must fail independently: a system enforcing occupancy alone would pass a combined test while
 * stranding equipment. Seat CODES, sorted, because a uuid names nothing to a person.
 */
export async function getMemberReferences(id: string): Promise<MemberReferences | null> {
  const member = await getMember(id);
  if (member === null) return null;

  const [seats, devices] = await Promise.all([
    db().from("Seat").select("code").eq("occupantId", id),
    db().from("Device").select("id", { count: "exact", head: true }).eq("ownerId", id),
  ]);
  if (seats.error !== null) throw seats.error;
  if (devices.error !== null) throw devices.error;

  return {
    occupiedSeatCodes: seats.data.map((s) => s.code).sort(),
    ownedDeviceCount: devices.count ?? 0,
  };
}

/**
 * INV-12 and ADR-005: a member who occupies a seat or owns a device may not be deleted, and the
 * deletion is REFUSED rather than cascaded. `delete_member` reads the blockers and deletes in one
 * transaction — two round trips would be a time-of-check-to-time-of-use window in which the last
 * blocker disappears and the refusal is wrong.
 *
 * `ON DELETE RESTRICT` on `Seat.occupantId` and `Device.ownerId` is the backstop underneath it, and
 * it is a change from the draft schema's `SetNull`: with SET NULL the database would silently
 * vacate every seat underneath a refusal the seam is meant to give.
 */
export async function deleteMember(id: string): Promise<DeleteMemberOutcome> {
  const { data, error } = await db().rpc("delete_member", { p_member_id: id });
  return unwrapRpc<DeleteMemberOutcome>(data, error, "deleteMember");
}
