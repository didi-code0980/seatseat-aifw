// DTOs for the data seam.
//
// These are the only shapes that cross the seam. No Prisma type ever leaves `src/lib/data/prisma/**`
// (RULE-02): the Prisma-backed implementation maps its rows onto these types before returning, so
// swapping the mock for Prisma cannot change a single component.
//
// Every field here is a placeholder until `prisma/schema.prisma` is approved. A field name invented
// at this layer would propagate into the mock, the Prisma mapping, and the selectors before anyone
// reviewed it (RULE-04), so these mirror the draft schema exactly and change with it.

export type Role = "USER" | "MANAGER" | "ADMIN";

/**
 * INV-03: seat status is derived, never stored. This type exists so components have a name for the
 * derived value; nothing persists it.
 */
export type SeatStatus = "OCCUPIED" | "VACANT";

export type DeviceRank = "PRIMARY" | "SECONDARY";

export type RequestKind = "TARGETED" | "OPEN";

export type RequestState = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface Room {
  id: string;
  name: string;
  code: string;
  /** Layout grid width in cells. Deliberately finer than one cell per seat — see the glossary. */
  gridWidth: number;
  gridHeight: number;
}

/** Input to createRoom. Every field the model requires; the id is minted by the seam. */
export type NewRoom = Omit<Room, "id">;

/** Input to updateRoom. Only the name is editable in this ticket (AC-4). */
export interface RoomPatch {
  name: string;
}

/**
 * INV-11 wording: code uniqueness is a fact about stored data, so the refusal belongs to the seam
 * and not to the action that calls it. A caller has to narrow this before it can claim success.
 */
export type CreateRoomOutcome =
  | { created: true; room: Room }
  | { created: false; reason: "DUPLICATE_CODE" };

/**
 * INV-11: the delete is destructive and cascades. The counts are returned rather than inferred so
 * that AC-6 and AC-14 are assertable at the seam, where the cascade actually happens.
 *
 * seatsDeleted    — seats destroyed with the room, and with them their ports and occupancy rows
 * devicesDetached — devices that sat on those seats, now seatId: null and rank: "SECONDARY"
 */
export type DeleteRoomOutcome =
  | { deleted: true; seatsDeleted: number; devicesDetached: number }
  | { deleted: false; reason: "NOT_FOUND" };

export interface NetworkPort {
  id: string;
  /** A port belongs to a seat, not to a device or a room. */
  seatId: string;
  portCode: string;
}

export interface Seat {
  id: string;
  roomId: string;
  code: string;
  /**
   * Grid coordinate plus rectangular footprint. Freeform pixel placement is out of scope.
   *
   * INV-10: within a room, no two seats may occupy overlapping grid cells. No database index holds
   * this — overlap is a predicate over pairs of rectangles, not an equality over a column — so it is
   * checked in `src/lib/data/` on every placement write. Every LAY ticket carries INV-10 in
   * `invariants_touched` so gate R8 covers it: overlap is the failure dnd-kit produces most easily
   * and the eye catches least reliably.
   */
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  /** A seat has one or two ports; zero is invalid. Not yet an approved invariant. */
  ports: NetworkPort[];
  /** INV-01: at most one occupant. Null means vacant. */
  occupantId: string | null;
}

export interface Member {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  groupId: string | null;
}

export interface Group {
  id: string;
  name: string;
  /** Groups nest: a parent contains children. Membership is independent of seat occupancy. */
  parentId: string | null;
}

export interface Device {
  id: string;
  assetTag: string;
  model: string;
  /** INV-07: a device may exist unassigned in inventory, so both of these may be null. */
  ownerId: string | null;
  seatId: string | null;
  /**
   * INV-04: at most one PRIMARY per seat.
   * INV-05: a PRIMARY device must be owned by that seat's current occupant.
   * INV-06: on occupant exit, PRIMARY auto-downgrades to SECONDARY.
   */
  rank: DeviceRank;
}

export interface SeatRequest {
  id: string;
  requesterId: string;
  kind: RequestKind;
  /** Null for an OPEN request, which names only a room. */
  seatId: string | null;
  roomId: string;
  state: RequestState;
}

export interface Account {
  id: string;
  memberId: string;
  email: string;
  /** INV-08: there is no self-signup. Every account records who created it. */
  createdById: string | null;
}

/** A room's seats with their derived status, which is what the layout designer renders. */
export interface RoomLayout {
  room: Room;
  seats: Seat[];
}
