import type { JSX } from "react";

import { MembersManager } from "./members-manager";
import { accounts, members, seats } from "@/lib/data";
import type { Member } from "@/lib/data";

/**
 * One rendered row.
 *
 * `occupiedSeatCodes` is on the row because AC-1 requires the list to show the seats each member
 * occupies, and because deleting a member is an act whose consequences depend on that fact — a
 * person cannot take it correctly against a screen that hides it.
 *
 * `hasAccount` is AC-4's standing statement. See the note on the read below.
 */
export interface MemberRow {
  member: Member;
  /** Codes of the seats this member occupies, sorted. Empty when they occupy none (AC-1). */
  occupiedSeatCodes: string[];
  /** Whether the system holds an Account row for this member. AC-4. */
  hasAccount: boolean;
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
 */
export default async function MembersPage(): Promise<JSX.Element> {
  const [memberList, seatList, accountList] = await Promise.all([
    members.listMembers(),
    seats.listSeats(),
    accounts.listAccounts(),
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

  const rows: MemberRow[] = memberList.map((member) => ({
    member,
    occupiedSeatCodes: seatCodesByOccupant.get(member.id) ?? [],
    hasAccount: accountMemberIds.has(member.id),
  }));

  return (
    <section data-testid="members-page">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Members</h1>
      <MembersManager rows={rows} />
    </section>
  );
}
