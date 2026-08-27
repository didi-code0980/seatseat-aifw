// The single fixture set, shared by the mock seam and by `scripts/seed.ts`.
//
// Both modes render identically because both read from here. If the seed and the mock drifted, a
// bug reproducible in `DATA_SOURCE=mock` would vanish against a seeded database, and the swap the
// seam exists to make safe would stop being safe.
//
// Composition is deliberate, per the bootstrap specification:
//   2 rooms, 12 seats, 3 members across the three roles,
//   5 devices — 2 primary, 2 secondary, 1 unassigned, which exercises INV-07.

import type { Account, Device, Group, Member, NetworkPort, Room, Seat, SeatRequest } from "./types";

export const groups: Group[] = [
  { id: "grp-eng", name: "Engineering", parentId: null },
  { id: "grp-eng-platform", name: "Platform", parentId: "grp-eng" },
];

export const members: Member[] = [
  { id: "mem-admin", fullName: "Ada Admin", email: "ada@example.internal", role: "ADMIN", groupId: "grp-eng" },
  { id: "mem-manager", fullName: "Mo Manager", email: "mo@example.internal", role: "MANAGER", groupId: "grp-eng-platform" },
  { id: "mem-user", fullName: "Uma User", email: "uma@example.internal", role: "USER", groupId: "grp-eng-platform" },
];

export const rooms: Room[] = [
  { id: "room-a", name: "Room A", code: "ROOM-A", gridWidth: 24, gridHeight: 16 },
  { id: "room-b", name: "Room B", code: "ROOM-B", gridWidth: 24, gridHeight: 16 },
];

// Seats occupy a 2x2 block of cells, not a single cell — the grid is finer than one cell per seat so
// placement can approximate the real room. Whether the footprint is fixed at 2x2 or varies per seat
// is an open question in the glossary, so nothing here depends on it being constant.
function seatRow(roomId: string, prefix: string, startIndex: number, y: number, count: number): Seat[] {
  return Array.from({ length: count }, (_, i) => {
    const n = startIndex + i;
    const id = `${prefix}-${String(n).padStart(2, "0")}`;
    return {
      id,
      roomId,
      code: id.toUpperCase(),
      gridX: 2 + i * 3,
      gridY: y,
      gridW: 2,
      gridH: 2,
      ports: [{ id: `${id}-p1`, seatId: id, portCode: `${id.toUpperCase()}-P1` }],
      occupantId: null,
    };
  });
}

const seatsRoomA: Seat[] = [...seatRow("room-a", "seat-a", 1, 2, 3), ...seatRow("room-a", "seat-a", 4, 6, 3)];
const seatsRoomB: Seat[] = [...seatRow("room-b", "seat-b", 1, 2, 3), ...seatRow("room-b", "seat-b", 4, 6, 3)];

export const seats: Seat[] = [...seatsRoomA, ...seatsRoomB];

// Occupancy. INV-02 permits one person to occupy several seats, and mem-admin does, so the
// multi-seat case is exercised by default rather than only in a test that remembers to construct it.
const OCCUPANCY: Record<string, string> = {
  "seat-a-01": "mem-admin",
  "seat-a-02": "mem-manager",
  "seat-a-04": "mem-admin",
  "seat-b-01": "mem-user",
};

for (const seat of seats) {
  const occupant = OCCUPANCY[seat.id];
  seat.occupantId = occupant ?? null;
  // A second port on one seat, so the one-or-two-ports case is present in the data.
  if (seat.id === "seat-a-01") {
    seat.ports.push({ id: "seat-a-01-p2", seatId: "seat-a-01", portCode: "SEAT-A-01-P2" });
  }
}

export const ports: NetworkPort[] = seats.flatMap((s) => s.ports);

// INV-05: a PRIMARY device is owned by that seat's current occupant. Both primaries below satisfy it.
// The unassigned device has no seat and no owner, which is the INV-07 case.
export const devices: Device[] = [
  { id: "dev-01", assetTag: "AST-0001", model: "ThinkPad T14", ownerId: "mem-admin", seatId: "seat-a-01", rank: "PRIMARY" },
  { id: "dev-02", assetTag: "AST-0002", model: "Dell U2724DE", ownerId: "mem-admin", seatId: "seat-a-01", rank: "SECONDARY" },
  { id: "dev-03", assetTag: "AST-0003", model: "MacBook Pro 14", ownerId: "mem-manager", seatId: "seat-a-02", rank: "PRIMARY" },
  { id: "dev-04", assetTag: "AST-0004", model: "Logitech MX Keys", ownerId: "mem-user", seatId: "seat-b-01", rank: "SECONDARY" },
  { id: "dev-05", assetTag: "AST-0005", model: "Dell OptiPlex 7010", ownerId: null, seatId: null, rank: "SECONDARY" },
];

export const requests: SeatRequest[] = [
  { id: "req-01", requesterId: "mem-user", kind: "TARGETED", seatId: "seat-a-03", roomId: "room-a", state: "PENDING" },
  { id: "req-02", requesterId: "mem-user", kind: "OPEN", seatId: null, roomId: "room-b", state: "PENDING" },
];

// INV-08: no self-signup. Every account was created by a Manager or Admin, and the seed records who.
export const accounts: Account[] = [
  { id: "acc-admin", memberId: "mem-admin", email: "ada@example.internal", createdById: null },
  { id: "acc-manager", memberId: "mem-manager", email: "mo@example.internal", createdById: "mem-admin" },
  { id: "acc-user", memberId: "mem-user", email: "uma@example.internal", createdById: "mem-manager" },
];
