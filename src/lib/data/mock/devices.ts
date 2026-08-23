import type {
  AssignDeviceOutcome,
  CreateDeviceOutcome,
  DeleteDeviceOutcome,
  DesignatePrimaryOutcome,
  Device,
  DevicePatch,
  NewDevice,
  UnassignDeviceOutcome,
  UpdateDeviceOutcome,
} from "../types";
// `seats` is imported because INV-04 and INV-05 are facts about a seat and cannot be evaluated
// without one. `store.ts` re-exports the fixture arrays themselves, so this module writes through
// the same objects `mock/seats.ts` reads (02-design.md section 3).
import { devices, seats } from "./store";

export async function listDevices(): Promise<Device[]> {
  return structuredClone(devices);
}

export async function getDevice(id: string): Promise<Device | null> {
  return structuredClone(devices.find((d) => d.id === id) ?? null);
}

/** INV-07: devices may exist unassigned in inventory, so this is a first-class query, not a filter. */
export async function listUnassignedDevices(): Promise<Device[]> {
  return structuredClone(devices.filter((d) => d.seatId === null));
}

/**
 * AC-2, and F-1. `Device.assetTag` is `@unique` (prisma/schema.prisma:185), so refusing a duplicate
 * is the seam agreeing with the model rather than adding a rule of its own — a mock that accepted a
 * second `AST-0001` would accept data the database rejects. It returns a refusal instead of
 * throwing: a tag already in use is an expected failure, not a programmer error
 * (coding-standards.md, "Error handling").
 *
 * `id` is minted here and never read from a caller, for the reason `createRoom` gives. `seatId` and
 * `rank` are written literally rather than taken from `input`, which is what makes "created into
 * unassigned inventory, not primary" a property of the function rather than of its callers —
 * `NewDevice` has no field for either, so no caller can supply one.
 */
export async function createDevice(input: NewDevice): Promise<CreateDeviceOutcome> {
  if (devices.some((d) => d.assetTag === input.assetTag)) {
    return { created: false, reason: "DUPLICATE_ASSET_TAG" };
  }

  const device: Device = {
    id: crypto.randomUUID(),
    assetTag: input.assetTag,
    model: input.model,
    ownerId: input.ownerId,
    seatId: null,
    rank: "SECONDARY",
  };
  devices.push(device);
  return { created: true, device: structuredClone(device) };
}

/**
 * AC-4 and AC-11. Three attributes are editable and neither `seatId` nor `rank` is among them —
 * `DevicePatch` has no field for either, so an attribute edit cannot move a device or change its
 * designation whatever the caller sends.
 *
 * Every check runs before the first write. AC-11 asserts the device is unchanged, not that only the
 * owner is unchanged, so a partially applied patch — a new model saved alongside a refused owner —
 * would fail the criterion even though the illegal state never existed.
 *
 * INV-05, guarded here in the direction where the owner moves and the designation stays still: a
 * device that is currently some seat's PRIMARY may only be given an owner who occupies that seat.
 * The `seat === undefined` arm refuses rather than permits, so a device pointing at a seat that no
 * longer exists cannot have its owner rewritten on the strength of a comparison nothing was read
 * for. No path reaches that state today — `deleteRoom` detaches devices before it removes seats —
 * and the refusal is what keeps it unreachable if one ever does.
 */
export async function updateDevice(id: string, patch: DevicePatch): Promise<UpdateDeviceOutcome> {
  const device = devices.find((d) => d.id === id);
  if (device === undefined) return { updated: false, reason: "NOT_FOUND" };

  // A device keeping its own tag is not a duplicate of itself, which is why this excludes `id`
  // rather than reusing `createDevice`'s test.
  if (devices.some((d) => d.id !== id && d.assetTag === patch.assetTag)) {
    return { updated: false, reason: "DUPLICATE_ASSET_TAG" };
  }

  if (device.rank === "PRIMARY" && device.seatId !== null) {
    const seat = seats.find((s) => s.id === device.seatId);
    if (seat === undefined || seat.occupantId !== patch.ownerId) {
      return { updated: false, reason: "PRIMARY_OWNER_MUST_BE_OCCUPANT" };
    }
  }

  device.assetTag = patch.assetTag;
  device.model = patch.model;
  device.ownerId = patch.ownerId;
  return { updated: true, device: structuredClone(device) };
}

/**
 * AC-5. Assignment never confers primacy: `rank` is forced to SECONDARY whatever it was before. If
 * it did confer primacy, assigning a second device to a seat would either produce two PRIMARY rows
 * — the INV-04 violation the partial unique index is drafted to refuse — or silently demote the
 * incumbent, which no invariant asks for and no person would expect from an action named *assign*.
 *
 * It touches no other device row, which is AC-5's last clause: the seat's existing primary, if any,
 * is still its primary afterwards.
 *
 * A device that already has a seat is moved rather than refused, so no reachable input throws. The
 * UI does not offer that path — *Assign* is hidden on an assigned device (02-design.md 1.5) — but
 * the action is a network boundary and the seam does not rely on the affordance.
 */
export async function assignDeviceToSeat(
  deviceId: string,
  seatId: string
): Promise<AssignDeviceOutcome> {
  const device = devices.find((d) => d.id === deviceId);
  if (device === undefined) return { assigned: false, reason: "DEVICE_NOT_FOUND" };
  if (!seats.some((s) => s.id === seatId)) return { assigned: false, reason: "SEAT_NOT_FOUND" };

  device.seatId = seatId;
  device.rank = "SECONDARY";
  return { assigned: true, device: structuredClone(device) };
}

/**
 * AC-6, INV-07, INV-04. The device returns to inventory and is not deleted — that distinction is
 * the whole of INV-07, and it is why *Unassign* and *Delete* are separate controls.
 *
 * The rank write is unconditional, whether or not the device was primary. A device flagged PRIMARY
 * with no seat is a row INV-04 and INV-05 cannot be evaluated against at all: there is no seat to
 * count primaries on and no occupant to compare an owner against. Clearing both together is also
 * INV-06's negative obligation on this ticket — a designation is never orphaned from the seat an
 * occupant-exit path would look for it under.
 *
 * `ownerId` is untouched. Unassigning is not a change of ownership.
 */
export async function unassignDevice(deviceId: string): Promise<UnassignDeviceOutcome> {
  const device = devices.find((d) => d.id === deviceId);
  if (device === undefined) return { unassigned: false, reason: "NOT_FOUND" };

  device.seatId = null;
  device.rank = "SECONDARY";
  return { unassigned: true, device: structuredClone(device) };
}

/**
 * AC-7 through AC-10. Takes a device id and no seat id: the seat is `device.seatId` and it is the
 * only seat the designation can be about. A `(deviceId, seatId)` signature would let a caller name a
 * seat the device does not sit on, and this function would then have to decide whether that is a
 * move, an error, or a no-op — three behaviours with no criterion for any of them, on the operation
 * that carries both INV-04 and INV-05.
 *
 * **The order of the four checks is load-bearing.** NOT_ASSIGNED must precede SEAT_HAS_NO_OCCUPANT
 * because an unassigned device has no seat to read an occupant from; SEAT_HAS_NO_OCCUPANT must
 * precede OWNER_IS_NOT_OCCUPANT because a null occupant compared with `!==` looks like an owner
 * mismatch and would be refused for the right reason by accident, collapsing AC-8 and AC-10 into one
 * message and hiding the defect AC-10 exists to catch.
 *
 * **It demotes before it promotes, with no await between them.** Two PRIMARY devices on one seat is
 * a state INV-04 forbids, and under the mock there is no index to refuse it — this function is the
 * only mechanism, so the illegal state must not exist even momentarily where another read could
 * observe it.
 *
 * Designating a device that is already its seat's primary succeeds and demotes nothing: the
 * incumbent search excludes the target, so there is no self-demotion to undo.
 */
export async function designatePrimaryDevice(deviceId: string): Promise<DesignatePrimaryOutcome> {
  const device = devices.find((d) => d.id === deviceId);
  if (device === undefined) return { designated: false, reason: "NOT_FOUND" };

  const seatId = device.seatId;
  // AC-9. A primary device is *the one device designated primary for a seat*; there is no such
  // thing as one without a seat, and INV-05 has nothing to evaluate for it.
  if (seatId === null) return { designated: false, reason: "NOT_ASSIGNED" };

  const seat = seats.find((s) => s.id === seatId);
  // AC-10. A seat that is gone has no occupant either, so it refuses through the same arm rather
  // than through a fourth reason code no criterion names.
  if (seat === undefined || seat.occupantId === null) {
    return { designated: false, reason: "SEAT_HAS_NO_OCCUPANT" };
  }
  // AC-8, INV-05, in the direction where the designation moves and the owner stays still.
  if (device.ownerId !== seat.occupantId) {
    return { designated: false, reason: "OWNER_IS_NOT_OCCUPANT" };
  }

  const incumbent = devices.find(
    (d) => d.seatId === seatId && d.rank === "PRIMARY" && d.id !== device.id
  );
  let demotedDeviceId: string | null = null;
  if (incumbent !== undefined) {
    incumbent.rank = "SECONDARY";
    demotedDeviceId = incumbent.id;
  }
  device.rank = "PRIMARY";

  return { designated: true, device: structuredClone(device), demotedDeviceId };
}

/**
 * AC-12, AC-13. Removes exactly one row and touches no seat, no member and no other device. A
 * device is not a seat's dependency: deleting one is not an occupant exit, so INV-06 does not fire
 * and the seat's occupancy is not read, let alone written.
 *
 * `wasPrimaryOfSeatId` is read before the row goes, because after it there is nothing left to read
 * the seat off. It is what makes AC-13's "that seat has no primary device" assertable, and a seat
 * with none is legal — INV-04 sets a maximum of one, not a minimum.
 *
 * Spliced in place rather than reassigned: `store.ts` exports the array binding and every other mock
 * module holds that same object.
 */
export async function deleteDevice(id: string): Promise<DeleteDeviceOutcome> {
  const device = devices.find((d) => d.id === id);
  if (device === undefined) return { deleted: false, reason: "NOT_FOUND" };

  const wasPrimaryOfSeatId = device.rank === "PRIMARY" ? device.seatId : null;
  devices.splice(devices.indexOf(device), 1);

  return { deleted: true, deviceId: id, wasPrimaryOfSeatId };
}
