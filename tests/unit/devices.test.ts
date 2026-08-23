// DEV-01 — the seven device write paths, and the four invariants that live inside them.
//
// Written from `01-story.md` and `02-design.md` section 6 only. `src/**` was not read (RULE-05).
// Section 6.1 names the eleven calls this file may make and the fields it may assert on, and points
// at section 1.1 for the refusal reason strings — "part of the contract, assert on them by value" —
// which is the only text outside section 6 this file was written against. That pointer is recorded
// in 05-test-plan.md rather than left implicit.
//
// NOTHING SEEDED IS QUOTED. Every device here is one this file created; every seat and every member
// is discovered through `seats.listSeats()` and `members.listMembers()`, which section 6.1 calls the
// bridge from the story's names to the seam's ids. No fixture identifier appears below, because QA
// is not permitted to read the file that defines them.
//
// Mock state is process-global within this file and has no reset hook (section 6.1). Each block
// below therefore creates the devices it acts on, and every "nothing else changed" assertion is made
// against a snapshot taken immediately before the act rather than against a snapshot from setup.

import { beforeAll, describe, expect, it } from "vitest";

import { devices, members, seats } from "@/lib/data";

type Device = Awaited<ReturnType<typeof devices.listDevices>>[number];
type Seat = Awaited<ReturnType<typeof seats.listSeats>>[number];
type Member = Awaited<ReturnType<typeof members.listMembers>>[number];

/** Unique per run, so a store that survives between runs cannot collide on `assetTag` (F-1). */
const RUN = Date.now().toString(36).toUpperCase();
let minted = 0;

/** Section 6's advice on test data: keep an asset tag a single token, in the seed's own shape. */
function tag(label: string): string {
  minted += 1;
  return `AST-QA-${RUN}-${label}-${minted}`;
}

let occupiedSeat: Seat;
let vacantSeat: Seat;
let occupant: Member;
/** A member who is not `occupant`. AC-8 and AC-11 both turn on the mismatch. */
let stranger: Member;

async function snapshot(): Promise<Device[]> {
  // Cloned, not referenced: the seam hands back live objects, so a shallow copy would be mutated by
  // the act under test and every before/after comparison would compare a value with itself.
  return structuredClone(await devices.listDevices());
}

function find(list: Device[], id: string): Device | undefined {
  return list.find((d) => d.id === id);
}

/** Create a device and fail loudly rather than returning a refusal into an assertion. */
async function createOwnedBy(ownerId: string, label: string): Promise<Device> {
  const outcome = await devices.createDevice({
    assetTag: tag(label),
    model: `QA model ${label}`,
    ownerId,
  });
  if (!outcome.created) throw new Error(`createDevice refused: ${JSON.stringify(outcome)}`);
  return outcome.device;
}

async function assign(deviceId: string, seatId: string): Promise<Device> {
  const outcome = await devices.assignDeviceToSeat(deviceId, seatId);
  if (!outcome.assigned) throw new Error(`assignDeviceToSeat refused: ${JSON.stringify(outcome)}`);
  return outcome.device;
}

async function designate(deviceId: string): Promise<Extract<
  Awaited<ReturnType<typeof devices.designatePrimaryDevice>>,
  { designated: true }
>> {
  const outcome = await devices.designatePrimaryDevice(deviceId);
  if (!outcome.designated) {
    throw new Error(`designatePrimaryDevice refused: ${JSON.stringify(outcome)}`);
  }
  return outcome;
}

/** A seat occupied by `occupant`, holding a device of ours that is its PRIMARY. AC-11 and AC-13. */
async function primaryOnOccupiedSeat(label: string): Promise<Device> {
  const device = await createOwnedBy(occupant.id, label);
  await assign(device.id, occupiedSeat.id);
  return (await designate(device.id)).device;
}

beforeAll(async () => {
  const allSeats = await seats.listSeats();
  const allMembers = await members.listMembers();

  const occupied = allSeats.find((s) => s.occupantId !== null);
  const vacant = allSeats.find((s) => s.occupantId === null);

  // The Givens, asserted rather than assumed. `01-story.md` A-5 infers both from counts and says in
  // terms that if no unoccupied seat exists the story must be amended, not worked around — so this
  // has to fail as a missing precondition, not as a confusing null further down.
  if (!occupied) throw new Error("no seat has an occupant; AC-7, AC-8, AC-11 and AC-13 need one (A-5)");
  if (!vacant) throw new Error("no seat is unoccupied; AC-10 needs one (A-5)");

  const theOccupant = allMembers.find((m) => m.id === occupied.occupantId);
  if (!theOccupant) throw new Error("the occupied seat's occupant is not a listed member");

  const other = allMembers.find((m) => m.id !== theOccupant.id);
  if (!other) throw new Error("only one member exists; AC-8 and AC-11 need an owner who is not the occupant");

  occupiedSeat = occupied;
  vacantSeat = vacant;
  occupant = theOccupant;
  stranger = other;
});

describe("AC-2 — a device is created into unassigned inventory (INV-07)", () => {
  it("AC-2: the new device is listed, owned by the member chosen, unassigned and not primary", async () => {
    const before = await snapshot();
    const created = await createOwnedBy(stranger.id, "AC2");

    expect(created.ownerId, "owned by the member I chose").toBe(stranger.id);
    expect(created.seatId, "shown as unassigned").toBeNull();
    expect(created.rank, "not a primary device").toBe("SECONDARY");

    const after = await snapshot();
    expect(after.length, "exactly one device was added").toBe(before.length + 1);
    expect(find(after, created.id), "the new device appears in the device list").toBeDefined();

    // AC-2 says a device is born into inventory. `listUnassignedDevices()` is the seam's own account
    // of what inventory holds, and a create that landed the device anywhere else would still satisfy
    // `seatId === null` on the returned object while being absent here.
    const inventory = await devices.listUnassignedDevices();
    expect(inventory.map((d) => d.id), "born into inventory — INV-07").toContain(created.id);
    expect(
      inventory.every((d) => d.seatId === null),
      "every element of inventory has no seat"
    ).toBe(true);
  });
});

describe("AC-4 — an existing device's attributes are changed", () => {
  it("AC-4: the new value is stored, and seat, designation and device count are untouched", async () => {
    const device = await createOwnedBy(occupant.id, "AC4");
    await assign(device.id, occupiedSeat.id);

    const before = await snapshot();
    const beforeSelf = find(before, device.id);
    expect(beforeSelf?.seatId, "the Given: it is assigned to a seat").toBe(occupiedSeat.id);

    const outcome = await devices.updateDevice(device.id, {
      assetTag: beforeSelf!.assetTag,
      model: "QA model AC4 edited",
      ownerId: beforeSelf!.ownerId!,
    });
    expect(outcome.updated, `updateDevice: ${JSON.stringify(outcome)}`).toBe(true);

    const after = await snapshot();
    const self = find(after, device.id);
    expect(self?.model, "the list shows the new value").toBe("QA model AC4 edited");
    expect(after.length, "the number of devices is unchanged").toBe(before.length);
    expect(self?.seatId, "its seat assignment is unchanged").toBe(beforeSelf!.seatId);
    expect(self?.rank, "its designation is unchanged").toBe(beforeSelf!.rank);
    expect(self?.ownerId, "its owner is unchanged").toBe(beforeSelf!.ownerId);
  });
});

describe("AC-5 — an unassigned device is assigned to a seat, and lands secondary (INV-04)", () => {
  it("AC-5: assignment does not confer primacy, and does not disturb the seat's existing primary", async () => {
    // The incumbent is built rather than looked for: AC-5's last clause is about a seat that already
    // has a primary device, and a test that ran against a seat with none would assert nothing.
    const incumbent = await primaryOnOccupiedSeat("AC5-incumbent");

    const device = await createOwnedBy(occupant.id, "AC5");
    expect(device.seatId, "the Given: it is unassigned").toBeNull();

    const before = await snapshot();
    const assigned = await assign(device.id, occupiedSeat.id);

    expect(assigned.seatId, "the list shows it assigned to that seat").toBe(occupiedSeat.id);
    expect(assigned.rank, "it is a secondary device, not the seat's primary").toBe("SECONDARY");
    expect(assigned.ownerId, "its owner is unchanged").toBe(device.ownerId);

    const after = await snapshot();
    expect(
      find(after, incumbent.id)?.rank,
      "the device that was already primary on that seat still is — INV-04 by side door"
    ).toBe("PRIMARY");
    expect(find(after, incumbent.id)?.seatId).toBe(occupiedSeat.id);
    expect(after.length, "assignment creates and destroys nothing").toBe(before.length);
  });
});

describe("AC-6 — a device is unassigned and returns to inventory (INV-07, INV-04)", () => {
  it("AC-6: a PRIMARY device unassigned keeps existing, loses its seat and loses its rank", async () => {
    // The harder half of the criterion: "the clause about primacy applies whether or not the device
    // was the seat's primary device before". A primary flag that outlived its assignment is a row
    // neither INV-04 nor INV-05 can be evaluated against.
    const device = await primaryOnOccupiedSeat("AC6");
    expect(device.rank, "the Given: it is that seat's primary device").toBe("PRIMARY");

    const before = await snapshot();
    const outcome = await devices.unassignDevice(device.id);
    expect(outcome.unassigned, `unassignDevice: ${JSON.stringify(outcome)}`).toBe(true);

    const after = await snapshot();
    const self = find(after, device.id);
    expect(self, "it still exists — unassigning is not deleting, INV-07").toBeDefined();
    expect(self?.seatId, "the list shows it as unassigned").toBeNull();
    expect(self?.rank, "it is not a primary device of any seat").toBe("SECONDARY");
    expect(self?.ownerId, "its owner is unchanged").toBe(device.ownerId);

    // "And no other device changes its seat, its owner, or its primary or secondary designation."
    for (const b of before) {
      if (b.id === device.id) continue;
      const a = find(after, b.id);
      expect(a, `${b.assetTag} still exists`).toBeDefined();
      expect(
        { seatId: a?.seatId, ownerId: a?.ownerId, rank: a?.rank },
        `${b.assetTag} is untouched`
      ).toEqual({ seatId: b.seatId, ownerId: b.ownerId, rank: b.rank });
    }
  });
});

describe("AC-7 — an assigned device is designated its seat's primary device (INV-04, INV-05)", () => {
  it("AC-7: designating the second demotes the first, and touches no other seat", async () => {
    const first = await createOwnedBy(occupant.id, "AC7-first");
    const second = await createOwnedBy(occupant.id, "AC7-second");
    await assign(first.id, occupiedSeat.id);
    await assign(second.id, occupiedSeat.id);
    await designate(first.id);

    const before = await snapshot();
    expect(find(before, first.id)?.rank, "the Given: the first is the seat's primary").toBe("PRIMARY");

    const outcome = await designate(second.id);

    expect(outcome.device.rank, "the list shows the second as that seat's primary").toBe("PRIMARY");
    expect(
      outcome.demotedDeviceId,
      "the outcome names the incumbent it demoted, rather than leaving it to be inferred"
    ).toBe(first.id);

    const after = await snapshot();
    const demoted = find(after, first.id);
    expect(demoted?.rank, "the previous primary is now a secondary device of that seat").toBe("SECONDARY");
    expect(demoted?.seatId, "and is still assigned to that seat").toBe(occupiedSeat.id);
    expect(demoted?.ownerId, "and its owner is unchanged").toBe(first.ownerId);

    // "And no device on any other seat changes its designation."
    for (const b of before) {
      if (b.seatId === occupiedSeat.id) continue;
      expect(find(after, b.id)?.rank, `${b.assetTag} sits on another seat and is unmoved`).toBe(b.rank);
    }

    // INV-04 stated directly, on the seat the act touched: a designation that added rather than
    // replaced would leave two, and every assertion above would still pass.
    const primaries = after.filter((d) => d.seatId === occupiedSeat.id && d.rank === "PRIMARY");
    expect(primaries.map((d) => d.id), "the seat holds exactly one primary — INV-04").toEqual([second.id]);
  });
});

describe("AC-8 — designation is refused when the owner is not the seat's occupant (INV-05)", () => {
  it("AC-8: refused with OWNER_IS_NOT_OCCUPANT, and nothing moves", async () => {
    const device = await createOwnedBy(stranger.id, "AC8");
    await assign(device.id, occupiedSeat.id);
    expect(occupant.id, "the Given: the seat's occupant is not this device's owner").not.toBe(stranger.id);

    const before = await snapshot();
    const outcome = await devices.designatePrimaryDevice(device.id);

    expect(outcome.designated, "it is not designated primary").toBe(false);
    expect(
      outcome.designated === false && outcome.reason,
      "the reason distinguishes this from AC-10, which is where the defect hides"
    ).toBe("OWNER_IS_NOT_OCCUPANT");

    // "And no device changes its owner, its seat, or its designation."
    const after = await snapshot();
    for (const b of before) {
      const a = find(after, b.id);
      expect(
        { seatId: a?.seatId, ownerId: a?.ownerId, rank: a?.rank },
        `${b.assetTag} is untouched by the refusal`
      ).toEqual({ seatId: b.seatId, ownerId: b.ownerId, rank: b.rank });
    }
  });
});

describe("AC-9 — designation is refused for a device assigned to no seat (INV-04, INV-05)", () => {
  it("AC-9: refused with NOT_ASSIGNED, the device stays unassigned, the list is otherwise unchanged", async () => {
    const device = await createOwnedBy(occupant.id, "AC9");
    expect(device.seatId, "the Given: the device is unassigned").toBeNull();

    const before = await snapshot();
    const outcome = await devices.designatePrimaryDevice(device.id);

    expect(outcome.designated, "it is not designated primary").toBe(false);
    expect(outcome.designated === false && outcome.reason).toBe("NOT_ASSIGNED");

    const after = await snapshot();
    const self = find(after, device.id);
    expect(self?.seatId, "it is still shown as unassigned").toBeNull();
    expect(self?.rank, "and carries no primary designation without a seat").toBe("SECONDARY");
    expect(after, "the device list is otherwise unchanged").toEqual(before);
  });
});

describe("AC-10 — designation is refused when the seat has no occupant (INV-05)", () => {
  it("AC-10: refused with SEAT_HAS_NO_OCCUPANT, not with AC-8's reason", async () => {
    const device = await createOwnedBy(occupant.id, "AC10");
    await assign(device.id, vacantSeat.id);
    expect(vacantSeat.occupantId, "the Given: the seat has no occupant").toBeNull();

    const outcome = await devices.designatePrimaryDevice(device.id);

    expect(outcome.designated, "it is not designated primary").toBe(false);
    // This is the whole point of separating AC-10 from AC-8. A comparison written so that an absent
    // occupant is a non-match refuses for the right reason by accident and reports AC-8's code;
    // written so that it compares equal, or skipped, it permits a primary device on an empty seat.
    // Only the reason string tells the three apart.
    expect(outcome.designated === false && outcome.reason).toBe("SEAT_HAS_NO_OCCUPANT");

    const self = await devices.getDevice(device.id);
    expect(self?.seatId, "the device is still assigned to that seat").toBe(vacantSeat.id);
    expect(self?.rank, "as a secondary device").toBe("SECONDARY");
  });
});

describe("AC-11 — the owner of a seat's primary device may not become a non-occupant (INV-05)", () => {
  it("AC-11: refused with PRIMARY_OWNER_MUST_BE_OCCUPANT, and the device is still primary and still owned by the occupant", async () => {
    const device = await primaryOnOccupiedSeat("AC11");
    expect(device.rank, "the Given: it is the seat's primary device").toBe("PRIMARY");
    expect(device.ownerId, "owned by the seat's occupant").toBe(occupant.id);

    const outcome = await devices.updateDevice(device.id, {
      assetTag: device.assetTag,
      model: device.model,
      ownerId: stranger.id,
    });

    expect(outcome.updated, "the owner is not changed").toBe(false);
    expect(outcome.updated === false && outcome.reason).toBe("PRIMARY_OWNER_MUST_BE_OCCUPANT");

    const self = await devices.getDevice(device.id);
    expect(self?.ownerId, "still owned by the occupant").toBe(occupant.id);
    expect(self?.rank, "still that seat's primary device").toBe("PRIMARY");
    expect(self?.seatId).toBe(occupiedSeat.id);
  });

  it("AC-11: the same edit is accepted once the device is no longer the seat's primary", async () => {
    // The control. Without it the criterion is satisfied by an `updateDevice` that refuses every
    // owner change, which is a different behaviour and a wrong one — AC-4 requires the edit to work.
    const device = await primaryOnOccupiedSeat("AC11-control");
    const unassigned = await devices.unassignDevice(device.id);
    expect(unassigned.unassigned, `unassignDevice: ${JSON.stringify(unassigned)}`).toBe(true);

    const outcome = await devices.updateDevice(device.id, {
      assetTag: device.assetTag,
      model: device.model,
      ownerId: stranger.id,
    });
    expect(outcome.updated, `the owner change is permitted off a seat: ${JSON.stringify(outcome)}`).toBe(true);
    expect((await devices.getDevice(device.id))?.ownerId).toBe(stranger.id);
  });
});

describe("AC-12 — a device in inventory is deleted", () => {
  it("AC-12: the device is gone, it was primary of no seat, and no other device is affected", async () => {
    const device = await createOwnedBy(stranger.id, "AC12");
    expect(device.seatId, "the Given: the device is unassigned").toBeNull();

    const before = await snapshot();
    const outcome = await devices.deleteDevice(device.id);

    expect(outcome.deleted, `deleteDevice: ${JSON.stringify(outcome)}`).toBe(true);
    expect(
      outcome.deleted === true && outcome.wasPrimaryOfSeatId,
      "an inventory device is the primary of nothing"
    ).toBeNull();

    const after = await snapshot();
    expect(find(after, device.id), "it no longer appears in the device list").toBeUndefined();
    expect(after.length).toBe(before.length - 1);
    // "And no other device is affected." Deep equality over the survivors, which is stronger than
    // checking the fields the criterion happens to name.
    expect(after).toEqual(before.filter((d) => d.id !== device.id));
  });
});

describe("AC-13 — deleting a seat's primary device leaves the seat with none (INV-04)", () => {
  it("AC-13: the outcome names the seat, the seat ends with no primary, and the seat's other devices are intact", async () => {
    const primary = await createOwnedBy(occupant.id, "AC13-primary");
    const sibling = await createOwnedBy(occupant.id, "AC13-sibling");
    await assign(primary.id, occupiedSeat.id);
    await assign(sibling.id, occupiedSeat.id);
    await designate(primary.id);

    const before = await snapshot();
    expect(find(before, primary.id)?.rank, "the Given: it is that seat's primary device").toBe("PRIMARY");

    const outcome = await devices.deleteDevice(primary.id);
    expect(outcome.deleted, `deleteDevice: ${JSON.stringify(outcome)}`).toBe(true);
    expect(
      outcome.deleted === true && outcome.wasPrimaryOfSeatId,
      "the outcome names the seat left with no primary — after the row is gone it is not otherwise readable"
    ).toBe(occupiedSeat.id);

    const after = await snapshot();
    expect(find(after, primary.id), "that device no longer appears").toBeUndefined();

    // "And that seat has no primary device." Legal: INV-04 sets a maximum of one, not a minimum.
    expect(
      after.filter((d) => d.seatId === occupiedSeat.id && d.rank === "PRIMARY").map((d) => d.assetTag),
      "the seat is left with no primary device"
    ).toEqual([]);

    // The control, in the shape ROO-01's AC-14 took: without it the criterion cannot tell a delete
    // that removes one device from one that removes or demotes every device on the seat.
    const siblingAfter = find(after, sibling.id);
    expect(siblingAfter?.seatId, "the sibling is still assigned to that seat").toBe(occupiedSeat.id);
    expect(siblingAfter?.rank, "with its secondary designation intact").toBe("SECONDARY");
    expect(siblingAfter?.ownerId, "and its owner intact").toBe(occupant.id);

    // The seat itself still exists, with its occupant unchanged — deleting a device is not an
    // occupant exit, so INV-06 does not fire here.
    const seatAfter = (await seats.listSeats()).find((s) => s.id === occupiedSeat.id);
    expect(seatAfter, "the seat itself still exists").toBeDefined();
    expect(seatAfter?.occupantId, "with its occupant unchanged").toBe(occupiedSeat.occupantId);
  });
});

describe("invariant probes — the assertions that fail if an invariant stops holding", () => {
  it("INV-04: no seat holds more than one primary device, after every act above", async () => {
    const bySeat = new Map<string, string[]>();
    for (const d of await devices.listDevices()) {
      if (d.seatId === null || d.rank !== "PRIMARY") continue;
      bySeat.set(d.seatId, [...(bySeat.get(d.seatId) ?? []), d.assetTag]);
    }
    const offenders = [...bySeat.entries()].filter(([, tags]) => tags.length > 1);
    expect(offenders, "a seat with two primary devices — INV-04").toEqual([]);
  });

  it("INV-05: every primary device is owned by the occupant of the seat it sits on", async () => {
    const seatById = new Map((await seats.listSeats()).map((s) => [s.id, s]));
    const offenders: string[] = [];
    for (const d of await devices.listDevices()) {
      if (d.rank !== "PRIMARY" || d.seatId === null) continue;
      const seat = seatById.get(d.seatId);
      if (!seat || seat.occupantId === null || seat.occupantId !== d.ownerId) offenders.push(d.assetTag);
    }
    expect(offenders, "a primary device not owned by its seat's occupant — INV-05").toEqual([]);
  });

  it("INV-04, INV-06: no device carries a primary designation without a seat to hold it", async () => {
    // The state INV-06's downgrade path could not repair even if it existed, and the one AC-6 and
    // AC-9 are jointly written to prevent. `01-story.md` calls DEV-01's obligation to INV-06
    // negative: do not create a designation the exit path cannot find.
    const stranded = (await devices.listDevices()).filter((d) => d.seatId === null && d.rank === "PRIMARY");
    expect(stranded.map((d) => d.assetTag), "a primary device on no seat").toEqual([]);
  });

  it("INV-07: inventory is a state a device can be in, and it is exactly the set with no seat", async () => {
    const all = await devices.listDevices();
    const inventory = await devices.listUnassignedDevices();
    expect(
      inventory.map((d) => d.id).sort(),
      "listUnassignedDevices is the devices with no seat, no more and no fewer"
    ).toEqual(all.filter((d) => d.seatId === null).map((d) => d.id).sort());
    expect(inventory.length, "at least one device sits unassigned in inventory — INV-07").toBeGreaterThan(0);
  });
});
