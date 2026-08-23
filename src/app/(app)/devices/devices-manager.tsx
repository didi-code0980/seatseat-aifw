"use client";

// The interactive half of the device management screen (DEV-01).
//
// It keeps no copy of the device list. `rows` is a prop, every mutation calls `revalidatePath` on
// the server and `router.refresh()` here, and the server re-sends the list. A client-side copy would
// be a second source of truth for data the server already re-sends, and every one of the six actions
// would have to update both.
//
// Nothing here gates a control on a role, and that is the specified state rather than an omission:
// `PermissionGate` is not imported and `can()` is not called, because a control wrapped in a gate
// fed a hard-coded role renders a surface that looks guarded and is not (02-design.md section 2).

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, JSX, ReactNode } from "react";

import type { DeviceRow, MemberOption, SeatOption } from "./page";
import {
  assignDevice,
  createDevice,
  deleteDevice,
  designatePrimaryDevice,
  unassignDevice,
  updateDevice,
} from "@/actions/devices";
import type { DeviceActionError, DeviceFieldName } from "@/actions/devices";
import { DataTable } from "@/components/shared/DataTable";
import { EntityFormDialog } from "@/components/shared/EntityFormDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

/**
 * The fields a form collects. `VALIDATION` and `DUPLICATE_ASSET_TAG` both arrive as a field map;
 * `REFUSED` becomes one when it names a field, which is AC-11 and only AC-11 — that criterion
 * requires its message against the owner select. `REFUSED` with no field is a row action with no
 * form open and renders in the page-level region instead.
 */
function fieldMessages(error: DeviceActionError | null): Partial<Record<DeviceFieldName, string>> {
  if (error === null) return {};
  if (error.kind === "VALIDATION" || error.kind === "DUPLICATE_ASSET_TAG") return error.fields;
  if (error.kind === "REFUSED" && error.field !== null) {
    const fields: Partial<Record<DeviceFieldName, string>> = {};
    fields[error.field] = error.message;
    return fields;
  }
  return {};
}

/** A message that belongs to no field: a refused row action, or a row that is already gone. */
function looseMessage(error: DeviceActionError | null): string | null {
  if (error === null) return null;
  if (error.kind === "NOT_FOUND") return error.message;
  if (error.kind === "REFUSED" && error.field === null) return error.message;
  return null;
}

/**
 * An error element exists only while its field is rejected. AC-3 wants a message against *each*
 * offending field, so three blank inputs render three of these — which is why absence is the resting
 * state rather than an empty element that is always present.
 */
function FieldError({ testId, message }: { testId: string; message: string | undefined }): ReactNode {
  if (message === undefined) return null;
  return (
    <p data-testid={testId} className="mt-1 text-sm text-accent">
      {message}
    </p>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }): ReactNode {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * The seat picker's label is contractual, not presentation (02-design.md section 6). Its occupant
 * half is the whole mechanism by which AC-7's "the occupant is the owner", AC-8's "an occupant who
 * is not the owner" and AC-10's "no occupant" become constructible from the screen, without any
 * artifact reaching QA having disclosed the seed.
 */
function seatOptionLabel(seat: SeatOption): string {
  return `${seat.code} (${seat.roomCode}) — ${seat.occupantName ?? "no occupant"}`;
}

export function DevicesManager({
  rows,
  memberOptions,
  seatOptions,
}: {
  rows: DeviceRow[];
  memberOptions: MemberOption[];
  seatOptions: SeatOption[];
}): JSX.Element {
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DeviceRow | null>(null);
  const [assignTarget, setAssignTarget] = useState<DeviceRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeviceRow | null>(null);

  const [pending, setPending] = useState(false);
  const [createError, setCreateError] = useState<DeviceActionError | null>(null);
  const [editError, setEditError] = useState<DeviceActionError | null>(null);
  const [assignError, setAssignError] = useState<DeviceActionError | null>(null);
  const [deleteError, setDeleteError] = useState<DeviceActionError | null>(null);
  // AC-8, AC-9, AC-10: a refused row action has no form open to render against. Absent until one is
  // refused, which is why it is null rather than "".
  const [actionError, setActionError] = useState<DeviceActionError | null>(null);

  const createFields = fieldMessages(createError);
  const editFields = fieldMessages(editError);
  const assignFields = fieldMessages(assignError);

  const editLoose = looseMessage(editError);
  const assignLoose = looseMessage(assignError);
  const deleteLoose = looseMessage(deleteError);
  const actionMessage = looseMessage(actionError);

  async function submitCreate(data: FormData): Promise<void> {
    setPending(true);
    const result = await createDevice({
      assetTag: String(data.get("assetTag") ?? ""),
      model: String(data.get("model") ?? ""),
      // The owner select's placeholder carries `value=""`, so an unmade choice arrives as the empty
      // string and is refused by `deviceOwnerIdSchema`. No `required` attribute is relied on.
      ownerId: String(data.get("ownerId") ?? ""),
    });
    setPending(false);

    if (!result.ok) {
      setCreateError(result.error);
      return;
    }

    setCreateError(null);
    setCreateOpen(false);
    // AC-2: the outcome is confirmed without a reload. `revalidatePath` invalidated the server's
    // copy; this is what makes the page re-render against it.
    router.refresh();
  }

  async function submitEdit(id: string, data: FormData): Promise<void> {
    setPending(true);
    const result = await updateDevice({
      id,
      assetTag: String(data.get("assetTag") ?? ""),
      model: String(data.get("model") ?? ""),
      ownerId: String(data.get("ownerId") ?? ""),
    });
    setPending(false);

    if (!result.ok) {
      setEditError(result.error);
      return;
    }

    setEditError(null);
    setEditTarget(null);
    router.refresh();
  }

  async function submitAssign(id: string, data: FormData): Promise<void> {
    setPending(true);
    const result = await assignDevice({ id, seatId: String(data.get("seatId") ?? "") });
    setPending(false);

    if (!result.ok) {
      setAssignError(result.error);
      return;
    }

    setAssignError(null);
    setAssignTarget(null);
    router.refresh();
  }

  async function submitDelete(id: string): Promise<void> {
    setPending(true);
    const result = await deleteDevice({ id });
    setPending(false);

    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }

    setDeleteError(null);
    setDeleteTarget(null);
    router.refresh();
  }

  /** AC-6. A row control with no dialog: its refusal has nowhere to render but the page region. */
  async function runUnassign(id: string): Promise<void> {
    setPending(true);
    const result = await unassignDevice({ id });
    setPending(false);
    setActionError(result.ok ? null : result.error);
    if (result.ok) router.refresh();
  }

  /**
   * AC-7 through AC-10. Offered on every row including unassigned ones, so AC-9's refusal is
   * reachable — see the row-controls note below.
   */
  async function runDesignate(id: string): Promise<void> {
    setPending(true);
    const result = await designatePrimaryDevice({ id });
    setPending(false);
    setActionError(result.ok ? null : result.error);
    if (result.ok) router.refresh();
  }

  function onCreateSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    // Read before the await: `event.currentTarget` is null by the time the action resolves.
    void submitCreate(new FormData(event.currentTarget));
  }

  function onEditSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (editTarget === null) return;
    void submitEdit(editTarget.device.id, new FormData(event.currentTarget));
  }

  function onAssignSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (assignTarget === null) return;
    void submitAssign(assignTarget.device.id, new FormData(event.currentTarget));
  }

  function closeCreate(): void {
    setCreateOpen(false);
    setCreateError(null);
  }

  function closeEdit(): void {
    setEditTarget(null);
    setEditError(null);
  }

  function closeAssign(): void {
    setAssignTarget(null);
    setAssignError(null);
  }

  // AC-14: dismissing the confirmation performs nothing. Nothing has been written at this point —
  // the delete is the confirm control's, and it alone.
  function closeDelete(): void {
    setDeleteTarget(null);
    setDeleteError(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          data-testid="devices-create-open"
        >
          New device
        </Button>
      </div>

      {actionMessage !== null ? (
        <p data-testid="devices-action-error" className="text-sm text-accent">
          {actionMessage}
        </p>
      ) : null}

      <DataTable
        rows={rows}
        // Keyed by `assetTag`, not by device id. Ids are minted with `crypto.randomUUID()`, so a
        // test cannot address a row for a device it just created; `assetTag` is `@unique` in the
        // model and is a value the test supplies (02-design.md section 6).
        rowKey={(r) => r.device.assetTag}
        testIdPrefix="devices"
        emptyMessage="No devices yet. Create one to get started."
        columns={[
          {
            key: "tag",
            header: "Asset tag",
            mono: true,
            render: (r) => (
              <span data-testid={`devices-row-${r.device.assetTag}-tag`}>{r.device.assetTag}</span>
            ),
          },
          {
            key: "model",
            header: "Model",
            render: (r) => (
              <span data-testid={`devices-row-${r.device.assetTag}-model`}>{r.device.model}</span>
            ),
          },
          {
            key: "owner",
            header: "Owner",
            // F-3: `ownerId` is nullable and the seed holds one such device. No path in this ticket
            // clears an owner, but one already exists and AC-1 requires it to be displayed.
            render: (r) => (
              <span data-testid={`devices-row-${r.device.assetTag}-owner`}>
                {r.ownerName ?? "unowned"}
              </span>
            ),
          },
          {
            key: "seat",
            header: "Seat",
            mono: true,
            // INV-07: an unassigned device is a normal state, not a missing value.
            render: (r) => (
              <span data-testid={`devices-row-${r.device.assetTag}-seat`}>
                {r.seatCode ?? "unassigned"}
              </span>
            ),
          },
          {
            key: "rank",
            header: "Designation",
            // `n/a`, not `SECONDARY`, for an unassigned device. The DTO always holds a rank and an
            // unassigned device's is SECONDARY — but there is no such thing as a primary device
            // without a seat (AC-9), and by the same argument no such thing as a secondary one.
            // Rendering the stored value would make AC-2's "it is not shown as a primary device"
            // and AC-5's "it is shown as a secondary device" indistinguishable. Three values, three
            // states, one element.
            render: (r) =>
              r.device.seatId === null ? (
                <Badge tone="muted" data-testid={`devices-row-${r.device.assetTag}-rank`}>
                  n/a
                </Badge>
              ) : (
                <Badge
                  tone={r.device.rank === "PRIMARY" ? "accent" : "muted"}
                  data-testid={`devices-row-${r.device.assetTag}-rank`}
                >
                  {r.device.rank}
                </Badge>
              ),
          },
          {
            key: "occupant",
            header: "Seat occupant",
            // AC-1's occupant clause is not display polish: INV-05 makes a designation legal or
            // illegal by a fact about the seat, and this cell is where a person reads it.
            render: (r) => (
              <span data-testid={`devices-row-${r.device.assetTag}-occupant`}>
                {r.device.seatId === null ? "n/a" : (r.occupantName ?? "no occupant")}
              </span>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditError(null);
                    setEditTarget(r);
                  }}
                  data-testid={`devices-row-${r.device.assetTag}-edit`}
                >
                  Edit
                </Button>

                {/* Assign is hidden on an assigned device: no criterion requires re-assigning one
                    to be reachable, and a move is unassign then assign, which keeps each write on
                    exactly one criterion. */}
                {r.device.seatId === null ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setAssignError(null);
                      setAssignTarget(r);
                    }}
                    data-testid={`devices-row-${r.device.assetTag}-assign`}
                  >
                    Assign
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => void runUnassign(r.device.id)}
                    data-testid={`devices-row-${r.device.assetTag}-unassign`}
                  >
                    Unassign
                  </Button>
                )}

                {/* Rendered on EVERY row, including unassigned ones, and the asymmetry with Assign
                    is the design decision rather than an oversight. AC-9 requires attempting to
                    designate an unassigned device and being refused; hiding the control would make
                    the refusal unreachable through the UI and AC-9 untestable — the invariant would
                    appear to hold because the button was missing, and would stop holding the moment
                    any other caller reached the action. */}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => void runDesignate(r.device.id)}
                  data-testid={`devices-row-${r.device.assetTag}-primary`}
                >
                  Make primary
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(r);
                  }}
                  data-testid={`devices-row-${r.device.assetTag}-delete`}
                >
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
      />

      <EntityFormDialog
        open={createOpen}
        title="New device"
        submitLabel="Create device"
        onSubmit={onCreateSubmit}
        onClose={closeCreate}
        testIdPrefix="device-create"
        pending={pending}
      >
        <Field label="Asset tag" htmlFor="device-create-tag">
          <Input id="device-create-tag" name="assetTag" data-testid="device-create-tag" />
          <FieldError testId="device-create-tag-error" message={createFields.assetTag} />
        </Field>

        <Field label="Model" htmlFor="device-create-model">
          <Input id="device-create-model" name="model" data-testid="device-create-model" />
          <FieldError testId="device-create-model-error" message={createFields.model} />
        </Field>

        <Field label="Owner" htmlFor="device-create-owner">
          <Select id="device-create-owner" name="ownerId" defaultValue="" data-testid="device-create-owner">
            {/* The placeholder's empty value is part of the contract, not a rendering detail: it is
                how "no owner chosen" reaches the schema and is refused there (AC-3). */}
            <option value="">Select an owner</option>
            {memberOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </Select>
          <FieldError testId="device-create-owner-error" message={createFields.ownerId} />
        </Field>
      </EntityFormDialog>

      <EntityFormDialog
        open={editTarget !== null}
        title="Edit device"
        submitLabel="Save device"
        onSubmit={onEditSubmit}
        onClose={closeEdit}
        testIdPrefix="device-edit"
        pending={pending}
      >
        {/* The three controls remount when the target changes, so their defaults follow the row that
            was opened rather than the one opened first. */}
        <Field label="Asset tag" htmlFor="device-edit-tag">
          <Input
            id="device-edit-tag"
            name="assetTag"
            key={`tag-${editTarget?.device.id ?? "none"}`}
            defaultValue={editTarget?.device.assetTag ?? ""}
            data-testid="device-edit-tag"
          />
          <FieldError testId="device-edit-tag-error" message={editFields.assetTag} />
        </Field>

        <Field label="Model" htmlFor="device-edit-model">
          <Input
            id="device-edit-model"
            name="model"
            key={`model-${editTarget?.device.id ?? "none"}`}
            defaultValue={editTarget?.device.model ?? ""}
            data-testid="device-edit-model"
          />
          <FieldError testId="device-edit-model-error" message={editFields.model} />
        </Field>

        <Field label="Owner" htmlFor="device-edit-owner">
          <Select
            id="device-edit-owner"
            name="ownerId"
            key={`owner-${editTarget?.device.id ?? "none"}`}
            // An ownerless device opens on the placeholder. F-3: this surface can give it an owner
            // and cannot take one away, which is stated rather than hidden.
            defaultValue={editTarget?.device.ownerId ?? ""}
            data-testid="device-edit-owner"
          >
            <option value="">Select an owner</option>
            {memberOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </Select>
          {/* AC-11's INV-05 refusal arrives here, as `REFUSED` with field `ownerId`, because that
              criterion requires its message against the owner. */}
          <FieldError testId="device-edit-owner-error" message={editFields.ownerId} />
        </Field>
        {editLoose !== null ? <p className="text-sm text-accent">{editLoose}</p> : null}
      </EntityFormDialog>

      <EntityFormDialog
        open={assignTarget !== null}
        title="Assign device to a seat"
        submitLabel="Assign device"
        onSubmit={onAssignSubmit}
        onClose={closeAssign}
        testIdPrefix="device-assign"
        pending={pending}
      >
        <Field label="Seat" htmlFor="device-assign-seat">
          <Select
            id="device-assign-seat"
            name="seatId"
            key={`seat-${assignTarget?.device.id ?? "none"}`}
            defaultValue=""
            data-testid="device-assign-seat"
          >
            <option value="">Select a seat</option>
            {seatOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {seatOptionLabel(s)}
              </option>
            ))}
          </Select>
          <FieldError testId="device-assign-seat-error" message={assignFields.seatId} />
        </Field>
        {assignLoose !== null ? <p className="text-sm text-accent">{assignLoose}</p> : null}
      </EntityFormDialog>

      <Dialog
        open={deleteTarget !== null}
        title="Delete device"
        onClose={closeDelete}
        data-testid="device-delete-dialog"
      >
        <div className="space-y-4">
          <p data-testid="device-delete-message">
            {deleteTarget === null
              ? ""
              : deleteTarget.seatCode === null
                ? `Delete ${deleteTarget.device.assetTag} (${deleteTarget.device.model})? It is in inventory and assigned to no seat. This cannot be undone.`
                : `Delete ${deleteTarget.device.assetTag} (${deleteTarget.device.model})? It is removed from the seat it is assigned to, and if it is that seat's primary device the seat is left with none. The seat itself is not affected. This cannot be undone.`}
          </p>
          <p className="text-sm text-muted">
            Seat this device is assigned to:{" "}
            {/* A bare seat code, always, including when there is none — AC-12 and AC-13 are one
                element and the difference between them is the value. Parsing a seat code out of the
                sentence above would break on a wording change. */}
            <span className="code" data-testid="device-delete-seat">
              {deleteTarget?.seatCode ?? "none"}
            </span>
          </p>
          {deleteLoose !== null ? <p className="text-sm text-accent">{deleteLoose}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeDelete} data-testid="device-delete-cancel">
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (deleteTarget !== null) void submitDelete(deleteTarget.device.id);
              }}
              data-testid="device-delete-confirm"
            >
              Delete permanently
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
