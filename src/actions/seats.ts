"use server";

// Server actions for seat occupancy — SEA-01.
//
// Every write action runs the same five steps in the order `coding-standards.md` fixes: "use server",
// parse with the Zod schema named in design section 1.3, check permission, call the seam, return a
// typed result. Step 3 is absent on this ticket by specification rather than by oversight, and each
// action says so at the line where the check belongs. See 02-design.md section 2.
//
// Each parameter is `unknown` and is narrowed by its schema inside the action. A server action is a
// network boundary; typing the parameter as `AssignSeatInput` would claim a guarantee the caller
// never had to honour — and on this surface that matters more than most, because AC-3 and AC-8 are
// both refusals the UI deliberately offers no control for (02-design.md 1.5 rule 2).

import { revalidatePath } from "next/cache";

import { seats } from "@/lib/data";
import type { Seat } from "@/lib/data";
import { assignSeatSchema, releaseSeatSchema } from "@/lib/validation/seat";

export type SeatFieldName = "seatId" | "occupantId";

/**
 * `REFUSED`, and why it is not called `INVARIANT`. `coding-standards.md` reserves that word for an
 * invariant that CANNOT be satisfied — state already wrong, escalated under RULE-07. Nothing here is
 * that. AC-3 and AC-8 are the system preventing a violation on a write a person attempted, which is
 * an ordinary expected failure and returns a typed refusal.
 *
 * `field` carries `"occupantId"` for the refusal that belongs against the occupant select, and null
 * for the row-action refusals, which render in the page-level region (02-design.md section 6).
 */
export type SeatActionError =
  | { kind: "VALIDATION"; fields: Partial<Record<SeatFieldName, string>> }
  | { kind: "REFUSED"; field: SeatFieldName | null; message: string }
  | { kind: "NOT_FOUND"; message: string };

export type SeatActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SeatActionError };

/** AC-6: the downgrade is carried back so the caller knows it happened without re-reading devices. */
export type ReleaseSeatData = { seat: Seat; downgradedDeviceId: string | null };

const SEAT_OCCUPIED_MESSAGE = "That seat already has an occupant.";
const SEAT_NOT_OCCUPIED_MESSAGE = "That seat has no occupant to release.";
const MEMBER_GONE_MESSAGE = "That member no longer exists.";
const SEAT_GONE_MESSAGE = "That seat no longer exists.";

const SEAT_FIELD_NAMES: readonly string[] = ["seatId", "occupantId"];

function isSeatFieldName(value: PropertyKey | undefined): value is SeatFieldName {
  return typeof value === "string" && SEAT_FIELD_NAMES.includes(value);
}

/**
 * `VALIDATION.fields` is a map rather than a single field because a submission can offend on more
 * than one field at once, and a one-field error cannot express that.
 *
 * The raw `ZodError` never crosses this boundary (coding-standards.md, "Error handling"): it carries
 * the schema's internal shape, and returning it would make the client's rendering depend on Zod's
 * issue format.
 */
function fieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[]
): Partial<Record<SeatFieldName, string>> {
  const fields: Partial<Record<SeatFieldName, string>> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    // First message per field wins. A field can raise several issues and the later ones are usually
    // the less specific, so overwriting would degrade the message AC-9 asks for.
    if (isSeatFieldName(key) && fields[key] === undefined) fields[key] = issue.message;
  }
  return fields;
}

function validationError(
  issues: readonly { path: PropertyKey[]; message: string }[]
): { ok: false; error: SeatActionError } {
  return { ok: false, error: { kind: "VALIDATION", fields: fieldErrors(issues) } };
}

function notFound(message: string): { ok: false; error: SeatActionError } {
  return { ok: false, error: { kind: "NOT_FOUND", message } };
}

function refused(
  field: SeatFieldName | null,
  message: string
): { ok: false; error: SeatActionError } {
  return { ok: false, error: { kind: "REFUSED", field, message } };
}

/**
 * AC-2, AC-3, AC-4, AC-9, AC-11. The seam holds INV-01; this action only names where each refusal
 * renders.
 *
 * `SEAT_OCCUPIED` maps to `field: null` and not to `occupantId`, and the difference is not cosmetic:
 * the seat being occupied is not a fact about the member the user chose, and putting the message
 * under the occupant select would tell them to pick somebody else, which is exactly the wrong
 * instruction. `MEMBER_NOT_FOUND` does belong against that field, because that is the value the user
 * supplied.
 */
export async function assignSeat(input: unknown): Promise<SeatActionResult<Seat>> {
  const parsed = assignSeatSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification. SEA-01 enforces no rank check on
  // any occupancy operation: the `AUT — Authentication & Accounts` table in the registry is empty, so
  // no session exists to read a role from. See 01-story.md out-of-scope item 5, which carries the
  // guard to the AUT group, and 02-design.md section 2.1 for the gate each operation will take —
  // `canApproveRequests(role)` here, never in PermissionGate, which hides a control and does not
  // protect an operation.

  // The form field is `occupantId` and the seam parameter is `memberId` (design 1.3). The rename
  // happens here, at the one boundary where a member becomes an occupant.
  const outcome = await seats.assignSeatOccupant(parsed.data.seatId, parsed.data.occupantId);
  if (!outcome.assigned) {
    switch (outcome.reason) {
      case "SEAT_NOT_FOUND":
        return notFound(SEAT_GONE_MESSAGE);
      case "MEMBER_NOT_FOUND":
        return refused("occupantId", MEMBER_GONE_MESSAGE);
      case "SEAT_OCCUPIED":
        return refused(null, SEAT_OCCUPIED_MESSAGE);
    }
  }

  // Both paths revalidate. `/devices` renders each device's seat-occupant cell
  // (`devices-row-<assetTag>-occupant`), which is a fact about a seat this action just changed;
  // revalidating one path and not the other is the defect that looks like a caching quirk and is a
  // contract violation (design 1.4).
  revalidatePath("/seats");
  revalidatePath("/devices");
  return { ok: true, data: outcome.seat };
}

/**
 * AC-5, AC-6, AC-7, AC-8. The INV-06 downgrade is the seam's and happens synchronously with the
 * occupancy clear; `downgradedDeviceId` is carried back so AC-6 is assertable by the caller rather
 * than inferred from a re-read of the device list.
 */
export async function releaseSeat(input: unknown): Promise<SeatActionResult<ReleaseSeatData>> {
  const parsed = releaseSeatSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: no rank check, no ownership check,
  // no session. 01-story.md out-of-scope item 5, AUT group. The check belongs on this line, and it is
  // the operation where it will matter most: design section 2.1's fourth row is self-release, which
  // is a rank check PLUS `seat.occupantId === session.memberId`, and `can()` compares ranks only.
  const outcome = await seats.releaseSeatOccupant(parsed.data.seatId);
  if (!outcome.released) {
    if (outcome.reason === "SEAT_NOT_FOUND") return notFound(SEAT_GONE_MESSAGE);
    // AC-8. A refused row action has no form open, so the message belongs to no field.
    return refused(null, SEAT_NOT_OCCUPIED_MESSAGE);
  }

  // `/devices` must be revalidated here because the INV-06 downgrade changed a device's designation
  // and that surface renders it — a cached devices page would show a rank the store no longer holds,
  // and AC-6's e2e half is verified there (design 6.2).
  revalidatePath("/seats");
  revalidatePath("/devices");
  return {
    ok: true,
    data: { seat: outcome.seat, downgradedDeviceId: outcome.downgradedDeviceId },
  };
}
