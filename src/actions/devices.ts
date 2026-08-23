"use server";

// Server actions for devices — DEV-01.
//
// Every write action runs the same five steps in the order `coding-standards.md` fixes: "use
// server", parse with the Zod schema named in design section 1.3, check permission, call the seam,
// return a typed result. Step 3 is absent on this ticket by specification rather than by oversight,
// and each action says so at the line where the check belongs. See 02-design.md section 2.
//
// Each parameter is `unknown` and is narrowed by its schema inside the action. A server action is a
// network boundary; typing the parameter as `CreateDeviceInput` would claim a guarantee the caller
// never had to honour — and on this surface that matters more than on rooms, because four of the six
// actions carry an invariant check the UI deliberately does not gate (02-design.md 1.5, section 7B).

import { revalidatePath } from "next/cache";

import { devices } from "@/lib/data";
import type { Device } from "@/lib/data";
import {
  assignDeviceSchema,
  createDeviceSchema,
  deleteDeviceSchema,
  designatePrimaryDeviceSchema,
  unassignDeviceSchema,
  updateDeviceSchema,
} from "@/lib/validation/device";

export type DeviceFieldName = "assetTag" | "model" | "ownerId" | "seatId";

/**
 * `REFUSED`, and why it is not called `INVARIANT`. `coding-standards.md` is explicit that an
 * invariant which *cannot be satisfied* is not an expected failure — it means state is already
 * wrong, and RULE-07 escalates it rather than handling it. Nothing here is that. AC-8, AC-10 and
 * AC-11 are the system *preventing* a violation on a write a person attempted, which is an ordinary
 * expected failure and returns a typed refusal. Naming this kind `INVARIANT` would put the two on
 * the same word and leave the next reader to decide which one an occurrence is.
 *
 * `field` carries `"ownerId"` for AC-11, whose criterion requires "a validation message shown
 * against the owner". It is `null` for AC-8, AC-9 and AC-10, which require a message and do not
 * place it against a field; those render in the page-level error region (design section 6).
 */
export type DeviceActionError =
  | { kind: "VALIDATION"; fields: Partial<Record<DeviceFieldName, string>> }
  | { kind: "DUPLICATE_ASSET_TAG"; fields: { assetTag: string } }
  | { kind: "REFUSED"; field: DeviceFieldName | null; message: string }
  | { kind: "NOT_FOUND"; message: string };

export type DeviceActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: DeviceActionError };

export type DesignatePrimaryData = { device: Device; demotedDeviceId: string | null };
export type DeleteDeviceData = { id: string; wasPrimaryOfSeatId: string | null };

// The two INV-05 messages are the same sentence on purpose: AC-8 and AC-11 are the same illegal
// state reached from opposite directions, and a person who hits either has the same thing to fix.
// The seam's reason codes stay distinct so a test can tell which path refused (design section 1.1).
const INV_05_MESSAGE = "A seat's primary device must be owned by that seat's occupant.";
const NO_OCCUPANT_MESSAGE = "A seat with no occupant can have no primary device.";
const NOT_ASSIGNED_MESSAGE = "A device that is assigned to no seat cannot be a primary device.";
const DUPLICATE_TAG_MESSAGE = "That asset tag is already in use.";
const DEVICE_GONE_MESSAGE = "That device no longer exists.";
const SEAT_GONE_MESSAGE = "That seat no longer exists.";

const DEVICE_FIELD_NAMES: readonly string[] = ["assetTag", "model", "ownerId", "seatId"];

function isDeviceFieldName(value: PropertyKey | undefined): value is DeviceFieldName {
  return typeof value === "string" && DEVICE_FIELD_NAMES.includes(value);
}

/**
 * `VALIDATION.fields` is a map rather than a single field because AC-3 requires a message against
 * *each* offending field, and a one-field error cannot express three blank inputs.
 *
 * The raw `ZodError` never crosses this boundary (coding-standards.md, "Error handling"): it carries
 * the schema's internal shape, and returning it would make the client's rendering depend on Zod's
 * issue format.
 *
 * Every schema in `device.ts` except `createDeviceSchema` also validates `id`, which is not a
 * `DeviceFieldName` and so maps to no entry here. That is deliberate: `id` is never typed by a user,
 * it comes from a rendered row, and the contract's field map covers the fields a form collects.
 */
function fieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[]
): Partial<Record<DeviceFieldName, string>> {
  const fields: Partial<Record<DeviceFieldName, string>> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    // First message per field wins. A field can raise several issues and the later ones are usually
    // the less specific, so overwriting would degrade the message AC-3 asks for.
    if (isDeviceFieldName(key) && fields[key] === undefined) fields[key] = issue.message;
  }
  return fields;
}

function validationError(
  issues: readonly { path: PropertyKey[]; message: string }[]
): { ok: false; error: DeviceActionError } {
  return { ok: false, error: { kind: "VALIDATION", fields: fieldErrors(issues) } };
}

function notFound(message: string): { ok: false; error: DeviceActionError } {
  return { ok: false, error: { kind: "NOT_FOUND", message } };
}

function refused(
  field: DeviceFieldName | null,
  message: string
): { ok: false; error: DeviceActionError } {
  return { ok: false, error: { kind: "REFUSED", field, message } };
}

// The two Phase B read actions, kept as they were. DEV-01 adds six write actions beside them and
// changes neither: 02-design.md section 1.2 leaves the three existing seam reads untouched, and the
// design's section 5 describes this file as new, which it is not.
export async function getDevices(): Promise<Device[]> {
  return devices.listDevices();
}

/** INV-07: inventory is a real state, so it has a query of its own rather than a caller-side filter. */
export async function getUnassignedDevices(): Promise<Device[]> {
  return devices.listUnassignedDevices();
}

export async function createDevice(input: unknown): Promise<DeviceActionResult<Device>> {
  const parsed = createDeviceSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification. DEV-01 enforces no rank check on
  // any device operation: the `AUT — Authentication & Accounts` table in the registry is empty, so
  // no session exists to read a role from. See 01-story.md out-of-scope item 1, which carries the
  // guard to the AUT group, and 02-design.md section 2 for the gate each operation will take. When
  // it is built it goes on this line as a `can()` comparison against ROLE_RANK, plus the ownership
  // check `rbac-and-security.md:39-41` requires for a USER — not in PermissionGate, which hides a
  // control and does not protect an operation.

  const outcome = await devices.createDevice(parsed.data);
  if (!outcome.created) {
    // F-1. The refusal is the seam's (`Device.assetTag` is `@unique`); this only names the field it
    // belongs against, so the message renders where the user typed the value.
    return {
      ok: false,
      error: { kind: "DUPLICATE_ASSET_TAG", fields: { assetTag: DUPLICATE_TAG_MESSAGE } },
    };
  }

  revalidatePath("/devices");
  return { ok: true, data: outcome.device };
}

/**
 * AC-4 and AC-11. Only the three attributes reach the seam: `seatId` and `rank` are not in
 * `updateDeviceSchema` and not in `DevicePatch`, so an attribute edit cannot move a device or change
 * its designation.
 */
export async function updateDevice(input: unknown): Promise<DeviceActionResult<Device>> {
  const parsed = updateDeviceSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: no rank check, no ownership
  // check, no session. 01-story.md out-of-scope item 1, AUT group. The check belongs on this line.

  const outcome = await devices.updateDevice(parsed.data.id, {
    assetTag: parsed.data.assetTag,
    model: parsed.data.model,
    ownerId: parsed.data.ownerId,
  });

  if (!outcome.updated) {
    if (outcome.reason === "NOT_FOUND") return notFound(DEVICE_GONE_MESSAGE);
    if (outcome.reason === "DUPLICATE_ASSET_TAG") {
      return {
        ok: false,
        error: { kind: "DUPLICATE_ASSET_TAG", fields: { assetTag: DUPLICATE_TAG_MESSAGE } },
      };
    }
    // AC-11, INV-05. The message renders against the owner select, which is where that criterion
    // places it.
    return refused("ownerId", INV_05_MESSAGE);
  }

  revalidatePath("/devices");
  return { ok: true, data: outcome.device };
}

/** AC-5. The seam forces SECONDARY; this action never sends a rank because there is no field for one. */
export async function assignDevice(input: unknown): Promise<DeviceActionResult<Device>> {
  const parsed = assignDeviceSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: no rank check, no ownership
  // check, no session. 01-story.md out-of-scope item 1, AUT group. The check belongs on this line.

  const outcome = await devices.assignDeviceToSeat(parsed.data.id, parsed.data.seatId);
  if (!outcome.assigned) {
    return notFound(outcome.reason === "SEAT_NOT_FOUND" ? SEAT_GONE_MESSAGE : DEVICE_GONE_MESSAGE);
  }

  revalidatePath("/devices");
  return { ok: true, data: outcome.device };
}

/** AC-6, INV-07. The device returns to inventory; nothing here deletes it and nothing changes its owner. */
export async function unassignDevice(input: unknown): Promise<DeviceActionResult<Device>> {
  const parsed = unassignDeviceSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: no rank check, no ownership
  // check, no session. 01-story.md out-of-scope item 1, AUT group. The check belongs on this line.

  const outcome = await devices.unassignDevice(parsed.data.id);
  if (!outcome.unassigned) return notFound(DEVICE_GONE_MESSAGE);

  revalidatePath("/devices");
  return { ok: true, data: outcome.device };
}

/**
 * AC-7 through AC-10. Three of the seam's four refusals become a `REFUSED` with no field, because
 * those criteria require a message and do not place it against a form field — there is no form open
 * when a row control is pressed. `demotedDeviceId` is carried back so AC-7's demotion is assertable
 * by the caller rather than inferred from a re-read.
 */
export async function designatePrimaryDevice(
  input: unknown
): Promise<DeviceActionResult<DesignatePrimaryData>> {
  const parsed = designatePrimaryDeviceSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: no rank check, no ownership
  // check, no session. 01-story.md out-of-scope item 1, AUT group. The check belongs on this line,
  // and on the operation that carries both INV-04 and INV-05 it is the one most worth having.

  const outcome = await devices.designatePrimaryDevice(parsed.data.id);
  if (!outcome.designated) {
    switch (outcome.reason) {
      case "NOT_FOUND":
        return notFound(DEVICE_GONE_MESSAGE);
      case "NOT_ASSIGNED":
        return refused(null, NOT_ASSIGNED_MESSAGE);
      case "SEAT_HAS_NO_OCCUPANT":
        return refused(null, NO_OCCUPANT_MESSAGE);
      case "OWNER_IS_NOT_OCCUPANT":
        return refused(null, INV_05_MESSAGE);
    }
  }

  revalidatePath("/devices");
  return {
    ok: true,
    data: { device: outcome.device, demotedDeviceId: outcome.demotedDeviceId },
  };
}

/**
 * AC-12, AC-13. The delete is the seam's and removes exactly one row. `wasPrimaryOfSeatId` is
 * carried back because after the row is gone there is nothing left to read the seat off, and AC-13
 * asserts that the seat is left with no primary device.
 */
export async function deleteDevice(input: unknown): Promise<DeviceActionResult<DeleteDeviceData>> {
  const parsed = deleteDeviceSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: no rank check, no ownership
  // check, no session. 01-story.md out-of-scope item 1, AUT group. The check belongs on this line,
  // and on a permanently destructive operation it is the one that will matter most.

  const outcome = await devices.deleteDevice(parsed.data.id);
  if (!outcome.deleted) return notFound(DEVICE_GONE_MESSAGE);

  revalidatePath("/devices");
  return {
    ok: true,
    data: { id: outcome.deviceId, wasPrimaryOfSeatId: outcome.wasPrimaryOfSeatId },
  };
}
