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
import {
  db,
  FOREIGN_KEY_VIOLATION,
  INV05_VIOLATION,
  isCode,
  UNIQUE_VIOLATION,
  unwrapRpc,
} from "./client";

const COLUMNS = "id, assetTag, model, ownerId, seatId, rank";

export async function listDevices(): Promise<Device[]> {
  const { data, error } = await db().from("Device").select(COLUMNS).order("id");
  if (error !== null) throw error;
  return data;
}

export async function getDevice(id: string): Promise<Device | null> {
  const { data, error } = await db().from("Device").select(COLUMNS).eq("id", id).maybeSingle();
  if (error !== null) throw error;
  return data;
}

/** INV-07: devices may exist unassigned in inventory, so this is a first-class query, not a filter. */
export async function listUnassignedDevices(): Promise<Device[]> {
  const { data, error } = await db()
    .from("Device")
    .select(COLUMNS)
    .is("seatId", null)
    .order("id");
  if (error !== null) throw error;
  return data;
}

/**
 * `Device_assetTag_key` is what refuses a duplicate, so this is the seam agreeing with the schema
 * rather than adding a rule of its own.
 *
 * `seatId` and `rank` are written literally rather than taken from `input`, which is what makes
 * "created into unassigned inventory, not primary" a property of this function rather than of its
 * callers — `NewDevice` has no field for either, so no caller can supply one. It is also why
 * INV-04's partial index and INV-05's trigger cannot fire on this path: neither applies to a row
 * with no seat and no PRIMARY rank.
 */
export async function createDevice(input: NewDevice): Promise<CreateDeviceOutcome> {
  const { data, error } = await db()
    .from("Device")
    .insert({
      id: crypto.randomUUID(),
      assetTag: input.assetTag,
      model: input.model,
      ownerId: input.ownerId,
      seatId: null,
      rank: "SECONDARY",
    })
    .select(COLUMNS)
    .single();
  if (isCode(error, UNIQUE_VIOLATION)) return { created: false, reason: "DUPLICATE_ASSET_TAG" };
  if (error !== null) throw error;
  return { created: true, device: data };
}

/**
 * Three attributes are editable and neither `seatId` nor `rank` is among them — `DevicePatch` has
 * no field for either, so an attribute edit cannot move a device or change its designation whatever
 * the caller sends.
 *
 * INV-05 IS THE DATABASE'S REFUSAL HERE, NOT A READ-THEN-COMPARE. The constraint trigger on
 * `Device` fires on this update and raises SQLSTATE `INV05` when the row is some seat's PRIMARY and
 * the new owner is not that seat's occupant. Doing it as two requests — read the seat, compare,
 * write — would put the check and the write in different transactions, which is the whole failure
 * 02-design.md section 7 alternative A rejects.
 *
 * ONE STATEMENT, so a refusal writes nothing: the row is refused, not a field of it. `unchanged`
 * means unchanged even though the illegal state never existed.
 *
 * Both refusals map from a SQLSTATE and neither reads message text. Where both could apply Postgres
 * raises the unique violation first — the index is checked as the row is written, the constraint
 * trigger AFTER — which is the same precedence `mock/devices.ts` gives them.
 */
export async function updateDevice(id: string, patch: DevicePatch): Promise<UpdateDeviceOutcome> {
  const { data, error } = await db()
    .from("Device")
    .update({ assetTag: patch.assetTag, model: patch.model, ownerId: patch.ownerId })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (isCode(error, UNIQUE_VIOLATION)) return { updated: false, reason: "DUPLICATE_ASSET_TAG" };
  if (isCode(error, INV05_VIOLATION)) {
    return { updated: false, reason: "PRIMARY_OWNER_MUST_BE_OCCUPANT" };
  }
  if (error !== null) throw error;
  if (data === null) return { updated: false, reason: "NOT_FOUND" };
  return { updated: true, device: data };
}

/**
 * Assignment never confers primacy: `rank` is forced to SECONDARY whatever it was before. If it did
 * confer primacy, assigning a second device to a seat would either produce two PRIMARY rows —
 * exactly what `one_primary_device_per_seat` refuses — or silently demote the incumbent, which no
 * invariant asks for and no person would expect from an action named *assign*.
 *
 * It touches no other device row, so the seat's existing primary, if any, is still its primary
 * afterwards.
 *
 * The two refusals are told apart by mechanism rather than by two reads: a device that does not
 * exist matches no row, and a seat that does not exist violates `Device_seatId_fkey`. A device that
 * already has a seat is moved rather than refused, so no reachable input throws.
 */
export async function assignDeviceToSeat(
  deviceId: string,
  seatId: string
): Promise<AssignDeviceOutcome> {
  const { data, error } = await db()
    .from("Device")
    .update({ seatId, rank: "SECONDARY" })
    .eq("id", deviceId)
    .select(COLUMNS)
    .maybeSingle();
  if (isCode(error, FOREIGN_KEY_VIOLATION)) return { assigned: false, reason: "SEAT_NOT_FOUND" };
  if (error !== null) throw error;
  if (data === null) return { assigned: false, reason: "DEVICE_NOT_FOUND" };
  return { assigned: true, device: data };
}

/**
 * The device returns to inventory and is not deleted — that distinction is the whole of INV-07, and
 * it is why *Unassign* and *Delete* are separate controls.
 *
 * The rank write is unconditional, whether or not the device was primary. A device flagged PRIMARY
 * with no seat is a row INV-04 and INV-05 cannot be evaluated against at all: no seat to count
 * primaries on, no occupant to compare an owner against. `ownerId` is untouched — unassigning is
 * not a change of ownership.
 */
export async function unassignDevice(deviceId: string): Promise<UnassignDeviceOutcome> {
  const { data, error } = await db()
    .from("Device")
    .update({ seatId: null, rank: "SECONDARY" })
    .eq("id", deviceId)
    .select(COLUMNS)
    .maybeSingle();
  if (error !== null) throw error;
  if (data === null) return { unassigned: false, reason: "NOT_FOUND" };
  return { unassigned: true, device: data };
}

/**
 * Takes a device id and no seat id: the seat is `device.seatId` and it is the only seat the
 * designation can be about.
 *
 * ONE POSTGRES FUNCTION, ONE TRANSACTION — `designate_primary_device`. The incumbent is demoted
 * before the new device is promoted, and INV-04's partial unique index refuses the intermediate
 * state where both are PRIMARY, so the order is not a preference and the two writes cannot be two
 * requests.
 *
 * The four refusals and their order live in the function, for the reasons the migration records.
 */
export async function designatePrimaryDevice(deviceId: string): Promise<DesignatePrimaryOutcome> {
  const { data, error } = await db().rpc("designate_primary_device", { p_device_id: deviceId });
  return unwrapRpc<DesignatePrimaryOutcome>(data, error, "designatePrimaryDevice");
}

/**
 * Removes exactly one row and touches no seat, no member and no other device. A device is not a
 * seat's dependency: deleting one is not an occupant exit, so INV-06 does not fire and the seat's
 * occupancy is not read, let alone written.
 *
 * `wasPrimaryOfSeatId` comes back from `DELETE ... RETURNING`, which is what keeps this one
 * statement: after the row is gone there is nothing left to read the seat off, and a read before
 * the delete would be a second request for a value the delete already has. A seat with no primary
 * device is legal — INV-04 sets a maximum of one, not a minimum.
 */
export async function deleteDevice(id: string): Promise<DeleteDeviceOutcome> {
  const { data, error } = await db()
    .from("Device")
    .delete()
    .eq("id", id)
    .select("id, seatId, rank")
    .maybeSingle();
  if (error !== null) throw error;
  if (data === null) return { deleted: false, reason: "NOT_FOUND" };
  return {
    deleted: true,
    deviceId: data.id,
    wasPrimaryOfSeatId: data.rank === "PRIMARY" ? data.seatId : null,
  };
}
