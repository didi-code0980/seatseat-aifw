// MEM-01 — the member seam: list, create, update, the references read, and the INV-12 refusal.
//
// Written from `01-story.md` and `02-design.md` section 6 only. `src/**` was not read (RULE-05).
// Section 6.1 names the ten calls this file may make and the fields it may assert on, and points at
// section 1.1 for the refusal reason strings — "part of the contract, assert on them by value" —
// which is the only text outside section 6 this file was written against. `tests/unit/devices.test.ts`
// records the same pointer for DEV-01; it is recorded again in 05-test-plan.md rather than left
// implicit.
//
// NOTHING SEEDED IS QUOTED. Every member this file deletes or edits is one it created; the seeded
// members are reached only through `members.listMembers()` and `seats.listSeats()`, which section 6.1
// calls the bridge from the story's names to the seam's ids. No fixture identifier appears below,
// because QA is not permitted to read the file that defines them.
//
// Four criteria are absent from this file and are e2e only: AC-3 and AC-7 refuse at the form, AC-8
// is a confirmation dialog, and neither has a seam call in section 6.1 to make it against. The
// coverage map in 05-test-plan.md states that for each of them rather than leaving the gap to be
// noticed.
//
// Mock state is process-global within this file and has no reset hook (section 6.1). Every
// "nothing else changed" assertion is therefore made against a snapshot taken immediately before the
// act, never against one taken in setup.

import { beforeAll, describe, expect, it } from "vitest";

import { accounts, devices, members, seats } from "@/lib/data";

type Member = Awaited<ReturnType<typeof members.listMembers>>[number];
type Seat = Awaited<ReturnType<typeof seats.listSeats>>[number];
type Device = Awaited<ReturnType<typeof devices.listDevices>>[number];
type Account = Awaited<ReturnType<typeof accounts.listAccounts>>[number];

/** Unique per run, so a store that survives between runs cannot collide on the `@unique` email. */
const RUN = Date.now().toString(36).toLowerCase();
let minted = 0;

/**
 * Lowercase on purpose. Section 6 records that `memberEmailSchema` trims but does not lowercase, so
 * the row key is the address exactly as stored; supplying lowercase avoids the question entirely.
 */
function email(label: string): string {
  minted += 1;
  return `qa-mem-${RUN}-${label.toLowerCase()}-${minted}@qa.internal`;
}

/**
 * A mixed-case address, for AC-3b only.
 *
 * AC-3b is the one criterion in the story that asserts a refusal must **not** happen: `Member.email`
 * is `@unique` and Postgres compares it case-sensitively, so two addresses differing only in case are
 * two members. Every other test here supplies lowercase deliberately (section 6); this one cannot,
 * because the case difference is the whole criterion.
 */
function mixedCaseEmail(label: string): string {
  minted += 1;
  return `QA-Mem-${RUN}-${label}-${minted}@QA.Internal`;
}

/** A member who occupies at least one seat. AC-10's Given, and the one Given A-5 says needs the seed. */
let seatedMember: Member;
/** The seat codes that member occupies, sorted — derived from `listSeats()`, never from a fixture. */
let seatedMemberSeatCodes: string[];

async function memberList(): Promise<Member[]> {
  // Cloned, not referenced: the seam hands back live objects, so a shallow copy would be mutated by
  // the act under test and every before/after comparison would compare a value with itself.
  return structuredClone(await members.listMembers());
}

async function seatList(): Promise<Seat[]> {
  return structuredClone(await seats.listSeats());
}

async function deviceList(): Promise<Device[]> {
  return structuredClone(await devices.listDevices());
}

async function accountList(): Promise<Account[]> {
  return structuredClone(await accounts.listAccounts());
}

function find(list: Member[], id: string): Member | undefined {
  return list.find((m) => m.id === id);
}

/** The seat codes a member occupies, sorted ascending — the shape `MemberReferences` uses. */
async function occupiedCodes(memberId: string): Promise<string[]> {
  return (await seats.listSeats())
    .filter((s) => s.occupantId === memberId)
    .map((s) => s.code)
    .sort();
}

/** Create a member and fail loudly rather than returning a refusal into an assertion. */
async function create(label: string, role: Member["role"]): Promise<Member> {
  const outcome = await members.createMember({
    fullName: `QA Member ${label}`,
    email: email(label),
    role,
  });
  if (!outcome.created) throw new Error(`createMember refused: ${JSON.stringify(outcome)}`);
  return outcome.member;
}

beforeAll(async () => {
  const allSeats = await seats.listSeats();
  const allMembers = await members.listMembers();

  const occupied = allSeats.find((s) => s.occupantId !== null);
  // Asserted rather than assumed. `01-story.md` A-5 infers this from the seed counts and says in
  // terms that if it does not hold the story must be amended, not worked around — so it has to fail
  // here as a missing precondition, not further down as a confusing null.
  if (!occupied) throw new Error("no seat has an occupant; AC-10 needs one (01-story.md A-5)");

  const theOccupant = allMembers.find((m) => m.id === occupied.occupantId);
  if (!theOccupant) throw new Error("the occupied seat's occupant is not a listed member");

  seatedMember = theOccupant;
  seatedMemberSeatCodes = await occupiedCodes(theOccupant.id);
  if (seatedMemberSeatCodes.length === 0) throw new Error("the occupant occupies no seat by code");
});

describe("AC-1 — members are listed with the facts the later criteria turn on", () => {
  it("AC-1: every member is listed with a role, and occupancy is readable for the seated and the unseated alike", async () => {
    // The second half of AC-1's Given — a member who occupies no seat — is constructible and is
    // built here rather than looked for (01-story.md A-6). The first half is the seed.
    const unseated = await create("AC1", "USER");

    const listed = await memberList();
    expect(find(listed, seatedMember.id), "the seeded member who occupies a seat is listed").toBeDefined();
    expect(find(listed, unseated.id), "the member just created is listed").toBeDefined();

    for (const m of listed) {
      expect(["USER", "MANAGER", "ADMIN"], `${m.email} shows a role from ROLE_RANK`).toContain(m.role);
    }

    // "each listed member shows either the seats they currently occupy, or that they occupy none" —
    // at the seam that is `getMemberReferences`, which section 1.1 requires to return both halves
    // always, empty rather than absent.
    const seatedRefs = await members.getMemberReferences(seatedMember.id);
    expect(seatedRefs?.occupiedSeatCodes, "the seated member's seats are named").toEqual(seatedMemberSeatCodes);
    expect(seatedRefs!.occupiedSeatCodes.length, "and there is at least one").toBeGreaterThan(0);

    const unseatedRefs = await members.getMemberReferences(unseated.id);
    expect(unseatedRefs, "a member nothing refers to still has a references row").not.toBeNull();
    expect(unseatedRefs?.occupiedSeatCodes, "who occupies none — empty, not absent").toEqual([]);
    expect(unseatedRefs?.ownedDeviceCount, "and owns nothing").toBe(0);

    // A member that does not exist is the one case that is null rather than empty (section 1.2 rule 3).
    expect(await members.getMemberReferences("no-such-member-id"), "absent member reads null").toBeNull();
  });
});

describe("AC-2 — a member is created, and is created with a role", () => {
  it("AC-2: the new member is listed with the role chosen, occupies no seat, and belongs to no group", async () => {
    const before = await memberList();
    const beforeSeats = await seatList();

    const created = await create("AC2", "MANAGER");

    expect(created.role, "created with the role I chose").toBe("MANAGER");
    expect(created.fullName, "with the name supplied").toBe("QA Member AC2");
    expect(created.groupId, "and no group — group membership is out-of-scope item 5").toBeNull();

    const after = await memberList();
    expect(after.length, "exactly one member was added").toBe(before.length + 1);
    const self = find(after, created.id);
    expect(self, "the new member appears in the member list").toBeDefined();
    expect(self?.role, "with the role I chose").toBe("MANAGER");

    // "And they are shown as occupying no seat."
    expect((await members.getMemberReferences(created.id))?.occupiedSeatCodes).toEqual([]);
    expect(
      await seatList(),
      "creating a member writes nothing on any seat — out-of-scope item 3"
    ).toEqual(beforeSeats);

    // "And no other member is changed." Deep equality over the members that were already there.
    expect(after.filter((m) => m.id !== created.id), "no other member moved").toEqual(before);
  });

  it("AC-2: each of the three ROLE_RANK values is a role a member can be created with", async () => {
    // A-3: the role is chosen from USER, MANAGER and ADMIN. A create that accepted only the schema
    // default would satisfy the criterion above with MANAGER hardcoded and fail here.
    for (const role of ["USER", "MANAGER", "ADMIN"] as const) {
      const m = await create(`AC2-${role}`, role);
      expect(m.role, `a member is created with role ${role}`).toBe(role);
      expect(find(await memberList(), m.id)?.role, `and is listed with role ${role}`).toBe(role);
    }
  });
});

describe("AC-3a — creation is refused when the email is already held by another member", () => {
  it("AC-3a: a duplicate email is refused with DUPLICATE_EMAIL, and the member who holds it is unchanged", async () => {
    // The Given: a member exists whose email is a known value. Created here rather than looked for,
    // because the incumbent must be one this file may quote and no fixture email is readable
    // (RULE-05).
    const incumbent = await create("AC3a", "MANAGER");

    const before = await memberList();
    const beforeIncumbent = find(before, incumbent.id)!;

    const outcome = await members.createMember({
      fullName: "QA Member AC3a duplicate",
      email: incumbent.email, // character for character
      role: "USER",
    });

    expect(outcome.created, "no member is created").toBe(false);
    // Asserted by value, not as a bare `false`. Section 1.1 makes the reason part of the contract,
    // and `DUPLICATE_EMAIL` is what tells this refusal from any other the seam could grow.
    expect(outcome.created === false && outcome.reason, "refused as DUPLICATE_EMAIL").toBe("DUPLICATE_EMAIL");

    const after = await memberList();
    expect(after.length, "the member list is unchanged in length").toBe(before.length);
    expect(after, "and unchanged in every respect").toEqual(before);
    expect(
      find(after, incumbent.id),
      "the existing member who holds that email is unchanged"
    ).toEqual(beforeIncumbent);
  });
});

describe("AC-3b — the email refusal is exact, not case-folded", () => {
  it("AC-3b: an email differing only in case IS created, and both members are listed with their own email", async () => {
    // The one criterion here asserting a PERMITTED duplicate. An over-strict, case-folding check is
    // invisible to every other test in this file: it never produces a wrong row, only a rejected
    // one. Without this test nothing would catch it.
    const upper = mixedCaseEmail("AC3b");
    const lower = upper.toLowerCase();
    expect(upper, "the two addresses differ, and differ only in case").not.toBe(lower);
    expect(upper.toLowerCase(), "case-folded they are the same address").toBe(lower);

    const first = await members.createMember({ fullName: "QA Member AC3b upper", email: upper, role: "USER" });
    expect(first.created, `the first create: ${JSON.stringify(first)}`).toBe(true);

    const before = await memberList();

    const second = await members.createMember({ fullName: "QA Member AC3b lower", email: lower, role: "USER" });
    expect(
      second.created,
      `the member IS created — @unique is case-sensitive in Postgres, and refusing this would be a rule stricter than the model: ${JSON.stringify(second)}`
    ).toBe(true);

    const after = await memberList();
    expect(after.length, "exactly one member was added").toBe(before.length + 1);

    // "And both members appear in the member list, each with their own email."
    const stored = after.filter((m) => m.email === upper || m.email === lower).map((m) => m.email).sort();
    expect(stored, "both addresses are stored exactly as supplied, neither folded into the other").toEqual(
      [upper, lower].sort()
    );
    expect(
      after.find((m) => m.email === upper)?.fullName,
      "and the two rows are distinct members, not one row overwritten"
    ).toBe("QA Member AC3b upper");
    expect(after.find((m) => m.email === lower)?.fullName).toBe("QA Member AC3b lower");
  });
});

describe("AC-4 — creating a member does not create a sign-in account (INV-08)", () => {
  it("AC-4: the account table is untouched, and the new member has no account", async () => {
    const beforeAccounts = await accountList();

    const created = await create("AC4", "ADMIN");

    const afterAccounts = await accountList();
    expect(afterAccounts.length, "no account row was created").toBe(beforeAccounts.length);
    expect(afterAccounts, "the account table is bit-identical — INV-08").toEqual(beforeAccounts);
    expect(
      afterAccounts.filter((a) => a.memberId === created.id),
      "the new member has no sign-in account — ADR-003, a null authUserId is not an error state"
    ).toEqual([]);

    // The control. Without it this criterion passes against a seed that has no accounts at all, and
    // the assertion would be trivially true of every row rather than informative (section 6).
    expect(
      afterAccounts.length,
      "at least one member does hold an account, so the assertion above is not vacuous"
    ).toBeGreaterThan(0);
  });
});

describe("AC-5 — an existing member's attributes are changed", () => {
  it("AC-5: the new value is stored, the role and the occupancy are untouched, and no other member moves", async () => {
    const member = await create("AC5", "USER");

    const before = await memberList();
    const beforeSelf = find(before, member.id)!;
    const beforeSeats = await seatList();

    const outcome = await members.updateMember(member.id, {
      fullName: "QA Member AC5 edited",
      email: beforeSelf.email,
      role: beforeSelf.role,
    });
    expect(outcome.updated, `updateMember: ${JSON.stringify(outcome)}`).toBe(true);

    const after = await memberList();
    const self = find(after, member.id);
    expect(self?.fullName, "the list shows the new value").toBe("QA Member AC5 edited");
    expect(self?.role, "their role is unchanged").toBe(beforeSelf.role);
    expect(self?.email, "their email is unchanged").toBe(beforeSelf.email);
    // "And submitting a member's own existing email unchanged is not refused as a duplicate." The
    // patch above carried `beforeSelf.email` verbatim, so the update just asserted successful IS
    // that clause — a seam that compared the incoming email against every row including this
    // member's own would have refused it with DUPLICATE_EMAIL and `outcome.updated` would be false.
    // Stated here rather than left implicit, because AC-5 and AC-7a contradict each other without it.
    expect(self?.groupId, "and their group is still null — the patch cannot express one").toBeNull();
    expect(after.length, "the number of members is unchanged").toBe(before.length);

    // "And the seats they occupy are unchanged."
    expect(await seatList(), "no seat changed its occupant").toEqual(beforeSeats);

    // "And no other member is changed in any respect."
    expect(after.filter((m) => m.id !== member.id), "every other member is untouched").toEqual(
      before.filter((m) => m.id !== member.id)
    );
  });
});

describe("AC-6 — a member's role is changed", () => {
  it("AC-6: USER becomes MANAGER, nothing else about them changes, and no other member's role changes", async () => {
    const member = await create("AC6", "USER");
    expect(member.role, "the Given: their recorded role is USER").toBe("USER");

    const before = await memberList();
    const beforeSelf = find(before, member.id)!;
    const beforeSeats = await seatList();

    const outcome = await members.updateMember(member.id, {
      fullName: beforeSelf.fullName,
      email: beforeSelf.email,
      role: "MANAGER",
    });
    expect(outcome.updated, `updateMember: ${JSON.stringify(outcome)}`).toBe(true);

    const after = await memberList();
    const self = find(after, member.id);
    expect(self?.role, "the list shows them as MANAGER").toBe("MANAGER");
    expect(
      { fullName: self?.fullName, email: self?.email, groupId: self?.groupId },
      "nothing else about that member changes"
    ).toEqual({ fullName: beforeSelf.fullName, email: beforeSelf.email, groupId: beforeSelf.groupId });
    expect(await seatList(), "the seats they occupy are as they were").toEqual(beforeSeats);

    // "And no other member's role changes."
    for (const b of before) {
      if (b.id === member.id) continue;
      expect(find(after, b.id)?.role, `${b.email} keeps the role they had`).toBe(b.role);
    }
  });
});

describe("AC-7a — editing is refused when the email is already held by a different member", () => {
  it("AC-7a: another member's email is refused with DUPLICATE_EMAIL, and neither member is changed", async () => {
    // "Given two members exist with different emails."
    const subject = await create("AC7a-subject", "USER");
    const other = await create("AC7a-other", "MANAGER");
    expect(subject.email, "the Given: their emails differ").not.toBe(other.email);

    const before = await memberList();

    const outcome = await members.updateMember(subject.id, {
      fullName: subject.fullName,
      email: other.email, // character for character
      role: subject.role,
    });

    expect(outcome.updated, "the edit is refused").toBe(false);
    expect(
      outcome.updated === false && outcome.reason,
      "DUPLICATE_EMAIL, not NOT_FOUND — the two are what tell a taken email from a missing row"
    ).toBe("DUPLICATE_EMAIL");

    const after = await memberList();
    // "Then neither member is changed." Deep equality over the whole list, which also carries the
    // criterion's last clause: both still hold the emails they had.
    expect(after, "neither member is changed, and nor is anyone else").toEqual(before);
    expect(find(after, subject.id)?.email, "the subject keeps the email it had").toBe(subject.email);
    expect(find(after, other.id)?.email, "and the other member keeps theirs").toBe(other.email);
  });

  it("AC-7a: updating a member that does not exist is refused with NOT_FOUND and changes nothing", async () => {
    // The control on the assertion above. Without it a seam that returned NOT_FOUND for every
    // refusal would pass AC-7a's reason check for the wrong reason.
    const before = await memberList();
    const outcome = await members.updateMember("no-such-member-id", {
      fullName: "QA Member absent",
      email: email("AC7a-absent"),
      role: "USER",
    });
    expect(outcome.updated, "no row is updated").toBe(false);
    expect(outcome.updated === false && outcome.reason, "and it is NOT_FOUND").toBe("NOT_FOUND");
    expect(await memberList(), "the member list is unchanged").toEqual(before);
  });
});

describe("AC-9 — a member who is referenced by nothing is deleted", () => {
  it("AC-9: the member is gone, and no member, seat or device is otherwise affected", async () => {
    // Create then delete is a closed loop inside this ticket (01-story.md A-6): a newly created
    // member occupies no seat, because AC-2 asserts it, and owns nothing, because no path here
    // confers device ownership.
    const member = await create("AC9", "USER");
    const refs = await members.getMemberReferences(member.id);
    expect(refs?.occupiedSeatCodes, "the Given: they occupy no seat").toEqual([]);
    expect(refs?.ownedDeviceCount, "and own no device").toBe(0);

    const before = await memberList();
    const beforeSeats = await seatList();
    const beforeDevices = await deviceList();
    const beforeAccounts = await accountList();

    const outcome = await members.deleteMember(member.id);
    expect(outcome.deleted, `deleteMember: ${JSON.stringify(outcome)}`).toBe(true);
    expect(outcome.deleted === true && outcome.memberId, "the outcome names the row it removed").toBe(member.id);

    const after = await memberList();
    expect(find(after, member.id), "they no longer appear in the member list").toBeUndefined();
    expect(after.length, "exactly one member was removed").toBe(before.length - 1);
    // "And no other member is affected." Deep equality over the survivors, which is stronger than
    // checking the fields the criterion happens to name.
    expect(after, "no other member is affected").toEqual(before.filter((m) => m.id !== member.id));

    // "And no seat changes its occupant. And no device changes its owner, its seat, or its primary
    // or secondary designation." Section 1.2 rule 6: exactly one row, no cascade.
    expect(await seatList(), "no seat changed its occupant").toEqual(beforeSeats);
    expect(await deviceList(), "no device changed owner, seat or designation").toEqual(beforeDevices);
    expect(await accountList(), "and no account row was touched — F-4's first declared cascade").toEqual(
      beforeAccounts
    );
  });

  it("AC-9: deleting a member who does not exist is refused with NOT_FOUND and changes nothing", async () => {
    const before = await memberList();
    const outcome = await members.deleteMember("no-such-member-id");
    expect(outcome.deleted, "no row is removed").toBe(false);
    expect(outcome.deleted === false && outcome.reason, "and it is NOT_FOUND, not REFERENCED").toBe("NOT_FOUND");
    expect(await memberList(), "the member list is unchanged").toEqual(before);
  });
});

describe("AC-10 — deleting a member who occupies a seat is refused, and the refusal names the seat (INV-12)", () => {
  it("AC-10: refused with REFERENCED, the seats are named, and nothing is written", async () => {
    expect(seatedMemberSeatCodes.length, "the Given: they occupy at least one seat").toBeGreaterThan(0);

    const before = await memberList();
    const beforeSeats = await seatList();
    const beforeDevices = await deviceList();

    const outcome = await members.deleteMember(seatedMember.id);

    expect(outcome.deleted, "the deletion is refused").toBe(false);
    expect(
      outcome.deleted === false && outcome.reason,
      "REFERENCED, not NOT_FOUND — the two are what tell a refusal from a missing row"
    ).toBe("REFERENCED");

    // ADR-005: the refusal must name what is blocking it. AC-10 asserts each seat.
    const references = outcome.deleted === false && outcome.reason === "REFERENCED" ? outcome.references : null;
    expect(references, "the refusal carries the references that blocked it").not.toBeNull();
    expect(
      references?.occupiedSeatCodes,
      "the refusal names each seat that member occupies, by code and sorted"
    ).toEqual(seatedMemberSeatCodes);

    // The same predicate is what the UI reads before it opens a dialog (section 1.2 rule 4). If the
    // two disagreed, the surface would offer a confirmation for a delete the seam will refuse.
    expect(
      (await members.getMemberReferences(seatedMember.id))?.occupiedSeatCodes,
      "getMemberReferences and deleteMember agree on the blockers"
    ).toEqual(references?.occupiedSeatCodes);

    const after = await memberList();
    expect(find(after, seatedMember.id), "that member still appears in the member list").toBeDefined();
    expect(find(after, seatedMember.id)?.role, "with their role unchanged").toBe(seatedMember.role);
    expect(after, "and the member list is unchanged in every respect").toEqual(before);
    expect(await seatList(), "no seat changes its occupant").toEqual(beforeSeats);
    expect(await deviceList(), "no device changes its owner, its seat, or its designation").toEqual(beforeDevices);
  });

  it("AC-10: the refusal is repeatable — three refused deletes leave the store bit-identical", async () => {
    // The refusal path must write nothing (section 1.2 rule 5). A path that removed the row and then
    // restored it, or that wrote a tombstone, would pass the single-shot assertion above.
    const before = await memberList();
    const beforeSeats = await seatList();
    for (let i = 0; i < 3; i += 1) {
      const outcome = await members.deleteMember(seatedMember.id);
      expect(outcome.deleted, `attempt ${i + 1} is refused`).toBe(false);
    }
    expect(await memberList(), "the member list is bit-identical after three refusals").toEqual(before);
    expect(await seatList(), "seat occupancy is bit-identical after three refusals").toEqual(beforeSeats);
  });
});

describe("AC-11 — deleting a member who owns a device is refused, and the refusal states how many (INV-12)", () => {
  it("AC-11: refused with the device count, the seat half reads empty, and no device is touched", async () => {
    // The Given: a member who occupies no seat and owns at least one device. Built through
    // `devices.createDevice`, which section 6.1 grants for exactly this and nothing else — DEV-01's
    // AC-2 is the route 01-story.md A-6 names.
    const member = await create("AC11", "USER");
    const device = await devices.createDevice({
      assetTag: `AST-QA-MEM-${RUN}-${minted}`,
      model: "QA model AC11",
      ownerId: member.id,
    });
    if (!device.created) throw new Error(`createDevice refused: ${JSON.stringify(device)}`);

    const refs = await members.getMemberReferences(member.id);
    expect(refs?.occupiedSeatCodes, "the Given holds occupancy at zero, so the device half is tested alone").toEqual(
      []
    );
    expect(refs?.ownedDeviceCount, "and they own at least one device").toBeGreaterThan(0);

    const before = await memberList();
    const beforeDevices = await deviceList();
    const beforeSeats = await seatList();

    const outcome = await members.deleteMember(member.id);

    expect(outcome.deleted, "the deletion is refused").toBe(false);
    expect(outcome.deleted === false && outcome.reason, "refused as REFERENCED").toBe("REFERENCED");

    const references = outcome.deleted === false && outcome.reason === "REFERENCED" ? outcome.references : null;
    expect(references?.ownedDeviceCount, "the refusal states how many devices that member owns").toBe(
      refs!.ownedDeviceCount
    );
    expect(
      references?.occupiedSeatCodes,
      "and the seat half is empty — this is the device half of INV-12 on its own"
    ).toEqual([]);

    const after = await memberList();
    expect(find(after, member.id), "that member still appears in the member list").toBeDefined();
    expect(after, "unchanged in every respect").toEqual(before);

    // "And every device that member owns is unchanged — same owner, same seat, same primary or
    // secondary designation."
    expect(await deviceList(), "no device is touched by the refusal").toEqual(beforeDevices);
    expect(await seatList(), "and no seat is touched either").toEqual(beforeSeats);
  });
});

describe("invariant probes — the assertions that fail if an invariant stops holding", () => {
  it("INV-08: no member this suite created holds a sign-in account", async () => {
    // The surface creates people who cannot sign in. A create path that grew an account row would
    // leave one here, and every AC above would still pass.
    // Case-insensitive: AC-3b deliberately creates two members whose addresses differ only in case,
    // and a case-sensitive prefix here would sweep past the upper-case one — the member most likely
    // to have taken a different branch through the create path.
    const created = (await members.listMembers()).filter((m) =>
      m.email.toLowerCase().startsWith(`qa-mem-${RUN}-`)
    );
    expect(created.length, "this suite created members, so the sweep is not vacuous").toBeGreaterThan(0);

    const accountIds = new Set((await accounts.listAccounts()).map((a) => a.memberId));
    expect(
      created.filter((m) => accountIds.has(m.id)).map((m) => m.email),
      "a member created by this surface with an account — INV-08"
    ).toEqual([]);
  });

  it("INV-12: no member who occupies a seat or owns a device can be deleted", async () => {
    // Stated over every member the store holds rather than over the two the criteria picked, so a
    // refusal that happens to be right for the seeded member and wrong for a created one is visible.
    const all = await members.listMembers();
    const allSeats = await seats.listSeats();
    const allDevices = await devices.listDevices();

    const referenced = all.filter(
      (m) =>
        allSeats.some((s) => s.occupantId === m.id) || allDevices.some((d) => d.ownerId === m.id)
    );
    expect(referenced.length, "at least one member is referenced, so the sweep is not vacuous").toBeGreaterThan(0);

    const wronglyDeleted: string[] = [];
    for (const m of referenced) {
      const outcome = await members.deleteMember(m.id);
      if (outcome.deleted) wronglyDeleted.push(m.email);
    }
    expect(wronglyDeleted, "a referenced member was deleted rather than refused — INV-12").toEqual([]);

    // And the store is where it was: the sweep above is a sweep of refusals, so it wrote nothing.
    expect(
      (await members.listMembers()).length,
      "the sweep removed no member"
    ).toBe(all.length);
    expect(await seats.listSeats(), "and moved no occupant").toEqual(allSeats);
  });

  it("INV-12: getMemberReferences reports both halves for every member, always", async () => {
    // Section 1.2 rule 3 — empty and zero rather than absent. A half that went missing would make
    // AC-10's and AC-11's refusal messages silently incomplete rather than wrong.
    for (const m of await members.listMembers()) {
      const refs = await members.getMemberReferences(m.id);
      expect(refs, `${m.email} has a references row`).not.toBeNull();
      expect(Array.isArray(refs?.occupiedSeatCodes), `${m.email} has a seat half`).toBe(true);
      expect(typeof refs?.ownedDeviceCount, `${m.email} has a device half`).toBe("number");
      expect(refs?.occupiedSeatCodes, `${m.email}'s seat codes are sorted`).toEqual(
        [...refs!.occupiedSeatCodes].sort()
      );
      expect(refs?.occupiedSeatCodes, `${m.email}'s seat codes match the seat table`).toEqual(
        await occupiedCodes(m.id)
      );
    }
  });
});
