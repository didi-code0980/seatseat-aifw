"use client";

// The interactive half of the room management screen (ROO-01).
//
// It keeps no copy of the room list. `rows` is a prop, every mutation calls `revalidatePath` on the
// server and `router.refresh()` here, and the server re-sends the list. A client-side copy would be
// a second source of truth for data the server already re-sends, and every action would have to
// update both (02-design.md section 7).

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, JSX, ReactNode } from "react";

import { createRoom, deleteRoom, renameRoom } from "@/actions/rooms";
import type { RoomActionError, RoomFieldName } from "@/actions/rooms";
import { DataTable } from "@/components/shared/DataTable";
import { EntityFormDialog } from "@/components/shared/EntityFormDialog";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import type { Room } from "@/lib/data";

export interface RoomRow {
  room: Room;
  /** Seats that a delete would destroy. Read at render; see 02-design.md section 7 on staleness. */
  seatCount: number;
}

/** The four form fields the contract names. `id` never reaches a field and never renders an error. */
function fieldMessages(error: RoomActionError | null): Partial<Record<RoomFieldName, string>> {
  if (error === null) return {};
  return error.kind === "NOT_FOUND" ? {} : error.fields;
}

function notFoundMessage(error: RoomActionError | null): string | null {
  return error !== null && error.kind === "NOT_FOUND" ? error.message : null;
}

/**
 * An error element exists only while its field is rejected. AC-3 wants a message against *each*
 * offending field, so two blank inputs render two of these — which is why absence is the resting
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

export function RoomsManager({ rows }: { rows: RoomRow[] }): JSX.Element {
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Room | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoomRow | null>(null);

  const [pending, setPending] = useState(false);
  const [createError, setCreateError] = useState<RoomActionError | null>(null);
  const [editError, setEditError] = useState<RoomActionError | null>(null);
  const [deleteError, setDeleteError] = useState<RoomActionError | null>(null);

  const createFields = fieldMessages(createError);
  const editFields = fieldMessages(editError);

  async function submitCreate(data: FormData): Promise<void> {
    setPending(true);
    // `Number(...)` here rather than `z.coerce.number()` in the schema — see the note in
    // `src/lib/validation/room.ts`. A number input hands back a string either way.
    const result = await createRoom({
      name: String(data.get("name") ?? ""),
      code: String(data.get("code") ?? ""),
      gridWidth: Number(data.get("gridWidth") ?? ""),
      gridHeight: Number(data.get("gridHeight") ?? ""),
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

  async function submitRename(id: string, data: FormData): Promise<void> {
    setPending(true);
    const result = await renameRoom({ id, name: String(data.get("name") ?? "") });
    setPending(false);

    if (!result.ok) {
      setEditError(result.error);
      return;
    }

    setEditError(null);
    setEditTarget(null);
    router.refresh();
  }

  async function submitDelete(id: string): Promise<void> {
    setPending(true);
    const result = await deleteRoom({ id });
    setPending(false);

    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }

    setDeleteError(null);
    setDeleteTarget(null);
    router.refresh();
  }

  function onCreateSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    // Read before the await: `event.currentTarget` is null by the time the action resolves.
    void submitCreate(new FormData(event.currentTarget));
  }

  function onRenameSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (editTarget === null) return;
    void submitRename(editTarget.id, new FormData(event.currentTarget));
  }

  function closeCreate(): void {
    setCreateOpen(false);
    setCreateError(null);
  }

  function closeEdit(): void {
    setEditTarget(null);
    setEditError(null);
  }

  // AC-7: dismissing the confirmation performs nothing. Nothing has been written at this point —
  // the delete is the confirm control's, and it alone.
  function closeDelete(): void {
    setDeleteTarget(null);
    setDeleteError(null);
  }

  const deleteNotFound = notFoundMessage(deleteError);
  const editNotFound = notFoundMessage(editError);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          data-testid="rooms-create-open"
        >
          New room
        </Button>
      </div>

      <DataTable
        rows={rows}
        // Keyed by `code`, not by `id`. Ids are minted with `crypto.randomUUID()`, so a test that
        // creates a room cannot predict one; `code` is unique in the model and is a value the test
        // supplies (02-design.md section 6).
        rowKey={(r) => r.room.code}
        testIdPrefix="rooms"
        emptyMessage="No rooms yet. Create one to get started."
        columns={[
          {
            key: "code",
            header: "Code",
            mono: true,
            render: (r) => <span data-testid={`rooms-row-${r.room.code}-code`}>{r.room.code}</span>,
          },
          {
            key: "name",
            header: "Name",
            render: (r) => <span data-testid={`rooms-row-${r.room.code}-name`}>{r.room.name}</span>,
          },
          {
            key: "grid",
            header: "Grid",
            mono: true,
            render: (r) => (
              <span data-testid={`rooms-row-${r.room.code}-grid`}>
                {r.room.gridWidth} x {r.room.gridHeight}
              </span>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditError(null);
                    setEditTarget(r.room);
                  }}
                  data-testid={`rooms-row-${r.room.code}-edit`}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(r);
                  }}
                  data-testid={`rooms-row-${r.room.code}-delete`}
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
        title="New room"
        submitLabel="Create room"
        onSubmit={onCreateSubmit}
        onClose={closeCreate}
        testIdPrefix="room-create"
        pending={pending}
      >
        <Field label="Name" htmlFor="room-create-name">
          <Input id="room-create-name" name="name" data-testid="room-create-name" />
          <FieldError testId="room-create-name-error" message={createFields.name} />
        </Field>

        <Field label="Code" htmlFor="room-create-code">
          <Input id="room-create-code" name="code" data-testid="room-create-code" />
          <FieldError testId="room-create-code-error" message={createFields.code} />
        </Field>

        <Field label="Grid width" htmlFor="room-create-grid-width">
          <Input id="room-create-grid-width" name="gridWidth" type="number" data-testid="room-create-grid-width" />
          <FieldError testId="room-create-grid-width-error" message={createFields.gridWidth} />
        </Field>

        <Field label="Grid height" htmlFor="room-create-grid-height">
          <Input id="room-create-grid-height" name="gridHeight" type="number" data-testid="room-create-grid-height" />
          <FieldError testId="room-create-grid-height-error" message={createFields.gridHeight} />
        </Field>
      </EntityFormDialog>

      <EntityFormDialog
        open={editTarget !== null}
        title="Rename room"
        submitLabel="Save name"
        onSubmit={onRenameSubmit}
        onClose={closeEdit}
        testIdPrefix="room-edit"
        pending={pending}
      >
        <Field label="Name" htmlFor="room-edit-name">
          <Input
            id="room-edit-name"
            name="name"
            // Remounts when the target changes, so the default value follows the row that was
            // opened rather than the one opened first.
            key={editTarget?.id ?? "none"}
            defaultValue={editTarget?.name ?? ""}
            data-testid="room-edit-name"
          />
          <FieldError testId="room-edit-name-error" message={editFields.name} />
        </Field>
        {editNotFound !== null ? <p className="text-sm text-accent">{editNotFound}</p> : null}
      </EntityFormDialog>

      <Dialog
        open={deleteTarget !== null}
        title="Delete room"
        onClose={closeDelete}
        data-testid="room-delete-dialog"
      >
        <div className="space-y-4">
          <p data-testid="room-delete-message">
            {deleteTarget === null
              ? ""
              : deleteTarget.seatCount === 0
                ? `Delete ${deleteTarget.room.name} (${deleteTarget.room.code})? It contains no seats, so no seats will be lost. This cannot be undone.`
                : `Delete ${deleteTarget.room.name} (${deleteTarget.room.code})? Every seat it contains is permanently deleted with it. This cannot be undone.`}
          </p>
          <p className="text-sm text-muted">
            Seats that will be permanently lost:{" "}
            {/* INV-11. A bare integer, always, including 0 — AC-5 and AC-6 are one element and the
                difference between them is the value. Parsing a number out of the sentence above
                would break on a wording change. The figure is `countSeatsInRoom`'s, not one this
                component computed. */}
            <span className="code" data-testid="room-delete-seat-count">
              {deleteTarget?.seatCount ?? 0}
            </span>
          </p>
          {deleteNotFound !== null ? <p className="text-sm text-accent">{deleteNotFound}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeDelete} data-testid="room-delete-cancel">
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (deleteTarget !== null) void submitDelete(deleteTarget.room.id);
              }}
              data-testid="room-delete-confirm"
            >
              Delete permanently
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
