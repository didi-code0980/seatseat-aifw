---
ticket: DEV-01
stage: DESIGN
agent: tech-lead-design
produced_at: 2026-08-23T07:19:53Z
inputs_read: [ .ai/board/tickets/DEV-01/ticket.yaml, .ai/board/tickets/DEV-01/01-story.md, .ai/board/tickets/ROO-01/02-design.md, .ai/registry/rules.md, .ai/registry/invariants.md, .ai/registry/features.md, .ai/registry/glossary.md, .ai/standards/architecture.md, .ai/standards/coding-standards.md, .ai/standards/data-model.md, .ai/standards/rbac-and-security.md, .ai/standards/testing-standards.md, .ai/standards/git-conventions.md, .ai/01-operating-model.md, .ai/board/backlog.md, .ai/board/model-debt.md, .ai/board/model-defects.md, .ai/templates/tech-design.md, prisma/schema.prisma, src/lib/data/types.ts, src/lib/data/index.ts, src/lib/data/fixtures.ts, src/lib/data/derive.ts, src/lib/data/mock/store.ts, src/lib/data/mock/devices.ts, src/lib/data/mock/seats.ts, src/lib/data/mock/members.ts, src/lib/data/mock/rooms.ts, src/lib/data/prisma/devices.ts, src/lib/data/prisma/members.ts, src/lib/data/prisma/seats.ts, src/actions/rooms.ts, src/lib/validation/room.ts, src/app/(app)/layout.tsx, src/app/(app)/devices/page.tsx, src/app/(app)/rooms/page.tsx, src/app/(app)/rooms/rooms-manager.tsx, src/components/shared/DataTable.tsx, src/components/shared/EntityFormDialog.tsx, src/components/ui/Dialog.tsx, src/components/ui/Input.tsx, src/components/ui/Select.tsx, src/components/ui/Badge.tsx, tests/unit/seam-parity.test.ts, tests/unit/rooms.test.ts, tests/e2e/smoke.spec.ts, tests/e2e/rooms.spec.ts, vitest.config.mts, playwright.config.ts, .claude/hooks/guard-allowed-paths.mjs ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: IN_PROGRESS
---

# DEV-01 — Device CRUD UI — technical design

First version. Seven sections complete, `allowed_paths` enumerated and written back to `ticket.yaml`,
`size` set to `M`.

Five findings are raised against `01-story.md` and none of them blocks this gate. Section 0 states
each in full — this document has to stand alone (RULE-16) — and `99-questions.md` carries the same
five as questions routed to `ba`.

**The registry is not amended by this document and nothing here asks for it to be.** `schema_delta`
is `none` and `requires_adr` stays `false`.

## 0. Findings against the story, and what they do to this stage

`01-story.md` names two of these in advance and asks DESIGN to answer them. It was right to: both
turned out to be real, and one of them is the same defect `ROO-01` shipped its first design with.

### F-1 — `Device.assetTag` is `@unique`, so A-3 is false and AC-3 is incomplete

`01-story.md` A-3 assumes no field of a device carries a uniqueness constraint, and says
"**DESIGN is expected to check this and raise it**". Checked. `prisma/schema.prisma:185` reads:

```prisma
assetTag String @unique
```

So a duplicate asset tag must be refused, and the refusal has no acceptance criterion. This is
`ROO-01`'s B3 repeating exactly — there it was `Room.code`, the story's A-1 made the same assumption,
and it closed as that ticket's AC-12.

**This design specifies the refusal anyway, and that is not an invention.** The seam is not adding a
rule; it is agreeing with the model. A mock that accepts a second `AST-0001` accepts data the
database will reject, which is precisely the mock-to-Prisma divergence the seam exists to prevent
(`architecture.md`, "What crosses the seam"). Section 1.2 rule 1 states it, section 1.4 gives it an
error kind, and section 6 gives it a `data-testid` marked `AC-3 (pending F-1)`.

What is missing is the criterion, and a missing criterion costs a test rather than a line of code.
Routed to `ba` as a RULE-14 amendment, in the shape AC-12 of `ROO-01` took.

### F-2 — Q-1 answered: the device's field set, transcribed not invented

`01-story.md` Q-1 asks what a device's required fields are and records that no registry document
names one. `src/lib/data/types.ts` and `prisma/schema.prisma:183-201` do. Transcribed:

| Field | Type | Required at create? | Notes |
|---|---|---|---|
| `id` | `string` | no | Minted by the seam. `@default(cuid())` in Prisma; `crypto.randomUUID()` in the mock. Never read from a form. |
| `assetTag` | `string` | **yes** | `@unique` — F-1. |
| `model` | `string` | **yes** | Free text. |
| `ownerId` | `string \| null` | **yes** — see F-3 | Nullable in the model. |
| `seatId` | `string \| null` | no | Always `null` at create (AC-2). Changed only by assign/unassign. |
| `rank` | `"PRIMARY" \| "SECONDARY"` | no | Always `SECONDARY` at create (AC-2). Changed only by designate/unassign. |

Three fields the form collects, three it does not. AC-2, AC-3 and AC-4 read "every required field"
and become specific rather than different when this list is amended in, which is what the story
predicted.

`data-model.md`'s raw-SQL sketch names `"Device"."isPrimary"` under its own `TODO(verify):`. The
approved draft uses `rank DeviceRank`, and `rank` is what this design uses. The sketch's own note
says the names "come from the bootstrap specification, not from an approved schema" — this is the
reconciliation it asks for, recorded here and **not** written back into `data-model.md`, which is
human-owned.

### F-3 — `ownerId` is nullable, one seeded device has no owner, and no DEV-01 path can produce another

`prisma/schema.prisma:189` makes `ownerId` nullable and `fixtures.ts:78` seeds `dev-05` with
`ownerId: null`. AC-2 and AC-3 require an owner to be chosen at creation, so the two are not in
conflict at create — a nullable column does not oblige the create path to accept null.

They meet at three places the story does not cover, and this design decides all three:

1. **AC-1 must display an ownerless device.** The owner cell renders the literal `unowned`
   (section 6).
2. **The edit form requires an owner too.** One schema for the field on both paths, for the reason
   `ROO-01` extracted `roomNameSchema`: a value acceptable at creation and rejected at edit is a rule
   that exists in two places and agrees in neither.
3. **Consequently no path in DEV-01 clears an owner**, and `dev-05` can be edited only by giving it
   one. That is a real capability this surface does not have. It is stated rather than hidden, and
   the alternative — an *Unowned* option in the picker — is section 7's rejected alternative D.

Routed to `ba` for a line in AC-4 or in out-of-scope. It changes no signature here.

### F-4 — Q-2 answered: the seat picker is flat, and carries the occupant

`01-story.md` Q-2 asks whether the assign control is scoped by room and states the story's position
that it must not be. Confirmed, and the reason is stronger than list ergonomics: **the option label
carries the seat's occupant**, which is what makes AC-8 and AC-10 drivable by a person and
discoverable by QA under RULE-05. Twelve seats in one flat select is not a list that needs scoping.
Exact label format in section 6, where it is part of the contract rather than presentation.

### F-5 — A-5 verified, and one Given the seed does *not* contain

`01-story.md` A-5 infers from counts that the seed holds an unoccupied seat and a seat whose occupant
owns a device on it, and says it is "an inference from counts and not a fact this story has read".
Read, in `src/lib/data/fixtures.ts`:

| Given required by | Satisfied by |
|---|---|
| AC-7 — occupant owns the device | `seat-a-01` occupied by `mem-admin`, who owns `dev-01` (PRIMARY) and `dev-02` (SECONDARY) |
| AC-10 — a seat with no occupant | `seat-a-03`, `seat-a-05`, `seat-a-06`, and all five of `seat-b-02`..`seat-b-06` |
| AC-13 — a primary plus another device on the same seat | `seat-a-01` holds `dev-01` PRIMARY and `dev-02` SECONDARY |

A-5 holds. **What the seed does not contain is AC-8's Given**: every seeded device that sits on a
seat is owned by that seat's occupant, because INV-05 makes it so. A device whose owner is not the
occupant has to be *constructed*, and it is constructible entirely through this surface — create,
then assign, then attempt to designate. Section 6.2 hands QA the route without naming a fixture.

Not a defect in the story; the story anticipated it and answered it by requiring the occupant to be
displayed. Recorded because a QA agent that assumes AC-8's Given is seeded will write a test with no
setup and report the wrong thing when it fails.

### What the findings do to the gate

**Nothing.** All five are answers to questions the story asked, or facts that make its criteria more
specific. None changes what the Developer builds: the contract in section 1 is complete and
unconditional, every AC has a mechanism, and no signature is waiting on a reply.

F-1 is the only one that leaves a hole, and the hole is a test rather than a behaviour. Following
`ROO-01`'s handling of its own Q6 and Q7, these are **safe to carry into IN_PROGRESS and unsafe to
carry into QA**: the duplicate-tag refusal will exist in the code and in section 6 with no criterion
naming it, and QA cannot invent one. One RULE-14 pass over `01-story.md` closes all five before `/qa`.

### A note on the branch, because this stage created one

`ticket.yaml` carried `branch: ""` and the session was on `main`. `git-conventions.md` requires one
branch per ticket named `feat/<TICKET-ID>`, and the name is not decoration:
`.claude/hooks/guard-allowed-paths.mjs:164` resolves the active ticket from it and disables itself on
any non-`feat/` branch, and `scripts/check-allowed-paths.mjs` does the same in CI (MD-09).
`feat/DEV-01` was created from `main` at `0d651f7`, nothing was committed, and `branch` is now
written into `ticket.yaml`. Had this stage written `02-design.md` from `main`, RULE-03 would have
been unenforced for the whole of IN_PROGRESS.

---

## 1. Contract

Copy-pasteable and complete. Nothing here is contingent on an answer to section 0.

### 1.1 Seam DTOs — `src/lib/data/types.ts` (additive only)

`Device`, `Seat`, `Member` and `Room` are unchanged. Eight types are added. No existing type is
modified, which is what keeps this ticket out of the XL row (section 5).

```ts
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
```

### 1.2 Seam functions — identical names and arity in both implementations

```ts
// unchanged — no existing signature moves
export async function listDevices(): Promise<Device[]>;
export async function getDevice(id: string): Promise<Device | null>;
export async function listUnassignedDevices(): Promise<Device[]>;

// new
export async function createDevice(input: NewDevice): Promise<CreateDeviceOutcome>;
export async function updateDevice(id: string, patch: DevicePatch): Promise<UpdateDeviceOutcome>;
export async function assignDeviceToSeat(
  deviceId: string,
  seatId: string
): Promise<AssignDeviceOutcome>;
export async function unassignDevice(deviceId: string): Promise<UnassignDeviceOutcome>;
export async function designatePrimaryDevice(deviceId: string): Promise<DesignatePrimaryOutcome>;
export async function deleteDevice(id: string): Promise<DeleteDeviceOutcome>;
```

`tests/unit/seam-parity.test.ts` asserts identical exported key sets and equal arity, so all six
appear in `src/lib/data/prisma/devices.ts` too, each returning `notWired("...")` exactly as
`listDevices` does today. No database is wired and none is needed: `DATA_SOURCE` defaults to `mock`.

**`designatePrimaryDevice` takes a device id and no seat id.** The seat is `device.seatId` and it is
the only seat the designation can be about. A `(deviceId, seatId)` signature would let a caller name
a seat the device does not sit on, and the function would then have to decide whether that is a move,
an error, or a silent no-op — three behaviours, no criterion for any of them, on the operation that
carries INV-04 and INV-05.

Seven rules both implementations must obey. These are the contract, not implementation detail.

1. **`createDevice` refuses a duplicate `assetTag`** and returns
   `{ created: false, reason: "DUPLICATE_ASSET_TAG" }`. It does not throw — a tag already in use is
   an expected failure, not a programmer error (`coding-standards.md`, "Error handling"). It mints
   `id` with `crypto.randomUUID()`, and always writes `seatId: null` and `rank: "SECONDARY"` (AC-2).
   No id and no rank is ever read from a caller.
2. **`updateDevice` never writes `seatId` and never writes `rank`** (AC-4). It refuses a duplicate
   `assetTag` against any *other* device — a device keeping its own tag is not a duplicate — and it
   refuses an owner change that would break INV-05: if the device is currently `PRIMARY` **and** has
   a `seatId`, the new `ownerId` must equal that seat's `occupantId`, or it returns
   `PRIMARY_OWNER_MUST_BE_OCCUPANT` and writes nothing at all. Partial application is not permitted:
   AC-11 asserts the device is unchanged, not that only the owner is unchanged.
3. **`assignDeviceToSeat` sets `seatId` and forces `rank: "SECONDARY"`** (AC-5). Assignment never
   confers primacy — if it did, assigning a second device to a seat would either produce two
   primaries or silently demote the incumbent, and no invariant asks for either. It touches no other
   device row (AC-5's last clause). It accepts a device that already has a seat and moves it, forcing
   SECONDARY on the way, so no reachable input throws; the UI does not offer that path (section 1.5).
4. **`unassignDevice` sets `seatId: null` and `rank: "SECONDARY"`** and deletes nothing (AC-6,
   INV-04, INV-07). The rank write is unconditional, whether or not the device was primary: a device
   flagged PRIMARY with no seat is a row INV-04 and INV-05 cannot be evaluated against at all.
   `ownerId` is untouched.
5. **`designatePrimaryDevice` checks in this order, and the order is load-bearing:**
   `NOT_FOUND`, then `NOT_ASSIGNED` (`seatId === null`, AC-9), then `SEAT_HAS_NO_OCCUPANT`
   (`seat.occupantId === null`, AC-10), then `OWNER_IS_NOT_OCCUPANT`
   (`device.ownerId !== seat.occupantId`, AC-8). AC-9 must precede AC-10 because an unassigned device
   has no seat to read an occupant from; AC-10 must precede AC-8 because a null occupant would
   otherwise be reported as an owner mismatch and the two messages the story requires would collapse
   into one.
6. **`designatePrimaryDevice` demotes before it promotes, in one function with no await on anything
   outside the seam.** Two PRIMARY devices on one seat is a state INV-04 forbids, and it must not
   exist even momentarily where another read could observe it. It returns the demoted device's id, or
   null. Designating a device that is already primary succeeds and demotes nothing.
7. **`deleteDevice` removes exactly one row** and touches no seat, no member and no other device
   (AC-12, AC-13). Before removing it, it reads whether the device was `PRIMARY` with a `seatId` and
   returns that seat id, so AC-13's "that seat has no primary device" is assertable.

### 1.3 Zod schemas — `src/lib/validation/device.ts` (new file)

```ts
import { z } from "zod";

// Zod schemas are the contract's runtime half. The field names here must match design section 1
// exactly (RULE-04).
//
// TODO(verify): these mirror the DRAFT prisma/schema.prisma. They change when it is approved.

// `.trim()` runs before `.min(1)`, so "   " fails rather than passing as three characters (AC-3).
//
// No format regex. `Device.assetTag` carries `@unique` and no pattern (prisma/schema.prisma:185),
// and a format rule invented here would refuse values the model accepts. The upper bounds are a UI
// sanity limit and are not from the model — the column is an unbounded `text` — which is the same
// class of choice `roomNameSchema` makes and is recorded as such rather than presented as a
// constraint the domain imposes.
export const deviceAssetTagSchema = z.string().trim().min(1).max(64);
export const deviceModelSchema = z.string().trim().min(1).max(120);

export const deviceIdSchema = z.string().trim().min(1);
export const deviceOwnerIdSchema = z.string().trim().min(1);
export const deviceSeatIdSchema = z.string().trim().min(1);

export const createDeviceSchema = z.object({
  assetTag: deviceAssetTagSchema,
  model: deviceModelSchema,
  ownerId: deviceOwnerIdSchema,
});

export const updateDeviceSchema = z.object({
  id: deviceIdSchema,
  assetTag: deviceAssetTagSchema,
  model: deviceModelSchema,
  ownerId: deviceOwnerIdSchema,
});

export const assignDeviceSchema = z.object({
  id: deviceIdSchema,
  seatId: deviceSeatIdSchema,
});

export const unassignDeviceSchema = z.object({ id: deviceIdSchema });
export const designatePrimaryDeviceSchema = z.object({ id: deviceIdSchema });
export const deleteDeviceSchema = z.object({ id: deviceIdSchema });

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type AssignDeviceInput = z.infer<typeof assignDeviceSchema>;
```

**How AC-3's "no owner chosen" is refused, exactly.** The owner control is a `<select>` whose first
option is a placeholder with `value=""`. An unmade choice therefore submits the empty string, which
fails `deviceOwnerIdSchema`'s `.min(1)` and renders a message against the owner field. There is no
separate "is one selected" check, and no `required` attribute is relied on — a `required` attribute
is a browser affordance and the server action is a network boundary. This is the same trap
`createRoomSchema` documents for empty number inputs, in a different shape, and it is why the
placeholder's value is part of the contract rather than a rendering detail.

### 1.4 Server actions — `src/actions/devices.ts` (new file)

```ts
export type DeviceFieldName = "assetTag" | "model" | "ownerId" | "seatId";

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

export async function createDevice(input: unknown): Promise<DeviceActionResult<Device>>;
export async function updateDevice(input: unknown): Promise<DeviceActionResult<Device>>;
export async function assignDevice(input: unknown): Promise<DeviceActionResult<Device>>;
export async function unassignDevice(input: unknown): Promise<DeviceActionResult<Device>>;
export async function designatePrimaryDevice(
  input: unknown
): Promise<DeviceActionResult<DesignatePrimaryData>>;
export async function deleteDevice(input: unknown): Promise<DeviceActionResult<DeleteDeviceData>>;
```

**`REFUSED`, and why it is not called `INVARIANT`.** `coding-standards.md` is explicit that an
invariant which cannot be satisfied is not an expected failure — it means state is already wrong, and
RULE-07 escalates it rather than handling it. Nothing here is that. AC-8, AC-10 and AC-11 are the
system *preventing* a violation on a write a person attempted, which is an ordinary expected failure
and returns a typed refusal. Naming the error kind `INVARIANT` would put the two on the same word,
and the next reader would have to decide which one a given occurrence is.

`field` carries `"ownerId"` for AC-11, because that criterion requires "a validation message shown
against the owner". It is `null` for AC-8, AC-9 and AC-10, which require a message and do not place
it against a field; those render in the page-level error region (section 6).

Body of every write action, in the order `coding-standards.md` and `architecture.md` fix:

1. `"use server"`
2. Parse with the schema named in 1.3. On failure map `error.issues` to `fields` and return
   `{ ok: false, error: { kind: "VALIDATION", fields } }` — never the raw `ZodError`.
3. **Permission check — none in this ticket.** Section 2. The step is not skipped silently: the
   Developer writes the comment section 2 specifies, at the line where the check belongs.
4. Call the seam. Map each refusal reason onto a `DeviceActionError`:

| Seam reason | Action error |
|---|---|
| `DUPLICATE_ASSET_TAG` | `{ kind: "DUPLICATE_ASSET_TAG", fields: { assetTag: "That asset tag is already in use." } }` |
| `PRIMARY_OWNER_MUST_BE_OCCUPANT` | `{ kind: "REFUSED", field: "ownerId", message: "A seat's primary device must be owned by that seat's occupant." }` |
| `OWNER_IS_NOT_OCCUPANT` | `{ kind: "REFUSED", field: null, message: "A seat's primary device must be owned by that seat's occupant." }` |
| `SEAT_HAS_NO_OCCUPANT` | `{ kind: "REFUSED", field: null, message: "A seat with no occupant can have no primary device." }` |
| `NOT_ASSIGNED` | `{ kind: "REFUSED", field: null, message: "A device that is assigned to no seat cannot be a primary device." }` |
| `NOT_FOUND`, `DEVICE_NOT_FOUND` | `{ kind: "NOT_FOUND", message: "That device no longer exists." }` |
| `SEAT_NOT_FOUND` | `{ kind: "NOT_FOUND", message: "That seat no longer exists." }` |

   The two INV-05 messages are the same sentence on purpose: AC-8 and AC-11 are the same illegal
   state reached from opposite directions, and a person who hits either has the same thing to fix.
   The reason codes stay distinct so a test can tell which path refused (1.1).
5. `revalidatePath("/devices")`, then return the typed result.

`revalidatePath` is imported from `next/cache`, signature
`(originalPath: string, type?: "layout" | "page")` — the same import `src/actions/rooms.ts` already
uses against the installed Next 16.3.0. It is what makes AC-2's "without my having to reload the
page" a server round trip rather than a second copy of the list in client state.

### 1.5 UI components

```ts
// src/app/(app)/devices/page.tsx — server component, default export (framework requirement)
export default async function DevicesPage(): Promise<JSX.Element>;

/** One rendered row. `seatCode === null` is the whole of "this device is unassigned". */
export interface DeviceRow {
  device: Device;
  /** The owner's full name, or null when the device has no owner (F-3). */
  ownerName: string | null;
  /** The code of the seat the device sits on, or null when it sits in inventory. */
  seatCode: string | null;
  /** The occupant of that seat, or null when the seat is vacant. Meaningless when seatCode is null. */
  occupantName: string | null;
}

export interface MemberOption {
  id: string;
  fullName: string;
}

export interface SeatOption {
  id: string;
  code: string;
  roomCode: string;
  occupantName: string | null;
}

// src/app/(app)/devices/devices-manager.tsx — client component
export function DevicesManager({
  rows,
  memberOptions,
  seatOptions,
}: {
  rows: DeviceRow[];
  memberOptions: MemberOption[];
  seatOptions: SeatOption[];
}): JSX.Element;
```

The page reads through the seam directly — `@/lib/data` is what a page may import — with four
**existing** functions and no new read:

```ts
const [deviceList, seatList, memberList, roomList] = await Promise.all([
  devices.listDevices(),
  seats.listSeats(),
  members.listMembers(),
  rooms.listRooms(),
]);
```

and joins them into `DeviceRow[]`, `MemberOption[]` and `SeatOption[]`. It renders
`<DevicesManager ... />` and holds no state. The join is in the page rather than in a new seam
function for the reason section 7 alternative E gives.

`DevicesManager` owns four dialogs (create, edit, assign, delete-confirm), the pending flag, and the
last error per surface. It calls the actions and then `router.refresh()`. It keeps no copy of the
device list: the list is a prop, and a client-side copy is a second source of truth for data the
server already re-sends.

**Row controls, and the one that is deliberately not conditional.**

| Control | Rendered when |
|---|---|
| Edit | always |
| Assign | the device has no seat |
| Unassign | the device has a seat |
| Make primary | **always** |
| Delete | always |

*Make primary* appears on every row **including unassigned ones**, and that is the design decision
in this table rather than an oversight. AC-9 requires attempting to designate an unassigned device
and being refused; hiding the control would make the refusal unreachable through the UI and AC-9
untestable, which is the "a UI affordance alone is never sufficient" trap in its exact shape — the
invariant would appear to hold because the button was missing, and would stop holding the moment any
other caller reached the action.

*Assign* is hidden on an assigned device by contrast, and the asymmetry is the point: no criterion
requires assigning an already-assigned device to be reachable, so nothing is lost by not offering it.
A move is unassign then assign, which keeps each write on exactly one criterion.

---

## 2. Permission model

**No permission gate is enforced by this ticket, on any operation, and that is a specified state
rather than an omission.** `01-story.md`'s Permissions section and out-of-scope item 1 record the
decision. The `AUT — Authentication & Accounts` table in `.ai/registry/features.md` is empty: there
is no session to read a role from, no rank to compare, and `ROO-01` shipped under the identical
condition.

| Operation | Gate in this ticket | Gate intended, for the AUT ticket |
|---|---|---|
| Reach `/devices` | none | any authenticated role |
| List all devices | none | `MANAGER` |
| List own devices | none | `USER` |
| `createDevice` | none | `MANAGER`, or `USER` for a device they will own — server action |
| `updateDevice` | none | `MANAGER`, or `USER` on a device they own — server action |
| `assignDevice` / `unassignDevice` | none | `MANAGER`, or `USER` on a device they own — server action |
| `designatePrimaryDevice` | none | `MANAGER`, or `USER` on a device they own — server action |
| `deleteDevice` | none | `MANAGER`, or `USER` on a device they own — server action |
| Every row and dialog control | rendered unconditionally | `PermissionGate`, as an affordance only |

The `USER` rows are the ones that are not a rank comparison alone. `rbac-and-security.md:39-41` is
explicit that *manage their own devices* is a rank check **plus** an ownership check — rank permits a
User to reach the endpoint, ownership decides which rows — and that both belong in the same place. A
filtered list is not a check, because the action can be invoked without the list.

Consequences the Developer must implement exactly, because "no gate" is easy to implement in two ways
and only one of them is this one:

- **`PermissionGate` is not used on this surface.** Wrapping a control in a gate fed a hard-coded
  role renders a surface that looks guarded and is not, which is worse than one plainly ungated. No
  file in `allowed_paths` imports it.
- **`can()` and `ROLE_RANK` are not called.** `src/lib/auth/permissions.ts` stays untouched; calling
  it against a fabricated role is the stubbed session the story explicitly refuses.
- **Step 3 of each of the six actions carries a comment naming what is absent** — the rank check, the
  ownership check, out-of-scope item 1, and the AUT group — at the line where the check will go. An
  absent check that looks deliberate is reviewable; an absent check that looks forgotten gets "fixed"
  by whoever reads it next, with an invented role.

Review check R6 reads this table. The correct R6 finding on this ticket is that no gate exists and
that the table says so.

---

## 3. Seam impact

Three files change, all inside `src/lib/data/`.

| File | Change |
|---|---|
| `src/lib/data/types.ts` | Adds `NewDevice`, `DevicePatch`, `CreateDeviceOutcome`, `UpdateDeviceOutcome`, `AssignDeviceOutcome`, `UnassignDeviceOutcome`, `DesignatePrimaryOutcome`, `DeleteDeviceOutcome`. **No existing type is modified.** |
| `src/lib/data/mock/devices.ts` | Adds the six write functions of 1.2. Gains an import of `seats` from `./store` — INV-05 is a fact about a seat and cannot be evaluated without one. The three existing reads keep their signatures. |
| `src/lib/data/prisma/devices.ts` | Adds the same six names with the same arity, each returning `notWired(...)`. |

Four files a reader would expect to see here and which are **not** touched:

- **`src/lib/data/mock/store.ts`** — it already exports `devices` and `seats` as the fixture arrays
  themselves, one array per collection in the process. `mock/devices.ts` imports both from it and
  writes through them. Nothing to repoint; that property is `ROO-01`'s R8 fix and this ticket
  inherits it rather than re-deciding it.
- **`src/lib/data/mock/seats.ts`, `mock/members.ts`, `mock/rooms.ts`** — read-only use of
  `listSeats()`, `listMembers()` and `listRooms()` as they stand.
- **`src/lib/data/fixtures.ts`** — no seed change. F-5 verified that every Given this ticket needs is
  either present in the seed or constructible through the surface.

**The one caveat this ticket inherits and QA needs.** The mock store is process-global and does not
reset between tests. Under vitest that is bounded — `vitest.config.mts` collects
`tests/unit/**/*.test.ts` and vitest isolates each file's module graph, so `tests/unit/rooms.test.ts`
deleting `ROOM-A` cannot reach `tests/unit/devices.test.ts`. Under Playwright it is not: one
production server holds one store, `playwright.config.ts` sets `fullyParallel: true`, and spec files
run against it concurrently. Section 6.2 turns that into an instruction rather than a discovery.

### 3.1 Invariant mechanisms

`.ai/registry/invariants.md` requires this design to state, per ID in `invariants_touched`, which
mechanism holds it, and says a UI affordance alone is never sufficient. None of the rows below relies
on one.

| ID | Mechanism, in this ticket |
|---|---|
| **INV-04** — a seat has at most one primary device | Held entirely by `designatePrimaryDevice` in `src/lib/data/mock/devices.ts`, which demotes the incumbent and promotes the target in one function with no await outside the seam (1.2 rule 6), so two PRIMARY rows on one seat is a state no read can observe. Three side doors are closed by three other functions: `assignDeviceToSeat` forces SECONDARY so assignment cannot mint a second primary (rule 3); `unassignDevice` forces SECONDARY so a designation cannot outlive the seat it was made against (rule 4); and the `NOT_ASSIGNED` refusal keeps a PRIMARY row from existing with no seat at all (rule 5). The partial unique index `one_primary_device_per_seat` sketched in `data-model.md:92` is a schema change and is out-of-scope item 6 — under `DATA_SOURCE=mock` there is no database, so **the seam is the only mechanism, which is weaker than a constraint, and R8 is the only thing verifying it.** |
| **INV-05** — a seat's primary device must be owned by that seat's occupant | Held by two checks in the same module, guarding the two directions the story identifies. `designatePrimaryDevice` compares `device.ownerId` with `seat.occupantId` with the designation moving and the owner still (`OWNER_IS_NOT_OCCUPANT`, AC-8), and refuses separately when there is no occupant to compare against (`SEAT_HAS_NO_OCCUPANT`, AC-10). `updateDevice` runs the same comparison with the owner moving and the designation still (`PRIMARY_OWNER_MUST_BE_OCCUPANT`, AC-11) and writes nothing when it fails. Both are refusals in `src/lib/data/`, neither is a UI affordance, and the owner picker is deliberately **not** filtered to the occupant — section 7, alternative C. The registry records that this invariant needs a constraint trigger and is not expressible in Prisma; no such mechanism exists under the mock. |
| **INV-06** — on occupant exit, the primary auto-downgrades to secondary | **Engaged in one direction only, and this ticket's obligation is negative.** DEV-01 builds no occupant-exit path — it writes nothing on a seat (out-of-scope items 2 and 7) — so there is no downgrade here to implement. What it must not do is create a state the downgrade cannot act on, and two rules prevent that. The designation lives in `Device.rank` keyed by `Device.seatId`, which is exactly where an occupant-exit path will look for it, and `unassignDevice` clears both together (rule 4) so no designation is ever orphaned from its seat. `SEAT_HAS_NO_OCCUPANT` (rule 5) is the other half: a primary on an unoccupied seat is a row the downgrade would have nothing coherent to fire on. `ROO-01` already implements the one exit path that exists — `deleteRoom` detaches and demotes — and nothing in this ticket changes it. |
| **INV-07** — devices may exist unassigned in inventory | Held by `Device.seatId` being nullable, and by two writes that use it. `createDevice` makes inventory the state a device is born into (rule 1) and `unassignDevice` makes it the state a device returns to (rule 4) — the device survives, which is what makes unassigning something other than deleting. The UI carries the same distinction: `Unassign` and `Delete` are separate row controls, and only the second is confirmed. AC-6's "it still exists" is the assertion, and `deleteDevice` is the only function in this ticket that removes a row. |

Two of these are held by refusals and two by the shape of a write, and it is worth saying plainly
which is which rather than presenting all four as enforcement. INV-04 and INV-05 are refusals: a
caller asks and the seam says no. INV-06 and INV-07 are properties of what the writes do — the rank
travels with the seat, and the row outlives the assignment — and there is nothing for either of them
to refuse.

---

## 4. Schema delta

**`none`.**

No model changes, no migration, no ADR. `schema_delta` stays `none` and `requires_adr` stays `false`,
which is what `01-story.md` out-of-scope item 5 requires and what `ticket.yaml` already carries.

The design is written entirely against `prisma/schema.prisma` as it stands. Every field the contract
names already exists on the `Device` model, and the three declarations this ticket leans on are
already there:

| Line | Declares | Wanted by |
|---|---|---|
| `assetTag String @unique` | a duplicate asset tag is refused | F-1, AC-3 |
| `ownerId String?` + `owner Member? ... onDelete: SetNull` | a device may have no owner | INV-07, F-3 |
| `seatId String?` + `seat Seat? ... onDelete: SetNull` | a device outlives its seat, unassigned | INV-07, AC-6 |

**Two mechanisms this ticket needs and the schema does not yet provide**, both out-of-scope item 6
and both human work under RULE-09:

- `one_primary_device_per_seat`, the partial unique index for INV-04, sketched at
  `data-model.md:92-93` against column names its own `TODO(verify):` flags as unreconciled. The
  approved draft uses `rank DeviceRank`, not `isPrimary`, so the sketch as written would not apply.
  F-2 records the reconciliation; this document does not perform it, because `data-model.md` is
  human-owned.
- The constraint trigger for INV-05, which relates two rows in two tables and has no Prisma
  expression at all.

Until both exist, INV-04 and INV-05 are held in `src/lib/data/` and nowhere else. That is weaker than
a constraint. It is stated here, in section 3.1, and in the story, rather than left to be discovered
when the database is wired.

---

## 5. allowed_paths

Written back into `ticket.yaml` verbatim.

```yaml
allowed_paths:
  - "src/app/(app)/devices/page.tsx"
  - "src/app/(app)/devices/devices-manager.tsx"
  - "src/actions/devices.ts"
  - "src/lib/validation/device.ts"
  - "src/lib/data/types.ts"
  - "src/lib/data/mock/devices.ts"
  - "src/lib/data/prisma/devices.ts"
  - "tests/unit/devices.test.ts"
  - "tests/e2e/devices.spec.ts"
  - "tests/e2e/smoke.spec.ts"
  - ".ai/board/tickets/DEV-01/**"
```

Every entry is a file path. `src/app/(app)/devices/**` would have been shorter and would have left
check R1 unable to tell this ticket's diff from any other change under that route.

**`src/app/(app)/devices/page.tsx` already exists** and is a Phase B read-only scaffold. This ticket
replaces its body. That is not a violation of *additive only*: the file is in `allowed_paths`, the
route is the one the story's surface belongs on, and the nav already links to it.

**`tests/e2e/smoke.spec.ts` is listed because this design breaks it**, and it is listed now rather
than after QA reports it. Section 6 keys device rows by `assetTag` instead of by id, and
`tests/e2e/smoke.spec.ts:57` asserts `devices-row-dev-05`, which will no longer resolve — the row
becomes `devices-row-AST-0005`. One selector string changes and no behaviour does; the INV-07
assertion it carries is unaffected, because the seat cell still renders the literal `unassigned`.

This is `ROO-01`'s Q11 applied in advance. That ticket learned it the expensive way: the same
re-keying broke the same file, `allowed_paths` did not contain it, no agent on the ticket could
repair it, and the QA gate failed on a two-line fix with no owner. **A design that breaks a file must
put that file in reach of the ticket that broke it.** The repair is QA's, because `tests/**` is QA's.

Seven files a reader might expect, and why each is absent:

- **`src/lib/data/mock/store.ts`, `mock/seats.ts`, `mock/members.ts`, `mock/rooms.ts`,
  `fixtures.ts`** — section 3. The store already exports the arrays this ticket writes through, and
  the other three are read through existing functions.
- **`src/app/(app)/layout.tsx`** — the nav already carries `{ href: "/devices", label: "Devices" }`.
  Nothing to add.
- **`src/lib/auth/**`** — the guard is out-of-scope item 1, and section 2 requires that nothing here
  imports `PermissionGate` or calls `can()`.
- **`src/components/shared/**` and `src/components/ui/**`** — `DataTable`, `EntityFormDialog`,
  `Dialog`, `Input`, `Select`, `Badge` and `Button` are used as they are. `DataTable`'s `rowKey` is a
  prop so keying by `assetTag` needs no change to it; `EntityFormDialog` already emits the
  `-dialog`, `-cancel` and `-submit` testids section 6 names; `Select` spreads its props, so it
  carries a `data-testid` the same way `Input` already does in `rooms-manager.tsx`.
- **`tests/unit/seam-parity.test.ts`** — it must keep passing unchanged, which is exactly why it is
  not editable. A parity test the ticket may edit is a parity test the ticket can silence. It is what
  will catch a sixth function added to the mock and forgotten in `prisma/devices.ts`.
- **`tests/unit/rooms.test.ts`, `tests/e2e/rooms.spec.ts`** — neither addresses a device through the
  UI. `tests/unit/rooms.test.ts` names `dev-01` and `dev-04` by seam id, which this ticket does not
  change.
- **`playwright.config.ts`, `vitest.config.mts`** — no new test root and no new pattern. Section 6.2
  works within `fullyParallel: true` rather than asking for it to be turned off, which is a config
  change and a different ticket's.

`tests/unit/devices.test.ts` and `tests/e2e/devices.spec.ts` are two named files, not `tests/**`. If
QA needs a third it asks — the `qa` to `tech-lead-design` edge is open and budgeted at 6 — and the
answer is an amendment to this section, which is cheaper than a glob that makes R1 meaningless for
the whole test tree.

**Size verdict: `M`.** Ten files plus the ticket folder, against the sizing table's "M — up to 12".
It agrees with `ba`'s `size_estimate` of `M`, so nothing routes back to SPEC and the ticket is not
split.

Not XL, by the rule a human set on `ROO-01`'s Q4 and recorded as MD-4: the test is whether existing
callers must change. None do. `types.ts` gains eight types and alters none; the three existing device
seam functions keep their names, arity and return types; every addition is a new name. Nothing
outside `allowed_paths` has to follow.

Worth recording against the sizing table, since `ROO-01` filed model debt about it twice: this ticket
sits at ten and the count was never close to deciding anything. The three files that pushed `ROO-01`
over the boundary — `store.ts`, `seats.ts`, `devices.ts` — arrived with INV-11's cascade, and DEV-01
inherits all three already built.

---

## 6. Testability contract

Every selector QA may use. RULE-05 makes this the only channel: a control absent from this table does
not exist as far as QA is concerned, and check R7 verifies each one appears in the markup.

**Rows are keyed by device `assetTag`, not by device id.** Ids are minted with
`crypto.randomUUID()` and are unpredictable, so a testid built from one is unaddressable for a device
the test just created. `assetTag` is `@unique` in the model and is a value the test supplies. This is
the decision that puts `tests/e2e/smoke.spec.ts` in `allowed_paths` (section 5).

**A caution that follows from it.** `deviceAssetTagSchema` carries no format regex (1.3), so an asset
tag may contain spaces and a testid built from one would be awkward to address. QA should create
devices with tags in the shape the seed already uses — `AST-9001` — which keeps every testid a single
token. This is advice about test data, not a constraint the surface enforces.

Two prefixes come from shared components and are reused rather than redefined: `DataTable` emits
`${prefix}-table`, `${prefix}-row-${key}` and `${prefix}-empty`; `EntityFormDialog` emits
`${prefix}-dialog`, `${prefix}-cancel` and `${prefix}-submit`.

| data-testid | Element | Used by |
|---|---|---|
| `devices-page` | The device management screen's root section | AC-1 |
| `devices-table` | The device list table | AC-1, AC-2, AC-4, AC-12, AC-13 |
| `devices-empty` | Empty-state message shown when no device exists | AC-1 |
| `devices-row-<assetTag>` | One row per device, keyed by asset tag | AC-1, AC-2, AC-4, AC-5, AC-6, AC-12, AC-13, AC-14 |
| `devices-row-<assetTag>-tag` | The asset tag cell | AC-1, AC-4 |
| `devices-row-<assetTag>-model` | The model cell | AC-1, AC-4 |
| `devices-row-<assetTag>-owner` | The owner cell — the owner's full name, or the literal `unowned` | AC-1, AC-2, AC-4, AC-5, AC-6, AC-11, AC-14 |
| `devices-row-<assetTag>-seat` | The seat cell — the seat's code, or the literal `unassigned` | AC-1, AC-2, AC-5, AC-6, AC-9, AC-10, AC-14 |
| `devices-row-<assetTag>-rank` | The designation cell — `PRIMARY`, `SECONDARY`, or the literal `n/a` when the device has no seat | AC-1, AC-2, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-13, AC-14 |
| `devices-row-<assetTag>-occupant` | The occupant cell — the occupant's full name, the literal `no occupant` when the seat is vacant, or the literal `n/a` when the device has no seat | AC-1, AC-7, AC-8, AC-10 |
| `devices-row-<assetTag>-edit` | Edit control on a row | AC-4, AC-11 |
| `devices-row-<assetTag>-assign` | Assign control on a row. **Present only when the device has no seat.** | AC-5 |
| `devices-row-<assetTag>-unassign` | Unassign control on a row. **Present only when the device has a seat.** | AC-6 |
| `devices-row-<assetTag>-primary` | Make-primary control on a row. **Present on every row, including unassigned ones** — section 1.5 | AC-7, AC-8, AC-9, AC-10 |
| `devices-row-<assetTag>-delete` | Delete control on a row | AC-12, AC-13, AC-14 |
| `devices-create-open` | Control that opens the create dialog | AC-1, AC-2 |
| `devices-action-error` | Page-level message for a refused row action. **Absent until a row action is refused** | AC-8, AC-9, AC-10 |
| `device-create-dialog` | The create dialog | AC-2, AC-3 |
| `device-create-tag` | Asset tag input | AC-2, AC-3 |
| `device-create-tag-error` | Validation message against the asset tag, including "already in use" | AC-3 *(and the duplicate criterion pending F-1)* |
| `device-create-model` | Model input | AC-2, AC-3 |
| `device-create-model-error` | Validation message against the model | AC-3 |
| `device-create-owner` | Owner select. First option is a placeholder with `value=""` | AC-2, AC-3 |
| `device-create-owner-error` | Validation message against the owner | AC-3 |
| `device-create-submit` | Submit control in the create dialog | AC-2, AC-3 |
| `device-create-cancel` | Cancel control in the create dialog | AC-3 |
| `device-edit-dialog` | The edit dialog | AC-4, AC-11 |
| `device-edit-tag` | Asset tag input, pre-filled with the current value | AC-4 |
| `device-edit-tag-error` | Validation message against the asset tag | AC-4 |
| `device-edit-model` | Model input, pre-filled with the current value | AC-4 |
| `device-edit-model-error` | Validation message against the model | AC-4 |
| `device-edit-owner` | Owner select, pre-selected to the current owner, or on the placeholder when there is none | AC-4, AC-11 |
| `device-edit-owner-error` | Validation message against the owner, **including the INV-05 refusal of AC-11** | AC-4, AC-11 |
| `device-edit-submit` | Submit control in the edit dialog | AC-4, AC-11 |
| `device-edit-cancel` | Cancel control in the edit dialog | AC-4 |
| `device-assign-dialog` | The assign dialog | AC-5 |
| `device-assign-seat` | Seat select. First option is a placeholder with `value=""` | AC-5 |
| `device-assign-seat-error` | Validation message against the seat | AC-5 |
| `device-assign-submit` | Submit control in the assign dialog | AC-5 |
| `device-assign-cancel` | Cancel control in the assign dialog | AC-5 |
| `device-delete-dialog` | The delete confirmation dialog | AC-12, AC-13, AC-14 |
| `device-delete-message` | The confirmation sentence, naming the device and the consequence | AC-12, AC-13 |
| `device-delete-seat` | The seat the device is assigned to, rendered as a bare seat code — the literal `none` when the device is unassigned | AC-12, AC-13 |
| `device-delete-confirm` | Confirm control in the delete dialog | AC-12, AC-13 |
| `device-delete-cancel` | Dismiss control in the delete dialog | AC-14 |

Six notes QA needs and cannot get from anywhere else.

**`devices-row-<assetTag>-rank` renders `n/a`, not `SECONDARY`, for an unassigned device.** The DTO
always holds a rank, and an unassigned device's is `SECONDARY` — but AC-9's reasoning is that there
is no such thing as a primary device without a seat, and by the same argument no such thing as a
secondary one. Rendering the stored value would make AC-2's "it is not shown as a primary device" and
AC-5's "it is shown as a secondary device" indistinguishable from each other. Three values, three
states, one element.

**`device-delete-seat` renders a bare seat code, always, including when there is none.** AC-13
requires the confirmation to name the seat and AC-12 has no seat to name; one element serves both and
the difference between them is the value. Parsing a seat code out of a sentence breaks on a wording
change, so the sentence is `device-delete-message` and the code is its own element. This is the shape
`room-delete-seat-count` took on `ROO-01` and the reason is the same.

**Error elements exist only when there is an error.** Each `-error` testid and
`devices-action-error` are absent from the markup until the corresponding failure occurs. AC-3
requires a message against *each* offending field, so a submission with three blank fields renders
three of them — assert on the specific ones, not on a count.

**AC-8, AC-10 and AC-11 put their messages in two different places, and the split is specified.**
AC-11 is a refused *form submission* and its message renders against the owner select, in
`device-edit-owner-error`, because that criterion says "against the owner". AC-8, AC-9 and AC-10 are
refused *row actions* with no form open, and their messages render in `devices-action-error`. Both
INV-05 messages are the same sentence in two places, which is deliberate (1.4).

**The two select controls carry their meaning in the option label, and the format is contractual.**
QA cannot read `fixtures.ts` and must not try. Everything a criterion's Given needs is discoverable
from these labels:

| Select | Option `value` | Option label |
|---|---|---|
| `device-create-owner`, `device-edit-owner` | member id | the member's full name, e.g. `Ada Admin` |
| `device-assign-seat` | seat id | `<SEAT-CODE> (<ROOM-CODE>) — <occupant full name>`, or `<SEAT-CODE> (<ROOM-CODE>) — no occupant` |

Both placeholders carry `value=""` and are the reason an unmade choice is refused rather than
defaulted (1.3). The seat label's occupant half is the whole mechanism by which AC-7's "the occupant
is the owner", AC-8's "an occupant who is not the owner", and AC-10's "no occupant" become
constructible without disclosing the seed — which is what `01-story.md`'s note on setup data asks
for.

**AC-14 has no selector of its own.** It asserts that dismissing the confirmation performs nothing,
so it is `device-delete-cancel` plus the row cells that must be unchanged, all of which are above.

### 6.1 The seam surface QA may call

`tests/unit/devices.test.ts` may call exactly this and nothing else. Anything absent from this table
is out of bounds for the same reason an unlisted selector is: a name that does not appear in this
document does not exist as far as QA is concerned.

```ts
import { devices, members, seats } from "@/lib/data";
```

| Call | Returns | Fields QA may assert on |
|---|---|---|
| `devices.listDevices()` | `Promise<Device[]>` | `id`, `assetTag`, `model`, `ownerId` (`string \| null`), `seatId` (`string \| null`), `rank` (`"PRIMARY" \| "SECONDARY"`) |
| `devices.getDevice(id)` | `Promise<Device \| null>` | the same fields |
| `devices.listUnassignedDevices()` | `Promise<Device[]>` | the same fields; every element has `seatId === null` |
| `devices.createDevice(input)` | `Promise<CreateDeviceOutcome>` | `created`, and `device` or `reason` |
| `devices.updateDevice(id, patch)` | `Promise<UpdateDeviceOutcome>` | `updated`, and `device` or `reason` |
| `devices.assignDeviceToSeat(deviceId, seatId)` | `Promise<AssignDeviceOutcome>` | `assigned`, and `device` or `reason` |
| `devices.unassignDevice(deviceId)` | `Promise<UnassignDeviceOutcome>` | `unassigned`, and `device` or `reason` |
| `devices.designatePrimaryDevice(deviceId)` | `Promise<DesignatePrimaryOutcome>` | `designated`, `demotedDeviceId`, and `device` or `reason` |
| `devices.deleteDevice(id)` | `Promise<DeleteDeviceOutcome>` | `deleted`, `wasPrimaryOfSeatId`, or `reason` |
| `seats.listSeats(roomId?)` | `Promise<Seat[]>` | `id`, `code`, `roomId`, `occupantId` (`string \| null`) |
| `members.listMembers()` | `Promise<Member[]>` | `id`, `fullName` |

The exact reason strings are in section 1.1 and are part of the contract — assert on them by value.
They are what distinguishes AC-8 from AC-10, which is the distinction `01-story.md` says the defect
hides in.

`@` resolves to `src/` under vitest (`vitest.config.mts`), and `tests/unit/**/*.test.ts` is the only
pattern vitest collects. Each unit test **file** gets its own module graph, so the store this file
mutates is not the one `tests/unit/rooms.test.ts` mutates. Within one file it is shared and does not
reset — order destructive cases deliberately.

The seam takes and returns ids, and the story names things by code and by name. `listSeats()` and
`listMembers()` are the bridge, the same way `listRooms()` was on `ROO-01`. Device ids are minted with
`crypto.randomUUID()` and are never stable across a run.

### 6.2 Two constraints on the e2e suite, which are this design's and not QA's to discover

**`tests/e2e/devices.spec.ts` must declare `test.describe.configure({ mode: "serial" })`.**
`playwright.config.ts` sets `fullyParallel: true` and one production server holds one mutable store.
A criterion that asserts "the device list is otherwise unchanged" (AC-9) or "no other device changes"
(AC-6, AC-8) is not meaningful while another worker is writing to the same array.
`tests/e2e/rooms.spec.ts:18` does exactly this and for the same reason.

**The spec must not mutate any device that was already there when it started.** Serial mode orders
tests *within* a file; spec files still run against the server concurrently, and
`tests/e2e/smoke.spec.ts` asserts that a seeded unassigned device's row reads `unassigned`. A DEV-01
test that assigns that device makes an unrelated spec fail intermittently, which is the worst failure
this suite can produce because it does not reproduce.

Every Given in the story is reachable inside that rule, and the route is the surface itself:

| Criterion | Given, built through the UI |
|---|---|
| AC-2, AC-3 | create, with a run-unique asset tag |
| AC-4 | create, then edit |
| AC-5, AC-6 | create, then assign to a seat discovered from `device-assign-seat`, then unassign |
| AC-7 | create two devices owned by the occupant of a seat the picker labels with an occupant; assign both; designate one, then the other, and assert the first demoted |
| AC-8 | create a device owned by someone the picker labels against a *different* seat; assign it to an occupied seat; attempt to designate |
| AC-9 | create; attempt to designate without assigning |
| AC-10 | create; assign to a seat the picker labels `no occupant`; attempt to designate |
| AC-11 | reach AC-7's state, then edit that primary device's owner to a different member |
| AC-12, AC-13, AC-14 | delete devices this spec created, assigned and designated |

Every row is a device the spec made. No seeded device is written to, and no fixture identifier is
quoted. AC-7's Given needs a seat that is occupied and holds no primary device; the seat picker's
labels are what identify one, and the device list's `-seat` and `-rank` cells are what confirm it
holds none.

---

## 7. Rejected alternatives

### A — one `updateDevice(id, patch)` carrying `seatId` and `rank`, instead of four write functions

The strongest alternative, and the one a Developer would reach for. It is one seam function, one
action, one dialog and one Zod schema instead of four of each, and the patch shape falls straight out
of the DTO. `ROO-01` is not a counter-example: its `RoomPatch` is a single editable field.

Rejected because it moves every invariant check onto a path that cannot state its own precondition.
Under one patch, `designatePrimaryDevice`'s four ordered refusals (1.2 rule 5) become a diff of the
submitted patch against the stored row — *did rank go SECONDARY to PRIMARY, and if so was seatId also
changing in the same call, and against which seat is the occupant compared, the old one or the new
one*. Four criteria (AC-8, AC-9, AC-10, AC-11) each become a case in one function, and AC-5's "any
device that was already the primary device of that seat is still that seat's primary device" becomes
a question about a write that did not happen.

Separate functions put each invariant check on exactly one operation, which is what makes AC-5 and
AC-7 independently testable — the property `01-story.md` A-1 identifies as the reason creation and
assignment are separate acts. The same argument applies one level down.

The cost is real and is paid: six seam functions instead of three, six actions, and a
`designatePrimaryDevice` that exists to flip one enum.

### B — enforce INV-05 by filtering the owner picker to the seat's occupant

Better UX than a refusal — an illegal choice is never offered, and the person is not told no after
typing. For a surface where INV-05 is the rule most likely to be broken by accident, that is a
genuine argument.

Rejected because `.ai/registry/invariants.md` says a UI affordance alone is never sufficient, and a
filtered list is the canonical example: **a list that omits a row is not a check, because the action
can be invoked without the list.** `01-story.md` makes the same point about the `USER` permission row.
The server action is a network boundary; the picker is a suggestion at it.

It is also wrong on this surface specifically. AC-11 changes the *owner* of an already-primary device,
and there is no seat chosen in that dialog to filter against — the constraining seat is the one the
device already sits on. A filter would have to reach across from the row into the form, and it would
still not be a check.

What is adopted instead is the half that is honest: the picker is not filtered, and the seat select's
option label carries the occupant (section 6) so the information needed to choose correctly is
visible. Informing is a UI job; refusing is the seam's.

### C — an *Unowned* option in the owner picker, so a device can be returned to inventory-without-owner

The counter-option to F-3, and it has the model on its side: `ownerId` is nullable, the seed contains
`dev-05` with no owner, and this design makes that state unreachable for anything created or edited
here.

Rejected on three grounds. No criterion asks for it — AC-2 and AC-3 require an owner and nothing
requires the reverse. It adds an INV-05 refusal path with no criterion behind it: clearing the owner
of a primary device must be refused, so *unowned* is a fourth way into AC-11's territory and would
need its own test. And *unowned* is not a member, so it would be the one option in the picker whose
value is not a member id, which the Zod schema would have to special-case.

The cost is stated in F-3 rather than hidden, and it is narrow: one seeded device whose owner can be
set but not unset. If a human wants the capability, it is a criterion and a fifth reason code, not a
rewrite.

### D — a joined read on the seam, `listDeviceRows()`, instead of joining in the page

AC-1 needs a device, its owner's name, its seat's code, and that seat's occupant's name. That is a
join, joins are domain logic, and doing it in a page component looks like exactly the kind of thing
the seam exists to hold. It would also be one call instead of four.

Rejected because it puts a new *shape* across the seam rather than a new name, and that is the one
thing `tests/unit/seam-parity.test.ts` does not check. `architecture.md` says it in terms: parity
"checks the interface, and matching the interface is necessary, not sufficient" — a mock returning a
joined row the Prisma implementation cannot reproduce passes parity and breaks at the swap. A joined
DTO is also the widest possible contract for the narrowest possible consumer: one page.

The four reads it replaces already exist, already return DTOs, and are already backed on both sides.
`ROO-01`'s page composes `listRooms()` with `countSeatsInRoom()` the same way. If a second surface
ever needs the same join, that is the point at which it earns a name.

### E — rows keyed by device `id` rather than `assetTag`

Recorded briefly because it is the default and because taking it would keep `tests/e2e/smoke.spec.ts`
out of `allowed_paths` and this design at nine files.

Rejected on `ROO-01`'s evidence rather than on argument: ids are minted with `crypto.randomUUID()`, a
test cannot address a row for a device it just created, and every create-then-assert criterion —
AC-2, AC-4, AC-5, AC-6, AC-7, AC-12, AC-13 — needs exactly that. Saving one file by making seven
criteria untestable is not a trade.

---

## Changelog

- `2026-08-23T07:19:53Z` — initial version, all seven sections. Raised by `tech-lead-design`.
  `allowed_paths` enumerated at ten files plus the ticket folder and written back to `ticket.yaml`;
  `size` written as `M`, agreeing with `ba`'s `size_estimate`; `state` moved to `IN_PROGRESS`;
  `branch` written as `feat/DEV-01`, which this stage created from `main` at `0d651f7` because
  `guard-allowed-paths.mjs` and `scripts/check-allowed-paths.mjs` both resolve the active ticket from
  the branch name and neither enforces RULE-03 without it. `schema_delta` stays `none` and
  `requires_adr` stays `false`. Five findings raised against `01-story.md` — F-1 to F-5 in section 0,
  routed to `ba` in `99-questions.md` — none blocking; `consulted` is empty and no chat occurred.
