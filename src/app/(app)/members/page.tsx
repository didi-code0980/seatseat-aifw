import type { JSX } from "react";

import { MembersManager } from "./members-manager";
import { accounts, groups, members, seats } from "@/lib/data";
import type { Group, Member } from "@/lib/data";

/**
 * One rendered row.
 *
 * `occupiedSeatCodes` is on the row because AC-1 requires the list to show the seats each member
 * occupies, and because deleting a member is an act whose consequences depend on that fact — a
 * person cannot take it correctly against a screen that hides it.
 *
 * `hasAccount` is AC-4's standing statement. See the note on the read below.
 *
 * `groupName` is GRP-02's AC-1 and AC-2.
 */
export interface MemberRow {
  member: Member;
  /** Codes of the seats this member occupies, sorted. Empty when they occupy none (AC-1). */
  occupiedSeatCodes: string[];
  /** Whether the system holds an Account row for this member. AC-4. */
  hasAccount: boolean;
  /**
   * GRP-02, AC-1, AC-2. The NAME of the group this member belongs to, or null when they belong to
   * none.
   *
   * A name and not an id, which is the whole point of the column: MEM-01 dropped it because it
   * rendered a cuid, and a cuid names nothing to a person (ADR-005's ground).
   *
   * Null ALSO when `groupId` names no group. That is a corrupt-store state the seam refuses to
   * create — `assignMemberToGroup` checks the group exists, `deleteGroup` detaches rather than
   * stranding, and `prisma/schema.prisma:167` declares `onDelete: SetNull` — and rendering the
   * empty state is the honest answer rather than rendering the unresolvable id.
   */
  groupName: string | null;
}

/**
 * GRP-02, AC-5. One option in the assign chooser.
 *
 * `path` and not the bare name: GRP-01's AC-4b puts two groups named `Platform` in the tree at
 * once, and a chooser showing `Platform` twice is a control through which neither a person nor a
 * test can say which one they meant.
 */
export interface GroupOption {
  id: string;
  /** Ancestor names from the root, joined by "/". The label; the value is `id`. */
  path: string;
}

/**
 * A server component that reads through the seam and holds no state.
 *
 * Three existing reads and no new seam function. The join into `MemberRow[]` happens here rather
 * than behind a `listMemberRows()` because a joined DTO puts a new *shape* across the seam rather
 * than a new name, and shape is the one thing `tests/unit/seam-parity.test.ts` does not check — a
 * mock returning a joined row the Prisma implementation cannot reproduce passes parity and breaks at
 * the swap (02-design.md section 7, alternative D).
 *
 * **It does not read devices, and that is contractual.** AC-1 keeps device data off the member list
 * on every render; the device count reaches the person through the delete refusal instead, which is
 * AC-11. A `devices.*` import here is a review finding, not an optimisation.
 *
 * **The sign-in column reads `Account`, because that is what exists.** ADR-003 names a different
 * mechanism — `Member.authUserId`, nullable — and that field is in neither `prisma/schema.prisma`
 * nor `src/lib/data/types.ts`. That is finding F-5 and it is a human's to resolve. This column
 * therefore reports *the system holds no account row for this person*, which is the true and
 * checkable statement available today and is the one AC-4 asks for. If `authUserId` is added later,
 * the column changes its source and not its meaning.
 *
 * **GRP-02 adds a fourth read and no seam function.** `listGroups()` already exists — GRP-01 built
 * it — and AC-1's resolution of a group id to a group NAME is a `Map<id, name>` composed here, in
 * the same place the three reads above are already composed. A `listMemberRows()` returning the
 * join was refused for alternative D's reason (02-design.md F-1, section 7).
 */
export default async function MembersPage(): Promise<JSX.Element> {
  const [memberList, seatList, accountList, groupList] = await Promise.all([
    members.listMembers(),
    seats.listSeats(),
    accounts.listAccounts(),
    groups.listGroups(),
  ]);

  const accountMemberIds = new Set(accountList.map((a) => a.memberId));

  const seatCodesByOccupant = new Map<string, string[]>();
  for (const seat of seatList) {
    if (seat.occupantId === null) continue;
    const codes = seatCodesByOccupant.get(seat.occupantId);
    if (codes === undefined) seatCodesByOccupant.set(seat.occupantId, [seat.code]);
    else codes.push(seat.code);
  }
  // Sorted, for the same reason `getMemberReferences` sorts: the row and the refusal dialog must
  // agree, and AC-10's e2e Given reads the seat codes off the row to assert against the refusal.
  for (const codes of seatCodesByOccupant.values()) codes.sort();

  // AC-1. The whole of the resolution MEM-01 said did not exist, and it adds nothing to the seam.
  const groupNamesById = new Map(groupList.map((g) => [g.id, g.name]));

  const rows: MemberRow[] = memberList.map((member) => ({
    member,
    occupiedSeatCodes: seatCodesByOccupant.get(member.id) ?? [],
    hasAccount: accountMemberIds.has(member.id),
    // `?? null` rather than the raw lookup: a `groupId` naming no group renders the empty state
    // rather than an unresolvable id. See the note on the field.
    groupName: member.groupId === null ? null : groupNamesById.get(member.groupId) ?? null,
  }));

  /**
   * AC-5. The chooser's options, by the same walk `/groups` renders: bucket by parent, sort each
   * bucket by name, then walk pre-order from the top level building the path.
   *
   * **Walking down from the roots rather than climbing `parentId` upwards is a decision, not a
   * style choice.** The store is a process-global mutable array; a climb over data that was already
   * cyclic would hang the render rather than fail a test, and would then need a step bound that has
   * to be invented. The downward walk terminates on the shape of the data. A group unreachable from
   * a root — a `parentId` naming no group, or a cycle — is omitted, which is exactly the set
   * `/groups` shows, and both are states the seam refuses to create (`PARENT_NOT_FOUND`,
   * `ANCESTOR_CYCLE`).
   *
   * **The duplication with `groups/page.tsx` is stated rather than hidden.** No shared module is
   * extracted and `groups/page.tsx` is not in this ticket's `allowed_paths`: the shared thing is the
   * *convention* — ancestor names joined by `/` — and 02-design.md section 6 is where a convention
   * QA depends on is fixed. Refactoring a shipped surface whose e2e spec addresses rows by that
   * exact path, to save eight lines, is risk this ticket has no reason to take (02-design.md 1.6).
   */
  const TOP_LEVEL = "";
  const childGroupsByParent = new Map<string, Group[]>();
  for (const group of groupList) {
    const key = group.parentId ?? TOP_LEVEL;
    const bucket = childGroupsByParent.get(key);
    if (bucket === undefined) childGroupsByParent.set(key, [group]);
    else bucket.push(group);
  }
  for (const bucket of childGroupsByParent.values()) {
    bucket.sort((a, b) => a.name.localeCompare(b.name));
  }

  const groupOptions: GroupOption[] = [];
  function walk(parentKey: string, prefix: string): void {
    for (const group of childGroupsByParent.get(parentKey) ?? []) {
      const path = prefix === "" ? group.name : `${prefix}/${group.name}`;
      groupOptions.push({ id: group.id, path });
      walk(group.id, path);
    }
  }
  walk(TOP_LEVEL, "");

  return (
    <section data-testid="members-page">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Members</h1>
      <MembersManager rows={rows} groupOptions={groupOptions} />
    </section>
  );
}
