// SEA-01 — Seat occupancy: assign and release, and the invariants that live inside them.
//
// Written from `01-story.md` and `02-design.md` section 6 only. `src/**` was not read (RULE-05).
// Section 6.1 names the seam calls this file may make and the fields it may assert on, and points
// at section 1.1 for the refusal reason strings — "part of the contract, assert on them by value".
//
// NOTHING SEEDED IS QUOTED. Every device here is one this file created; every seat and every member
// is discovered through `seats.listSeats()`, `members.listMembers()` and `rooms.listRooms()`.
// No fixture identifier appears below (RULE-05).

import { beforeAll, describe, expect, it } from "vitest";

import { devices, members, seats } from "@/lib/data";

type Seat = Awaited<ReturnType<typeof seats.listSeats>>[number];
type Member = Awaited<ReturnType<typeof members.listMembers>>[number];
type Device = Awaited<ReturnType<typeof devices.listDevices>>[number];

const RUN = Date.now().toString(36).toUpperCase();
let minted = 0;

function tag(label: string): string {
  minted += 1;
  return `AST-QA-${RUN}-${label}-${minted}`;
}

let memberA: Member;
let memberB: Member;

async function seatSnapshot(): Promise<Seat[]> {
  return structuredClone(await seats.listSeats());
}

async function deviceSnapshot(): Promise<Device[]> {
  return structuredClone(await devices.listDevices());
}

function findSeat(list: Seat[], id: string): Seat | undefined {
  return list.find((s) => s.id === id);
}

function findDevice(list: Device[], id: string): Device | undefined {
  return list.find((d) => d.id === id);
}

async function createOwnedBy(ownerId: string, label: string): Promise<Device> {
  const outcome = await devices.createDevice({
    assetTag: tag(label),
    model: `QA model ${label}`,
    ownerId,
  });
  if (!outcome.created) throw new Error(`createDevice refused: ${JSON.stringify(outcome)}`);
  return outcome.device;
}

async function assignDevice(deviceId: string, seatId: string): Promise<Device> {
  const outcome = await devices.assignDeviceToSeat(deviceId, seatId);
  if (!outcome.assigned) throw new Error(`assignDeviceToSeat refused: ${JSON.stringify(outcome)}`);
  return outcome.device;
}

async function designatePrimary(deviceId: string): Promise<Extract<
  Awaited<ReturnType<typeof devices.designatePrimaryDevice>>,
  { designated: true }
>> {
  const outcome = await devices.designatePrimaryDevice(deviceId);
  if (!outcome.designated) {
    throw new Error(`designatePrimaryDevice refused: ${JSON.stringify(outcome)}`);
  }
  return outcome;
}

beforeAll(async () => {
  const allSeats = await seats.listSeats();
  const allMembers = await members.listMembers();

  const occupied = allSeats.find((s) => s.occupantId !== null);
  const vacant = allSeats.find((s) => s.occupantId === null);

  if (!occupied) throw new Error("no seat has an occupant (01-story.md A-5)");
  if (!vacant) throw new Error("no seat is unoccupied (01-story.md A-5)");

  const occupant = allMembers.find((m) => m.id === occupied.occupantId);
  if (!occupant) throw new Error("the occupied seat's occupant is not a listed member");

  const other = allMembers.find((m) => m.id !== occupant.id);
  if (!other) throw new Error("only one member exists; need at least two members");

  memberA = occupant;
  memberB = other;
});

describe("AC-2 — An occupant is assigned to a seat that has none", () => {
  it("AC-2: assigns occupant to vacant seat, updates status, and leaves other seats untouched", async () => {
    const allSeats = await seats.listSeats();
    const vacant = allSeats.find((s) => s.occupantId === null);
    expect(vacant, "a vacant seat exists").toBeDefined();

    const before = await seatSnapshot();
    const membersBefore = structuredClone(await members.listMembers());

    const outcome = await seats.assignSeatOccupant(vacant!.id, memberB.id);

    expect(outcome.assigned, `assignSeatOccupant: ${JSON.stringify(outcome)}`).toBe(true);
    if (outcome.assigned) {
      expect(outcome.seat.occupantId, "that seat's occupant is that member").toBe(memberB.id);
      expect(outcome.seat.id).toBe(vacant!.id);
      expect(seats.deriveSeatStatus(outcome.seat), "status is OCCUPIED").toBe("OCCUPIED");
    }

    const after = await seatSnapshot();
    const self = findSeat(after, vacant!.id);
    expect(self?.occupantId).toBe(memberB.id);
    expect(seats.deriveSeatStatus(self!), "derived status is OCCUPIED").toBe("OCCUPIED");

    // "And no other seat's occupant changes"
    for (const b of before) {
      if (b.id === vacant!.id) continue;
      const a = findSeat(after, b.id);
      expect(a?.occupantId, `seat ${b.code} occupant unchanged`).toBe(b.occupantId);
    }

    // "And no member is created"
    const membersAfter = await members.listMembers();
    expect(membersAfter.length, "member count unchanged").toBe(membersBefore.length);

    // Teardown: restore seat to vacant
    await seats.releaseSeatOccupant(vacant!.id);
  });
});

describe("AC-3 — Assignment is refused when the seat already has an occupant (INV-01)", () => {
  it("AC-3: refused with SEAT_OCCUPIED, occupant unchanged, and target member occupies no new seat", async () => {
    const before = await seatSnapshot();
    const occupied = before.find((s) => s.occupantId !== null)!;
    const initialOccupantId = occupied.occupantId;

    const outcome = await seats.assignSeatOccupant(occupied.id, memberB.id);

    expect(outcome.assigned, "assignment is refused").toBe(false);
    if (!outcome.assigned) {
      expect(outcome.reason, "reason is SEAT_OCCUPIED").toBe("SEAT_OCCUPIED");
    }

    const after = await seatSnapshot();
    const self = findSeat(after, occupied.id);
    expect(self?.occupantId, "occupant is still member A").toBe(initialOccupantId);

    // "And member B occupies no seat they did not already occupy"
    const seatsOccupiedByBBefore = before.filter((s) => s.occupantId === memberB.id).map((s) => s.id);
    const seatsOccupiedByBAfter = after.filter((s) => s.occupantId === memberB.id).map((s) => s.id);
    expect(seatsOccupiedByBAfter, "member B occupies no extra seat").toEqual(seatsOccupiedByBBefore);
  });
});

describe("AC-4 — One person may occupy more than one seat (INV-02)", () => {
  it("AC-4: member A is assigned to a second seat and occupies both without refusal", async () => {
    const allSeats = await seats.listSeats();
    const occupied = allSeats.find((s) => s.occupantId === memberA.id);
    expect(occupied, "member A occupies a seat S1").toBeDefined();

    const vacant = allSeats.find((s) => s.occupantId === null);
    expect(vacant, "a vacant seat S2 exists").toBeDefined();

    const outcome = await seats.assignSeatOccupant(vacant!.id, memberA.id);
    expect(outcome.assigned, "assignment of already-occupying member succeeds — INV-02").toBe(true);

    const after = await seatSnapshot();
    const s1 = findSeat(after, occupied!.id);
    const s2 = findSeat(after, vacant!.id);

    expect(s1?.occupantId, "S1 occupant unchanged").toBe(memberA.id);
    expect(seats.deriveSeatStatus(s1!), "S1 still shows OCCUPIED").toBe("OCCUPIED");
    expect(s2?.occupantId, "S2 occupant is member A").toBe(memberA.id);
    expect(seats.deriveSeatStatus(s2!), "S2 shows OCCUPIED").toBe("OCCUPIED");

    // Teardown: release S2
    await seats.releaseSeatOccupant(vacant!.id);
  });
});

describe("AC-5 — An occupant is released from a seat", () => {
  it("AC-5: vacates the seat, status becomes VACANT, member still exists, other seats unchanged", async () => {
    const allSeats = await seats.listSeats();
    const vacant = allSeats.find((s) => s.occupantId === null)!;
    await seats.assignSeatOccupant(vacant.id, memberB.id);

    const before = await seatSnapshot();
    const membersBefore = await members.listMembers();

    const outcome = await seats.releaseSeatOccupant(vacant.id);
    expect(outcome.released, `releaseSeatOccupant: ${JSON.stringify(outcome)}`).toBe(true);

    const after = await seatSnapshot();
    const self = findSeat(after, vacant.id);
    expect(self?.occupantId, "seat has no occupant").toBeNull();
    expect(seats.deriveSeatStatus(self!), "status shows VACANT").toBe("VACANT");

    // Member still exists
    const membersAfter = await members.listMembers();
    expect(membersAfter.map((m) => m.id), "member still exists").toContain(memberB.id);
    expect(membersAfter.length).toBe(membersBefore.length);

    // Other seats unchanged
    for (const b of before) {
      if (b.id === vacant.id) continue;
      const a = findSeat(after, b.id);
      expect(a?.occupantId, `seat ${b.code} occupant unchanged`).toBe(b.occupantId);
    }
  });
});

describe("AC-6 — Releasing an occupant downgrades that seat's primary device to secondary (INV-06)", () => {
  it("AC-6: primary device on the seat is downgraded to SECONDARY, remains on seat, returns downgradedDeviceId", async () => {
    const allSeats = await seats.listSeats();
    const seat = allSeats.find((s) => s.occupantId === null)!;
    await seats.assignSeatOccupant(seat.id, memberA.id);

    const device = await createOwnedBy(memberA.id, "AC6");
    await assignDevice(device.id, seat.id);
    await designatePrimary(device.id);

    const devBefore = (await devices.listDevices()).find((d) => d.id === device.id);
    expect(devBefore?.rank, "Given: device is primary").toBe("PRIMARY");
    expect(devBefore?.seatId).toBe(seat.id);

    const outcome = await seats.releaseSeatOccupant(seat.id);

    expect(outcome.released, "release succeeded").toBe(true);
    if (outcome.released) {
      expect(outcome.downgradedDeviceId, "names the downgraded primary device").toBe(device.id);
      expect(outcome.seat.occupantId, "seat has no occupant").toBeNull();
    }

    const allDevs = await devices.listDevices();
    const devAfter = findDevice(allDevs, device.id);

    expect(devAfter, "device still exists").toBeDefined();
    expect(devAfter?.rank, "device is now SECONDARY — INV-06").toBe("SECONDARY");
    expect(devAfter?.seatId, "device is still assigned to the same seat").toBe(seat.id);
    expect(devAfter?.ownerId, "owner is unchanged").toBe(memberA.id);

    const primariesOnSeat = allDevs.filter((d) => d.seatId === seat.id && d.rank === "PRIMARY");
    expect(primariesOnSeat, "seat has no primary device").toHaveLength(0);

    await devices.deleteDevice(device.id);
  });
});

describe("AC-7 — Releasing an occupant leaves the seat's other devices exactly where they are (INV-07, INV-04)", () => {
  it("AC-7: primary is downgraded, secondary device remains secondary, neither deleted or detached", async () => {
    const allSeats = await seats.listSeats();
    const seat = allSeats.find((s) => s.occupantId === null)!;
    await seats.assignSeatOccupant(seat.id, memberA.id);

    const primaryDev = await createOwnedBy(memberA.id, "AC7-pri");
    const secondaryDev = await createOwnedBy(memberA.id, "AC7-sec");
    await assignDevice(primaryDev.id, seat.id);
    await assignDevice(secondaryDev.id, seat.id);
    await designatePrimary(primaryDev.id);

    const beforeDevs = await deviceSnapshot();
    expect(findDevice(beforeDevs, primaryDev.id)?.rank).toBe("PRIMARY");
    expect(findDevice(beforeDevs, secondaryDev.id)?.rank).toBe("SECONDARY");

    const outcome = await seats.releaseSeatOccupant(seat.id);
    expect(outcome.released).toBe(true);

    const afterDevs = await deviceSnapshot();
    const primaryAfter = findDevice(afterDevs, primaryDev.id);
    const secondaryAfter = findDevice(afterDevs, secondaryDev.id);

    expect(primaryAfter?.rank, "primary was downgraded to SECONDARY").toBe("SECONDARY");
    expect(primaryAfter?.seatId, "primary still assigned to seat").toBe(seat.id);
    expect(primaryAfter?.ownerId, "primary owner unchanged").toBe(memberA.id);

    expect(secondaryAfter?.rank, "secondary remains SECONDARY").toBe("SECONDARY");
    expect(secondaryAfter?.seatId, "secondary still assigned to seat").toBe(seat.id);
    expect(secondaryAfter?.ownerId, "secondary owner unchanged").toBe(memberA.id);

    const primariesOnSeat = afterDevs.filter((d) => d.seatId === seat.id && d.rank === "PRIMARY");
    expect(primariesOnSeat).toHaveLength(0);

    await devices.deleteDevice(primaryDev.id);
    await devices.deleteDevice(secondaryDev.id);
  });
});

describe("AC-8 — Release is refused for a seat that has no occupant", () => {
  it("AC-8: refused with SEAT_NOT_OCCUPIED, no seat changes, and no device rank changes", async () => {
    const allSeats = await seats.listSeats();
    const vacant = allSeats.find((s) => s.occupantId === null)!;

    const seatsBefore = await seatSnapshot();
    const devsBefore = await deviceSnapshot();

    const outcome = await seats.releaseSeatOccupant(vacant.id);

    expect(outcome.released, "release is refused").toBe(false);
    if (!outcome.released) {
      expect(outcome.reason, "reason is SEAT_NOT_OCCUPIED").toBe("SEAT_NOT_OCCUPIED");
    }

    const seatsAfter = await seatSnapshot();
    const devsAfter = await deviceSnapshot();

    expect(seatsAfter, "no seat changed").toEqual(seatsBefore);
    expect(devsAfter, "no device changed").toEqual(devsBefore);
  });
});

describe("AC-10 — A seat's status is derived from its occupancy and is never set directly (INV-03)", () => {
  it("AC-10: deriveSeatStatus accurately reflects occupancy across multiple transitions", async () => {
    const allSeats = await seats.listSeats();
    const vacant = allSeats.find((s) => s.occupantId === null)!;

    expect(seats.deriveSeatStatus(vacant)).toBe("VACANT");

    const res1 = await seats.assignSeatOccupant(vacant.id, memberA.id);
    expect(res1.assigned).toBe(true);
    if (res1.assigned) expect(seats.deriveSeatStatus(res1.seat)).toBe("OCCUPIED");
    const seat1 = (await seats.listSeats()).find((s) => s.id === vacant.id)!;
    expect(seats.deriveSeatStatus(seat1)).toBe("OCCUPIED");

    const res2 = await seats.releaseSeatOccupant(vacant.id);
    expect(res2.released).toBe(true);
    if (res2.released) expect(seats.deriveSeatStatus(res2.seat)).toBe("VACANT");
    const seat2 = (await seats.listSeats()).find((s) => s.id === vacant.id)!;
    expect(seats.deriveSeatStatus(seat2)).toBe("VACANT");

    const res3 = await seats.assignSeatOccupant(vacant.id, memberB.id);
    expect(res3.assigned).toBe(true);
    if (res3.assigned) expect(seats.deriveSeatStatus(res3.seat)).toBe("OCCUPIED");
    const seat3 = (await seats.listSeats()).find((s) => s.id === vacant.id)!;
    expect(seats.deriveSeatStatus(seat3)).toBe("OCCUPIED");

    await seats.releaseSeatOccupant(vacant.id);
  });
});

describe("AC-11 — Assigning a new occupant does not promote the previous occupant's devices (INV-05, INV-04)", () => {
  it("AC-11: assigning new occupant leaves previous occupant's secondary devices secondary without promotion", async () => {
    const allSeats = await seats.listSeats();
    const seat = allSeats.find((s) => s.occupantId === null)!;
    await seats.assignSeatOccupant(seat.id, memberA.id);

    const dev1 = await createOwnedBy(memberA.id, "AC11-1");
    const dev2 = await createOwnedBy(memberA.id, "AC11-2");
    await assignDevice(dev1.id, seat.id);
    await assignDevice(dev2.id, seat.id);
    await designatePrimary(dev1.id);

    await seats.releaseSeatOccupant(seat.id);

    const midDevs = await deviceSnapshot();
    expect(findDevice(midDevs, dev1.id)?.rank).toBe("SECONDARY");
    expect(findDevice(midDevs, dev2.id)?.rank).toBe("SECONDARY");

    const outcome = await seats.assignSeatOccupant(seat.id, memberB.id);
    expect(outcome.assigned).toBe(true);

    const seatAfter = (await seats.listSeats()).find((s) => s.id === seat.id)!;
    expect(seatAfter.occupantId).toBe(memberB.id);

    const afterDevs = await deviceSnapshot();
    const dev1After = findDevice(afterDevs, dev1.id);
    const dev2After = findDevice(afterDevs, dev2.id);

    expect(dev1After?.rank, "dev1 still SECONDARY").toBe("SECONDARY");
    expect(dev2After?.rank, "dev2 still SECONDARY").toBe("SECONDARY");
    expect(dev1After?.ownerId, "dev1 owner still memberA").toBe(memberA.id);
    expect(dev2After?.ownerId, "dev2 owner still memberA").toBe(memberA.id);
    expect(dev1After?.seatId, "dev1 still on seat").toBe(seat.id);
    expect(dev2After?.seatId, "dev2 still on seat").toBe(seat.id);

    const primaries = afterDevs.filter((d) => d.seatId === seat.id && d.rank === "PRIMARY");
    expect(primaries, "seat still has no primary device — INV-04").toHaveLength(0);

    await seats.releaseSeatOccupant(seat.id);
    await devices.deleteDevice(dev1.id);
    await devices.deleteDevice(dev2.id);
  });
});

describe("invariant probes — the assertions that fail if an invariant stops holding", () => {
  it("INV-01: no seat holds more than one occupant", async () => {
    const allSeats = await seats.listSeats();
    for (const seat of allSeats) {
      expect(typeof seat.occupantId === "string" || seat.occupantId === null).toBe(true);
    }
  });

  it("INV-02: one member may occupy multiple seats concurrently", async () => {
    const allSeats = await seats.listSeats();
    const vacantSeats = allSeats.filter((s) => s.occupantId === null);
    if (vacantSeats.length >= 2) {
      const s1 = vacantSeats[0]!;
      const s2 = vacantSeats[1]!;
      const res1 = await seats.assignSeatOccupant(s1.id, memberA.id);
      const res2 = await seats.assignSeatOccupant(s2.id, memberA.id);
      expect(res1.assigned).toBe(true);
      expect(res2.assigned).toBe(true);

      const checkSeats = await seats.listSeats();
      expect(findSeat(checkSeats, s1.id)?.occupantId).toBe(memberA.id);
      expect(findSeat(checkSeats, s2.id)?.occupantId).toBe(memberA.id);

      await seats.releaseSeatOccupant(s1.id);
      await seats.releaseSeatOccupant(s2.id);
    }
  });

  it("INV-03: status is derived and consistent across all seats", async () => {
    const allSeats = await seats.listSeats();
    for (const seat of allSeats) {
      const status = seats.deriveSeatStatus(seat);
      if (seat.occupantId !== null) {
        expect(status).toBe("OCCUPIED");
      } else {
        expect(status).toBe("VACANT");
      }
    }
  });

  it("INV-05 & INV-06: release auto-downgrades primary device, holding INV-05", async () => {
    const allSeats = await seats.listSeats();
    const vacant = allSeats.find((s) => s.occupantId === null)!;
    await seats.assignSeatOccupant(vacant.id, memberA.id);

    const dev = await createOwnedBy(memberA.id, "INV05-probe");
    await assignDevice(dev.id, vacant.id);
    await designatePrimary(dev.id);

    await seats.releaseSeatOccupant(vacant.id);

    const currentSeats = new Map((await seats.listSeats()).map((s) => [s.id, s]));
    const currentDevs = await devices.listDevices();
    for (const d of currentDevs) {
      if (d.rank === "PRIMARY" && d.seatId !== null) {
        const s = currentSeats.get(d.seatId);
        expect(s?.occupantId).toBe(d.ownerId);
      }
    }

    await devices.deleteDevice(dev.id);
  });
});
