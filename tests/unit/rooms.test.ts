// ROO-01 — the two halves of the INV-11 cascade that no surface renders.
//
// Written from `01-story.md` and `02-design.md` section 6 only; `src/**` was not read (RULE-05). The
// three calls below are the whole seam surface section 6.1 permits QA to touch, and the four values
// this file quotes — `ROOM-A`, six seats, `dev-01`, `dev-04` — are setup data AC-6 and AC-14 name,
// not values discovered from the implementation.
//
// ONE destructive act, shared by every test here. Section 6.1: mock state is process-global and has
// no reset hook, so a second `deleteRoom` would run against a room that is already gone. Vitest
// isolates per file, so this cannot reach `seam-parity.test.ts` or `permissions.test.ts`.

import { beforeAll, describe, expect, it } from "vitest";

import { devices, rooms } from "@/lib/data";

type Device = Awaited<ReturnType<typeof devices.listDevices>>[number];
type DeleteOutcome = Awaited<ReturnType<typeof rooms.deleteRoom>>;

/** AC-6: "the seeded room whose code is `ROOM-A` … with six seats". */
const SEEDED_ROOM_WITH_SEATS = "ROOM-A";
const SEEDED_ROOM_SEAT_COUNT = 6;
/** AC-14: `dev-01` is primary on a seat in that room; `dev-04` is the control, seated in a different room. */
const DETACHED_DEVICE = "dev-01";
const CONTROL_DEVICE = "dev-04";

let codesBefore: string[];
let codesAfter: string[];
let devicesBefore: Device[];
let devicesAfter: Device[];
let outcome: DeleteOutcome;

beforeAll(async () => {
  const roomsBefore = await rooms.listRooms();
  codesBefore = roomsBefore.map((r) => r.code);

  // The story names rooms by `code` and `deleteRoom` takes an id — section 6.1, "listRooms() is the
  // bridge". Ids are minted with crypto.randomUUID() and are not stable across a run.
  const target = roomsBefore.find((r) => r.code === SEEDED_ROOM_WITH_SEATS);
  if (!target) throw new Error(`${SEEDED_ROOM_WITH_SEATS} is not seeded; AC-6 and AC-14 both name it`);

  // Cloned, not referenced. The seam hands back the live fixture objects, so a shallow snapshot would
  // be mutated by the delete and every before/after comparison below would compare a value with
  // itself.
  devicesBefore = structuredClone(await devices.listDevices());

  outcome = await rooms.deleteRoom(target.id);

  devicesAfter = structuredClone(await devices.listDevices());
  codesAfter = (await rooms.listRooms()).map((r) => r.code);
});

/**
 * `DeleteRoomOutcome` is a union discriminated on `deleted`, so `seatsDeleted` and `devicesDetached`
 * are only reachable once the refusal arm is excluded — section 6.1, "`deleted`, and when `true`,
 * `seatsDeleted` and `devicesDetached`". Narrowing here rather than at each call site keeps the
 * refusal from being read as a zero count.
 */
function succeeded(o: DeleteOutcome): Extract<DeleteOutcome, { deleted: true }> {
  if (!o.deleted) throw new Error(`deleteRoom refused: ${JSON.stringify(o)}`);
  return o;
}

function deviceBefore(id: string): Device {
  const d = devicesBefore.find((x) => x.id === id);
  if (!d) throw new Error(`${id} is not seeded; AC-14 names it`);
  return d;
}

function deviceAfter(id: string): Device | undefined {
  return devicesAfter.find((x) => x.id === id);
}

describe("AC-6 — deleting a room deletes its seats, and the number named is the number destroyed (INV-11)", () => {
  it("AC-6: confirming the delete destroys the room and all N of its seats", () => {
    expect(outcome.deleted, `${SEEDED_ROOM_WITH_SEATS} was deleted`).toBe(true);
    // AC-6: "the room and all N of its seats are permanently deleted". N is six for ROOM-A, and the
    // e2e half of this criterion asserts the confirmation dialog names that same six — so the number
    // shown and the number destroyed are checked against one story datum from both sides.
    expect(succeeded(outcome).seatsDeleted, "N seats destroyed").toBe(SEEDED_ROOM_SEAT_COUNT);
  });

  it("AC-6: the deleted room no longer appears, and no other room is affected", () => {
    expect(codesAfter).not.toContain(SEEDED_ROOM_WITH_SEATS);
    expect(codesAfter).toEqual(codesBefore.filter((c) => c !== SEEDED_ROOM_WITH_SEATS));
  });

  it("AC-6: the deletion cannot be undone from this surface", () => {
    // The seam section 6.1 exposes has no restore, no undo and no soft-delete flag — a deleted room
    // cannot be brought back through any call QA is permitted to make. This is the assertion that
    // fails the day soft delete arrives without an invariant change (out-of-scope item 6).
    expect(Object.keys(rooms)).not.toEqual(
      expect.arrayContaining(["restoreRoom", "undeleteRoom", "undoDeleteRoom"])
    );
  });
});

describe("AC-14 — deleting a room does not delete devices (INV-07, INV-06)", () => {
  it("AC-14: a primary device on a destroyed seat survives, unassigned and not primary", () => {
    const before = deviceBefore(DETACHED_DEVICE);
    // The Given, asserted rather than assumed: a test that silently ran against an already-unassigned
    // device would pass while checking nothing.
    expect(before.seatId, `${DETACHED_DEVICE} was assigned to a seat`).not.toBeNull();
    expect(before.rank, `${DETACHED_DEVICE} was primary`).toBe("PRIMARY");

    const after = deviceAfter(DETACHED_DEVICE);
    expect(after, `${DETACHED_DEVICE} still exists`).toBeDefined();
    expect(after?.seatId, "assigned to no seat — INV-07 permits exactly this state").toBeNull();
    expect(after?.rank, "no longer primary — INV-06").toBe("SECONDARY");
  });

  it("AC-14: a device assigned to a seat in a different room is untouched", () => {
    const before = deviceBefore(CONTROL_DEVICE);
    // The Given, asserted rather than assumed. A control that was already unassigned would come back
    // unchanged while distinguishing nothing — which is the whole reason AC-14 carries a control.
    expect(before.seatId, `${CONTROL_DEVICE} was assigned to a seat`).not.toBeNull();

    // AC-14: "`dev-04` is unchanged in every respect — still assigned to the same seat, with no field
    // of it altered". Compared against the whole pre-delete snapshot rather than field by field: the
    // criterion names no field on purpose, and deep equality is the stronger assertion — it fails if
    // any field moves, including one the story never thought to name.
    expect(deviceAfter(CONTROL_DEVICE), `${CONTROL_DEVICE} still exists`).toBeDefined();
    expect(deviceAfter(CONTROL_DEVICE)).toEqual(before);
    expect(
      deviceAfter(CONTROL_DEVICE)?.seatId,
      `${CONTROL_DEVICE} is still assigned to the same seat`
    ).toBe(before.seatId);
  });

  it("AC-14: the cascade detaches devices and destroys none — INV-07", () => {
    // Without this, a cascade that deleted every device outright would still satisfy "assigned to no
    // seat" for dev-01, because there would be no dev-01 left to disagree.
    expect(devicesAfter.map((d) => d.id).sort()).toEqual(devicesBefore.map((d) => d.id).sort());
  });

  it("AC-14: every device the cascade detached was on a seat in the deleted room", () => {
    const detached = devicesBefore.filter((b) => {
      const a = deviceAfter(b.id);
      return b.seatId !== null && a?.seatId === null;
    });
    expect(detached.map((d) => d.id)).toContain(DETACHED_DEVICE);
    expect(detached.map((d) => d.id)).not.toContain(CONTROL_DEVICE);
    expect(succeeded(outcome).devicesDetached, "the outcome reports what it detached").toBe(
      detached.length
    );
  });

  it("AC-14: no surviving device points at a seat that no longer exists — INV-04, INV-05", () => {
    // A device left pointing at a destroyed seat and still flagged primary is the outcome the story
    // calls out as violating INV-04 and INV-05 against a row that cannot be repaired. Every device
    // that lost its seat must have lost its primary rank with it.
    const stillPrimary = devicesAfter.filter((d) => d.rank === "PRIMARY" && d.seatId === null);
    expect(stillPrimary.map((d) => d.id), "no unassigned device is still primary").toEqual([]);
  });
});
