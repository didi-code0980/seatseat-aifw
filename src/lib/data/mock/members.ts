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
// `seats` and `devices` are imported because INV-12 is a fact about seats and devices and cannot be
// evaluated without both. `store.ts` re-exports the fixture arrays themselves, so this module reads
// through the same objects `mock/seats.ts` and `mock/devices.ts` write (02-design.md section 3).
//
// They are read as arrays rather than through `listSeats()` and `listDevices()`, because a seam
// module calling another seam module's clone-returning read to answer a predicate is two structured
// clones of the whole collection on every delete.
//
// GRP-02 adds `groups` for the same reason and on the same terms: `assignMemberToGroup` has to
// answer "does this group still exist" (AC-6), which is stored data the caller did not supply, and
// reading it through `listGroups()` would be a structured clone of the whole collection on every
// write. It is READ and never written — a write to `groups` from this module is a review finding
// under R8 regardless of what it is used for (02-design.md section 3.1). There is no cycle: this
// module and `mock/groups.ts` both import `./store` and neither imports the other.
import { devices, groups, members, seats } from "./store";

export async function listMembers(): Promise<Member[]> {
  return structuredClone(members);
}

export async function getMember(id: string): Promise<Member | null> {
  return structuredClone(members.find((m) => m.id === id) ?? null);
}

/**
 * AC-2, and F-1. `Member.email` is unique — constraint `Member_email_key` in
 * `supabase/migrations/20260826094134_init.sql` — so refusing a duplicate is
 * the seam agreeing with the model rather than adding a rule of its own — a mock that accepted a
 * second `ada@example.internal` would accept data the database rejects. It returns a refusal instead
 * of throwing: an address already in use is an expected failure, not a programmer error
 * (coding-standards.md, "Error handling").
 *
 * The comparison is exact, not case-folded. `@unique` in Postgres is case-sensitive, so
 * `Ada@x.internal` and `ada@x.internal` are two rows the database would accept; matching
 * case-insensitively here would be a stricter rule than the model imposes (F-1).
 *
 * `id` is minted here and never read from a caller. `groupId` is written literally as null rather
 * than taken from `input`, which is what makes "created into no group" a property of the function
 * rather than of its callers — `NewMember` has no field for one, so no caller can supply one.
 *
 * INV-08, and AC-4: it writes to the members collection and to nothing else. In particular it
 * creates no `Account` row. There is no code path from this function to one, which is the mechanism
 * — a credential field added to the form could not be wired to anything.
 */
export async function createMember(input: NewMember): Promise<CreateMemberOutcome> {
  if (members.some((m) => m.email === input.email)) {
    return { created: false, reason: "DUPLICATE_EMAIL" };
  }

  const member: Member = {
    id: crypto.randomUUID(),
    fullName: input.fullName,
    email: input.email,
    role: input.role,
    groupId: null,
  };
  members.push(member);
  return { created: true, member: structuredClone(member) };
}

/**
 * AC-5, AC-6 and AC-7. Three fields are editable and neither `id` nor `groupId` is among them —
 * `MemberPatch` has no field for either, so an edit cannot move a member between groups or rewrite
 * their identity whatever the caller sends.
 *
 * Every check runs before the first write. AC-7 asserts the member is unchanged, not that only the
 * offending field is, so a partially applied patch — a new name saved alongside a refused email —
 * would fail the criterion even though the illegal state never existed.
 *
 * A member keeping its own address is not a duplicate of itself, which is why this excludes `id`
 * rather than reusing `createMember`'s test.
 *
 * It touches no seat and no device: changing a member's role or address is not an occupancy change
 * and not a change of device ownership, which is AC-5's and AC-6's last clauses.
 */
export async function updateMember(id: string, patch: MemberPatch): Promise<UpdateMemberOutcome> {
  const member = members.find((m) => m.id === id);
  if (member === undefined) return { updated: false, reason: "NOT_FOUND" };

  if (members.some((m) => m.id !== id && m.email === patch.email)) {
    return { updated: false, reason: "DUPLICATE_EMAIL" };
  }

  member.fullName = patch.fullName;
  member.email = patch.email;
  member.role = patch.role;
  return { updated: true, member: structuredClone(member) };
}

/**
 * AC-3, AC-4, AC-6, AC-7, AC-8.
 *
 * `groupId` is non-nullable, so this function cannot remove a member from a group. That is
 * out-of-scope item 2 held by the signature rather than by a check (02-design.md F-4).
 *
 * Both refusals run before the write (rules 1, 2, 3). AC-8's "the member's name, email and role are
 * unchanged" and AC-6's "the member's group is unchanged" are assertions about a refusal having
 * written nothing.
 *
 * `MEMBER_NOT_FOUND` is checked before `GROUP_NOT_FOUND`: the member is the subject of the
 * operation, so a request naming neither reports the missing subject rather than the missing
 * argument.
 *
 * `GROUP_NOT_FOUND` is the seam's refusal and not the caller's (AC-6). Whether the chosen group
 * still exists is stored data the caller did not supply, and the chooser was rendered from a read
 * taken before the group was deleted.
 *
 * Exactly one field is written, on exactly one row. AC-8, AC-9, AC-10 and AC-11 are all the same
 * claim about scope, and the strongest form of it is a function whose only assignment statement is
 * that one.
 *
 * Assigning a member to the group they already belong to succeeds, with `previousGroupId` equal to
 * `groupId`. Nothing makes that state illegal, which is why it does not reason the way
 * `assignOccupant` does about INV-01 (02-design.md F-5).
 *
 * It touches no seat, no device and no room, and the mechanism is the import list: there is no path
 * from this line to any of them. AC-11 is a property of the file (02-design.md section 3.1).
 */
export async function assignMemberToGroup(
  memberId: string,
  groupId: string
): Promise<AssignMemberToGroupOutcome> {
  const member = members.find((m) => m.id === memberId);
  if (member === undefined) return { assigned: false, reason: "MEMBER_NOT_FOUND" };

  if (!groups.some((g) => g.id === groupId)) {
    return { assigned: false, reason: "GROUP_NOT_FOUND" };
  }

  const previousGroupId = member.groupId;
  member.groupId = groupId;
  return { assigned: true, member: structuredClone(member), previousGroupId };
}

/**
 * INV-12's predicate, read rather than enforced. The surface calls it to decide which delete dialog
 * to open (02-design.md 1.5): AC-10 requires the refusal to be raised at the point of request, so a
 * member who cannot be deleted is never asked to confirm something that will not happen.
 *
 * It is not the enforcement — `deleteMember` computes the same two halves itself and does not trust
 * a caller. Both must stay the same predicate; a surface that asked and a seam that assumed would
 * put the invariant in the client.
 *
 * Both halves are always returned, empty and zero for a member nothing refers to, because AC-10 and
 * AC-11 must fail independently: a system enforcing occupancy alone would pass a combined test while
 * stranding equipment. Seat *codes*, sorted ascending, because a cuid names nothing to a person.
 *
 * A pure read. It writes nothing, and it returns null for a member that does not exist.
 */
export async function getMemberReferences(id: string): Promise<MemberReferences | null> {
  if (!members.some((m) => m.id === id)) return null;
  return referencesTo(id);
}

/**
 * INV-12 and ADR-005: a member who occupies a seat or owns a device may not be deleted, and the
 * deletion is **refused rather than cascaded**. The refusal carries both halves so the message can
 * name what is blocking it — ADR-005's requirement, because "a bare 'cannot delete' sends the
 * operator hunting".
 *
 * It writes nothing on the refusal path. AC-10 and AC-11 assert that every seat and every device is
 * unchanged, and the strongest way to hold that is a function with no write on that path at all.
 *
 * On success it removes exactly one row from the members collection **and performs no cascade**.
 * The first migration declares three delete rules that reach `Member` and none of them is implemented
 * here: `Account.member` (`Cascade`, line 231), `SeatRequest.requester` (`Cascade`, line 206) and
 * `Account.createdBy` (`SetNull`, line 235). That is finding F-4 in 02-design.md, and the reasoning
 * is that all three are currently unreachable — INV-12 refuses the deletion of any member who
 * occupies a seat, every seeded member occupies one (fixtures.ts:57-62), and nothing in the system
 * writes occupancy, so no member holding an account or a request can be deleted and no test could
 * enter any of the three branches.
 *
 * **The ticket that first ends a member's seat occupancy — `SEA` or `REG` — makes all three
 * reachable and must add them in the same change.**
 *
 * Spliced in place rather than reassigned: `store.ts` exports the array binding and every other mock
 * module holds that same object.
 */
export async function deleteMember(id: string): Promise<DeleteMemberOutcome> {
  const member = members.find((m) => m.id === id);
  if (member === undefined) return { deleted: false, reason: "NOT_FOUND" };

  const references = referencesTo(id);
  if (references.occupiedSeatCodes.length > 0 || references.ownedDeviceCount > 0) {
    return { deleted: false, reason: "REFERENCED", references };
  }

  members.splice(members.indexOf(member), 1);
  return { deleted: true, memberId: id };
}

/**
 * The one predicate INV-12 turns on, so the read and the enforcement cannot drift apart. It takes an
 * id that has already been found, and answers only the question of what refers to it.
 */
function referencesTo(memberId: string): MemberReferences {
  const occupiedSeatCodes = seats
    .filter((s) => s.occupantId === memberId)
    .map((s) => s.code)
    .sort();
  const ownedDeviceCount = devices.filter((d) => d.ownerId === memberId).length;
  return { occupiedSeatCodes, ownedDeviceCount };
}
