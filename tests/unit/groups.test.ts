// GRP-01 — the group seam: list, create, update, delete, tree structure, sibling uniqueness, ancestor cycle refusal, and member detachment.
//
// Written from `01-story.md` and `02-design.md` section 6 only. `src/**` was not read (RULE-05).
// Section 6.1-6.4 name the seam calls this file may make and the fields it may assert on, and point
// at the contract for refusal reasons.
//
// Mock state is process-global within this file and has no reset hook.
// AC-13 consumes the seeded `Platform` group and runs at the end of the suite.

import { beforeAll, describe, expect, it } from "vitest";

import { devices, groups, members, seats } from "@/lib/data";

type Group = Awaited<ReturnType<typeof groups.listGroups>>[number];
type Member = Awaited<ReturnType<typeof members.listMembers>>[number];
type Seat = Awaited<ReturnType<typeof seats.listSeats>>[number];
type Device = Awaited<ReturnType<typeof devices.listDevices>>[number];

const RUN = Date.now().toString(36).toLowerCase();
let minted = 0;

function groupName(label: string): string {
  minted += 1;
  return `QA-Grp-${RUN}-${label}-${minted}`;
}

async function groupList(): Promise<Group[]> {
  return structuredClone(await groups.listGroups());
}

async function memberList(): Promise<Member[]> {
  return structuredClone(await members.listMembers());
}

async function seatList(): Promise<Seat[]> {
  return structuredClone(await seats.listSeats());
}

async function deviceList(): Promise<Device[]> {
  return structuredClone(await devices.listDevices());
}

function findGroup(list: Group[], id: string): Group | undefined {
  return list.find((g) => g.id === id);
}

async function create(name: string, parentId: string | null = null): Promise<Group> {
  const outcome = await groups.createGroup({ name, parentId });
  if (!outcome.created) throw new Error(`createGroup refused: ${JSON.stringify(outcome)}`);
  return outcome.group;
}

let seededEngineering: Group;
let seededPlatform: Group;

beforeAll(async () => {
  const allGroups = await groupList();
  const eng = allGroups.find((g) => g.name === "Engineering" && g.parentId === null);
  if (!eng) throw new Error("Engineering is not seeded at top level (02-design.md section 6.2)");

  const plat = allGroups.find((g) => g.name === "Platform" && g.parentId === eng.id);
  if (!plat) throw new Error("Platform is not seeded under Engineering (02-design.md section 6.2)");

  seededEngineering = eng;
  seededPlatform = plat;
});

describe("AC-1 — Groups are listed as the tree they are", () => {
  it("AC-1: every group is listed with its parent and child relationships intact", async () => {
    const parent = await create(groupName("AC1-Parent"));
    const child = await create(groupName("AC1-Child"), parent.id);

    const listed = await groupList();
    const foundParent = findGroup(listed, parent.id);
    const foundChild = findGroup(listed, child.id);

    expect(foundParent, "parent group is listed").toBeDefined();
    expect(foundParent?.parentId, "parent has no parent (top level)").toBeNull();

    expect(foundChild, "child group is listed").toBeDefined();
    expect(foundChild?.parentId, "child has parent reference").toBe(parent.id);

    // Clean up
    await groups.deleteGroup(child.id);
    await groups.deleteGroup(parent.id);
  });
});

describe("AC-2 — A group is created at the top level", () => {
  it("AC-2: creates top-level group with parentId null and no children", async () => {
    const before = await groupList();
    const name = groupName("AC2");

    const created = await create(name);
    expect(created.name, "created with the name supplied").toBe(name);
    expect(created.parentId, "created at top level with null parentId").toBeNull();

    const after = await groupList();
    expect(after.length, "exactly one group added").toBe(before.length + 1);
    expect(findGroup(after, created.id), "new group is in listed groups").toBeDefined();

    // Clean up
    await groups.deleteGroup(created.id);
  });
});

describe("AC-3 — A group is created as the child of an existing group", () => {
  it("AC-3: creates child group referencing parent group id", async () => {
    const parent = await create(groupName("AC3-Parent"));
    const before = await groupList();

    const childName = groupName("AC3-Child");
    const child = await create(childName, parent.id);

    expect(child.name, "created with child name").toBe(childName);
    expect(child.parentId, "created with parentId pointing to parent").toBe(parent.id);

    const after = await groupList();
    expect(after.length, "exactly one group added").toBe(before.length + 1);
    const foundChild = findGroup(after, child.id);
    expect(foundChild?.parentId, "listed child references parent").toBe(parent.id);

    // Clean up
    await groups.deleteGroup(child.id);
    await groups.deleteGroup(parent.id);
  });
});

describe("AC-4a — Creation is refused when a group with that name already sits under the same parent", () => {
  it("AC-4a: duplicate name under same parent is refused with DUPLICATE_NAME_IN_PARENT", async () => {
    const parent = await create(groupName("AC4a-Parent"));
    const name = groupName("AC4a-Name");
    const first = await create(name, parent.id);

    const before = await groupList();
    const outcome = await groups.createGroup({ name, parentId: parent.id });

    expect(outcome.created, "duplicate under same parent is refused").toBe(false);
    expect(outcome.created === false && outcome.reason, "reason is DUPLICATE_NAME_IN_PARENT").toBe(
      "DUPLICATE_NAME_IN_PARENT"
    );

    const after = await groupList();
    expect(after, "group list is unchanged").toEqual(before);

    // Clean up
    await groups.deleteGroup(first.id);
    await groups.deleteGroup(parent.id);
  });

  it("AC-4a: duplicate name at top level (parentId null) is also refused", async () => {
    const name = groupName("AC4a-Top");
    const first = await create(name);

    const before = await groupList();
    const outcome = await groups.createGroup({ name, parentId: null });

    expect(outcome.created, "duplicate at top level is refused").toBe(false);
    expect(outcome.created === false && outcome.reason, "reason is DUPLICATE_NAME_IN_PARENT").toBe(
      "DUPLICATE_NAME_IN_PARENT"
    );

    const after = await groupList();
    expect(after, "group list is unchanged").toEqual(before);

    // Clean up
    await groups.deleteGroup(first.id);
  });
});

describe("AC-4b — The same name is permitted beneath a different parent", () => {
  it("AC-4b: identical group names under different parents are both created successfully", async () => {
    const parent1 = await create(groupName("AC4b-P1"));
    const parent2 = await create(groupName("AC4b-P2"));
    const sharedName = "Platform-AC4b";

    const child1 = await create(sharedName, parent1.id);
    const child2 = await create(sharedName, parent2.id);

    expect(child1.name).toBe(sharedName);
    expect(child1.parentId).toBe(parent1.id);

    expect(child2.name).toBe(sharedName);
    expect(child2.parentId).toBe(parent2.id);

    const listed = await groupList();
    expect(findGroup(listed, child1.id)).toBeDefined();
    expect(findGroup(listed, child2.id)).toBeDefined();

    // Clean up
    await groups.deleteGroup(child1.id);
    await groups.deleteGroup(child2.id);
    await groups.deleteGroup(parent1.id);
    await groups.deleteGroup(parent2.id);
  });
});

describe("AC-5 — A group is renamed", () => {
  it("AC-5: updates name while preserving parentId and other groups", async () => {
    const parent = await create(groupName("AC5-Parent"));
    const group = await create(groupName("AC5-Orig"), parent.id);
    const newName = groupName("AC5-Renamed");

    const before = await groupList();
    const outcome = await groups.updateGroup(group.id, { name: newName, parentId: group.parentId });

    expect(outcome.updated, "update succeeded").toBe(true);
    if (outcome.updated) {
      expect(outcome.group.name).toBe(newName);
      expect(outcome.group.parentId).toBe(parent.id);
    }

    const after = await groupList();
    const updated = findGroup(after, group.id);
    expect(updated?.name).toBe(newName);
    expect(updated?.parentId).toBe(parent.id);

    // Submitting own existing name unchanged is not refused
    const sameOutcome = await groups.updateGroup(group.id, { name: newName, parentId: group.parentId });
    expect(sameOutcome.updated, "submitting own existing name unchanged succeeds").toBe(true);

    // Clean up
    await groups.deleteGroup(group.id);
    await groups.deleteGroup(parent.id);
  });
});

describe("AC-5a — Renaming is refused when a sibling already holds the new name", () => {
  it("AC-5a: rename to sibling name is refused with DUPLICATE_NAME_IN_PARENT", async () => {
    const parent = await create(groupName("AC5a-Parent"));
    const nameA = groupName("AC5a-A");
    const nameB = groupName("AC5a-B");

    const groupA = await create(nameA, parent.id);
    const groupB = await create(nameB, parent.id);

    const before = await groupList();
    const outcome = await groups.updateGroup(groupA.id, { name: nameB, parentId: parent.id });

    expect(outcome.updated, "rename to sibling name is refused").toBe(false);
    expect(outcome.updated === false && outcome.reason, "reason is DUPLICATE_NAME_IN_PARENT").toBe(
      "DUPLICATE_NAME_IN_PARENT"
    );

    const after = await groupList();
    expect(after, "all groups remain unchanged").toEqual(before);

    // Clean up
    await groups.deleteGroup(groupA.id);
    await groups.deleteGroup(groupB.id);
    await groups.deleteGroup(parent.id);
  });
});

describe("AC-6 — A group is moved to a different parent", () => {
  it("AC-6: moves group to new parent, preserving its own children", async () => {
    const parent1 = await create(groupName("AC6-P1"));
    const parent2 = await create(groupName("AC6-P2"));
    const child = await create(groupName("AC6-Child"), parent1.id);
    const grandChild = await create(groupName("AC6-GrandChild"), child.id);

    const outcome = await groups.updateGroup(child.id, { name: child.name, parentId: parent2.id });
    expect(outcome.updated, "update succeeded").toBe(true);
    if (outcome.updated) {
      expect(outcome.group.parentId).toBe(parent2.id);
    }

    const after = await groupList();
    expect(findGroup(after, child.id)?.parentId, "child now has parent2").toBe(parent2.id);
    expect(findGroup(after, grandChild.id)?.parentId, "grandchild still has child").toBe(child.id);

    // Clean up
    await groups.deleteGroup(grandChild.id);
    await groups.deleteGroup(child.id);
    await groups.deleteGroup(parent1.id);
    await groups.deleteGroup(parent2.id);
  });
});

describe("AC-6a — A move is refused when the destination parent already holds a group with that name", () => {
  it("AC-6a: move colliding with destination sibling is refused with DUPLICATE_NAME_IN_PARENT", async () => {
    const destParent = await create(groupName("AC6a-Dest"));
    const sharedName = groupName("AC6a-Shared");

    const existingDestChild = await create(sharedName, destParent.id);
    const topGroup = await create(sharedName, null);

    const before = await groupList();
    const outcome = await groups.updateGroup(topGroup.id, { name: topGroup.name, parentId: destParent.id });

    expect(outcome.updated, "move is refused").toBe(false);
    expect(outcome.updated === false && outcome.reason, "reason is DUPLICATE_NAME_IN_PARENT").toBe(
      "DUPLICATE_NAME_IN_PARENT"
    );

    const after = await groupList();
    expect(after, "group list is unchanged").toEqual(before);

    // Clean up
    await groups.deleteGroup(topGroup.id);
    await groups.deleteGroup(existingDestChild.id);
    await groups.deleteGroup(destParent.id);
  });
});

describe("AC-7 — A group is moved to the top level", () => {
  it("AC-7: moves child group to top level with parentId null", async () => {
    const parent = await create(groupName("AC7-Parent"));
    const child = await create(groupName("AC7-Child"), parent.id);

    const outcome = await groups.updateGroup(child.id, { name: child.name, parentId: null });
    expect(outcome.updated, "move to top level succeeded").toBe(true);
    if (outcome.updated) {
      expect(outcome.group.parentId).toBeNull();
    }

    const after = await groupList();
    expect(findGroup(after, child.id)?.parentId).toBeNull();
    expect(findGroup(after, parent.id)).toBeDefined();

    // Clean up
    await groups.deleteGroup(child.id);
    await groups.deleteGroup(parent.id);
  });
});

describe("AC-8 — A group may not be made its own ancestor", () => {
  it("AC-8: setting parent to self is refused with ANCESTOR_CYCLE", async () => {
    const group = await create(groupName("AC8-Self"));

    const before = await groupList();
    const outcome = await groups.updateGroup(group.id, { name: group.name, parentId: group.id });

    expect(outcome.updated, "self-parenting is refused").toBe(false);
    expect(outcome.updated === false && outcome.reason, "reason is ANCESTOR_CYCLE").toBe("ANCESTOR_CYCLE");

    const after = await groupList();
    expect(after, "group list unchanged").toEqual(before);

    // Clean up
    await groups.deleteGroup(group.id);
  });

  it("AC-8: setting parent to a descendant is refused with ANCESTOR_CYCLE", async () => {
    const parent = await create(groupName("AC8-P"));
    const child = await create(groupName("AC8-C"), parent.id);
    const grandChild = await create(groupName("AC8-GC"), child.id);

    const before = await groupList();
    const outcome = await groups.updateGroup(parent.id, { name: parent.name, parentId: grandChild.id });

    expect(outcome.updated, "cycle move is refused").toBe(false);
    expect(outcome.updated === false && outcome.reason, "reason is ANCESTOR_CYCLE").toBe("ANCESTOR_CYCLE");

    const after = await groupList();
    expect(after, "group list unchanged").toEqual(before);

    // Clean up
    await groups.deleteGroup(grandChild.id);
    await groups.deleteGroup(child.id);
    await groups.deleteGroup(parent.id);
  });
});

describe("AC-9 & AC-10 — Invariants and untouched entities", () => {
  it("AC-9: group operations never delete a Member (INV-12)", async () => {
    const membersBefore = await memberList();

    const g = await create(groupName("AC9-Temp"));
    await groups.updateGroup(g.id, { name: groupName("AC9-Renamed"), parentId: g.parentId });
    await groups.deleteGroup(g.id);

    const membersAfter = await memberList();
    expect(membersAfter.length, "member count untouched").toBe(membersBefore.length);
    expect(membersAfter.map((m) => m.id).sort()).toEqual(membersBefore.map((m) => m.id).sort());
  });

  it("AC-10: group operations never touch seats, devices, or occupancies", async () => {
    const seatsBefore = await seatList();
    const devicesBefore = await deviceList();

    const g = await create(groupName("AC10-Temp"));
    await groups.updateGroup(g.id, { name: groupName("AC10-Renamed"), parentId: g.parentId });
    await groups.deleteGroup(g.id);

    expect(await seatList(), "seats untouched").toEqual(seatsBefore);
    expect(await deviceList(), "devices untouched").toEqual(devicesBefore);
  });
});

describe("AC-11 — A group with no children and no members is deleted", () => {
  it("AC-11: deletes empty group, returning membersDetached 0", async () => {
    const group = await create(groupName("AC11"));
    const before = await groupList();

    const outcome = await groups.deleteGroup(group.id);
    expect(outcome.deleted, "delete succeeded").toBe(true);
    if (outcome.deleted) {
      expect(outcome.groupId).toBe(group.id);
      expect(outcome.membersDetached).toBe(0);
    }

    const after = await groupList();
    expect(after.length, "group count decreased by 1").toBe(before.length - 1);
    expect(findGroup(after, group.id), "deleted group no longer in list").toBeUndefined();
  });

  it("AC-11: deleting non-existent group returns NOT_FOUND", async () => {
    const outcome = await groups.deleteGroup("no-such-group-id");
    expect(outcome.deleted).toBe(false);
    expect(outcome.deleted === false && outcome.reason).toBe("NOT_FOUND");
  });
});

describe("AC-12 — Deleting a group that has child groups is refused", () => {
  it("AC-12: delete is refused with HAS_CHILDREN", async () => {
    const parent = await create(groupName("AC12-Parent"));
    const child1 = await create(groupName("AC12-Child1"), parent.id);
    const child2 = await create(groupName("AC12-Child2"), parent.id);

    const before = await groupList();
    const outcome = await groups.deleteGroup(parent.id);

    expect(outcome.deleted, "delete is refused").toBe(false);
    expect(outcome.deleted === false && outcome.reason, "reason is HAS_CHILDREN").toBe("HAS_CHILDREN");

    const after = await groupList();
    expect(after, "group list is unchanged").toEqual(before);

    // Clean up
    await groups.deleteGroup(child1.id);
    await groups.deleteGroup(child2.id);
    await groups.deleteGroup(parent.id);
  });
});

describe("AC-13 — Deleting a group that has members detaches them (RUNS LAST)", () => {
  it("AC-13: deleting Platform detaches its members to groupId null without modifying other member fields", async () => {
    // Section 6.2: Platform has 2 members in seed, no children.
    const allMembersBefore = await memberList();
    const platformMembers = allMembersBefore.filter((m) => m.groupId === seededPlatform.id);
    expect(platformMembers.length, "Platform has members in seed (section 6.2)").toBe(2);

    const seatsBefore = await seatList();
    const devicesBefore = await deviceList();

    const outcome = await groups.deleteGroup(seededPlatform.id);
    expect(outcome.deleted, "deleting Platform succeeds").toBe(true);
    if (outcome.deleted) {
      expect(outcome.groupId).toBe(seededPlatform.id);
      expect(outcome.membersDetached).toBe(2);
    }

    const afterGroups = await groupList();
    expect(findGroup(afterGroups, seededPlatform.id), "Platform is gone from groups").toBeUndefined();

    const allMembersAfter = await memberList();
    expect(allMembersAfter.length, "no member was deleted").toBe(allMembersBefore.length);

    for (const pm of platformMembers) {
      const updatedMember = allMembersAfter.find((m) => m.id === pm.id);
      expect(updatedMember, "detached member still exists").toBeDefined();
      expect(updatedMember?.groupId, "detached member now has null groupId").toBeNull();
      expect(updatedMember?.fullName, "fullName preserved").toBe(pm.fullName);
      expect(updatedMember?.email, "email preserved").toBe(pm.email);
      expect(updatedMember?.role, "role preserved").toBe(pm.role);
    }

    expect(await seatList(), "seats untouched").toEqual(seatsBefore);
    expect(await deviceList(), "devices untouched").toEqual(devicesBefore);
  });
});
