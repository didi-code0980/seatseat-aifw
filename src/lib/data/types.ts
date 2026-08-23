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

/**
 * Input to createDevice. The three fields a person supplies; the rest of a Device is the seam's.
 * `id` is minted, `seatId` starts null and `rank` starts SECONDARY — AC-2 requires all three and
 * none of them is a form field (02-design.md section 1.2, rule 1).
 *
 * `ownerId` is non-nullable here although `Device.ownerId` is nullable. That is deliberate and it is
 * finding F-3: AC-2 and AC-3 make an owner mandatory at creation, so no path in this ticket writes a
 * null owner, even though the model and the seed both permit one to exist.
 */
export interface NewDevice {
  assetTag: string;
  model: string;
  ownerId: string;
}

/**
 * Input to updateDevice — the three editable attributes (AC-4, AC-11).
 *
 * Structurally identical to NewDevice today and kept separate anyway: they answer different
 * questions, and the first field to make them diverge is `assetTag`, which a later ticket may well
 * freeze after creation. A type alias would have to be un-aliased at that point, in a diff that
 * looks like a rename and is not.
 *
 * `seatId` and `rank` are absent by design. An attribute edit may not move a device or change its
 * designation (AC-4); those are assignDeviceToSeat, unassignDevice and designatePrimaryDevice, and
 * keeping them out of the patch is what puts each invariant check on exactly one operation.
 */
export interface DevicePatch {
  assetTag: string;
  model: string;
  ownerId: string;
}

/** F-1: `Device.assetTag` is `@unique`, so the seam refuses a duplicate rather than throwing. */
export type CreateDeviceOutcome =
  | { created: true; device: Device }
  | { created: false; reason: "DUPLICATE_ASSET_TAG" };

/**
 * AC-11 / INV-05: changing the owner of a device that is currently a seat's PRIMARY is refused
 * unless the new owner is that seat's occupant. The refusal is the seam's, because the fact it turns
 * on — who occupies the seat — is stored data and not something the caller supplied.
 */
export type UpdateDeviceOutcome =
  | { updated: true; device: Device }
  | {
      updated: false;
      reason: "NOT_FOUND" | "DUPLICATE_ASSET_TAG" | "PRIMARY_OWNER_MUST_BE_OCCUPANT";
    };

/** AC-5. The device lands SECONDARY whatever it was before (INV-04). */
export type AssignDeviceOutcome =
  | { assigned: true; device: Device }
  | { assigned: false; reason: "DEVICE_NOT_FOUND" | "SEAT_NOT_FOUND" };

/** AC-6 / INV-07: the device returns to inventory. It is not deleted and its owner is untouched. */
export type UnassignDeviceOutcome =
  | { unassigned: true; device: Device }
  | { unassigned: false; reason: "NOT_FOUND" };

/**
 * AC-7 to AC-11. Three distinct refusals, and they are separate members rather than one
 * "ILLEGAL" because `01-story.md` AC-10 says in terms that folding NOT_ASSIGNED and
 * SEAT_HAS_NO_OCCUPANT into OWNER_IS_NOT_OCCUPANT is where the defect lives: an absent occupant
 * compared with `!==` looks like a mismatch and is refused for the right reason by accident;
 * compared with `==` or skipped, it is permitted. A shared reason code makes the two
 * indistinguishable in a test, which is how the bug survives.
 *
 * `demotedDeviceId` is the incumbent primary that AC-7 requires to be demoted, or null when the seat
 * had none. It is returned rather than inferred so the demotion is assertable at the seam, the same
 * reason `DeleteRoomOutcome` returns its counts.
 */
export type DesignatePrimaryOutcome =
  | { designated: true; device: Device; demotedDeviceId: string | null }
  | {
      designated: false;
      reason: "NOT_FOUND" | "NOT_ASSIGNED" | "SEAT_HAS_NO_OCCUPANT" | "OWNER_IS_NOT_OCCUPANT";
    };

/**
 * AC-12, AC-13. `wasPrimaryOfSeatId` names the seat left with no primary device, or null. AC-13
 * asserts that state and it is not otherwise observable from the delete: after the row is gone there
 * is nothing left to read the seat off.
 *
 * A seat with no primary device is legal — INV-04 sets a maximum of one, not a minimum.
 */
export type DeleteDeviceOutcome =
  | { deleted: true; deviceId: string; wasPrimaryOfSeatId: string | null }
  | { deleted: false; reason: "NOT_FOUND" };


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
