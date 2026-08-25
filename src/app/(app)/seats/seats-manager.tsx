"use client";

// The interactive half of the seat occupancy screen (SEA-01).
//
// It keeps no copy of the seat list. `rows` is a prop, every mutation calls `revalidatePath` on the
// server and `router.refresh()` here, and the server re-sends the list. A client-side copy would be a
// second source of truth for data the server already re-sends — and on this surface it would also be
// a cached seat status, which is exactly what INV-03 forbids.
//
// Nothing here gates a control on a role, and that is the specified state rather than an omission:
// `PermissionGate` is not imported and `can()` is not called, because a control wrapped in a gate fed
// a hard-coded role renders a surface that looks guarded and is not (02-design.md section 2).

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, JSX, ReactNode } from "react";

import type { OccupantOption, SeatRow } from "./page";
import { assignSeat, releaseSeat } from "@/actions/seats";
import type { SeatActionError, SeatFieldName } from "@/actions/seats";
import { DataTable } from "@/components/shared/DataTable";
import { EntityFormDialog } from "@/components/shared/EntityFormDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
// INV-03, and 02-design.md 1.5 rule 3: the status cell is derived on every render and never held in
// state. `deriveSeatStatus` is the single shared derivation both seam implementations re-export
// (`src/lib/data/derive.ts`), so calling it here cannot drift from what the seam returns. It reaches
// no data — it takes the `Seat` this component was already handed — so it is not a seam bypass; see
// 03-impl-log.md, Deviations.
import { deriveSeatStatus } from "@/lib/data/derive";

/**
 * The fields a form collects. `VALIDATION` arrives as a field map; `REFUSED` becomes one when it
 * names a field, which is the `MEMBER_NOT_FOUND` refusal and only that — the value the user supplied
 * is the one that went stale. `REFUSED` with no field belongs to no control and renders loose.
 */
function fieldMessages(error: SeatActionError | null): Partial<Record<SeatFieldName, string>> {
  if (error === null) return {};
  if (error.kind === "VALIDATION") return error.fields;
  if (error.kind === "REFUSED" && error.field !== null) {
    const fields: Partial<Record<SeatFieldName, string>> = {};
    fields[error.field] = error.message;
    return fields;
  }
  return {};
}

/** A message that belongs to no field: a refused row action, or a row that is already gone. */
function looseMessage(error: SeatActionError | null): string | null {
  if (error === null) return null;
  if (error.kind === "NOT_FOUND") return error.message;
  if (error.kind === "REFUSED" && error.field === null) return error.message;
  return null;
}

/**
 * An error element exists only while its field is rejected, which is why absence is the resting state
 * rather than an empty element that is always present. AC-9 asserts the element appears.
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

export function SeatsManager({
  rows,
  occupantOptions,
}: {
  rows: SeatRow[];
  occupantOptions: OccupantOption[];
}): JSX.Element {
  const router = useRouter();

  const [assignTarget, setAssignTarget] = useState<SeatRow | null>(null);
  const [pending, setPending] = useState(false);
  const [assignError, setAssignError] = useState<SeatActionError | null>(null);
  // AC-8: a refused row action has no form open to render against. Absent until one is refused,
  // which is why it is null rather than "".
  const [actionError, setActionError] = useState<SeatActionError | null>(null);

  const assignFields = fieldMessages(assignError);
  const assignLoose = looseMessage(assignError);
  const actionMessage = looseMessage(actionError);

  async function submitAssign(seatId: string, data: FormData): Promise<void> {
    setPending(true);
    // The occupant select's placeholder carries `value=""`, so an unmade choice arrives as the empty
    // string and is refused by `occupantIdSchema` (AC-9). No `required` attribute is relied on.
    const result = await assignSeat({ seatId, occupantId: String(data.get("occupantId") ?? "") });
    setPending(false);

    if (!result.ok) {
      setAssignError(result.error);
      return;
    }

    setAssignError(null);
    setAssignTarget(null);
    // AC-2: the status shows the seat occupied without a reload. `revalidatePath` invalidated the
    // server's copy; this is what makes the page re-render against it.
    router.refresh();
  }

  /**
   * AC-5. A bare row control with no confirmation dialog: no criterion asks for one, and INV-06 asks
   * for a downgrade rather than a warning — it destroys nothing and is reversible from `/devices`
   * (02-design.md 1.5 rule 5, and section 7 alternative B). Its refusal has nowhere to render but the
   * page-level region.
   */
  async function runRelease(seatId: string): Promise<void> {
    setPending(true);
    const result = await releaseSeat({ seatId });
    setPending(false);
    setActionError(result.ok ? null : result.error);
    if (result.ok) router.refresh();
  }

  function onAssignSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (assignTarget === null) return;
    // Read before the await: `event.currentTarget` is null by the time the action resolves.
    void submitAssign(assignTarget.seat.id, new FormData(event.currentTarget));
  }

  function closeAssign(): void {
    setAssignTarget(null);
    setAssignError(null);
  }

  return (
    <div className="space-y-4">
      {actionMessage !== null ? (
        <p data-testid="seats-action-error" className="text-sm text-accent">
          {actionMessage}
        </p>
      ) : null}

      <DataTable
        rows={rows}
        // Keyed by seat `code`, not by seat id. Ids are `@default(cuid())` under Prisma, so a testid
        // built from one is unaddressable the moment `DATA_SOURCE=prisma`; `Seat.code` is `@unique`
        // (prisma/schema.prisma:73) and is the identifier this surface displays, which is what AC-1
        // means by "the seat identifier the surface displays" (02-design.md section 6).
        rowKey={(r) => r.seat.code}
        testIdPrefix="seats"
        emptyMessage="No seats yet."
        columns={[
          {
            key: "code",
            header: "Code",
            mono: true,
            render: (r) => <span data-testid={`seats-row-${r.seat.code}-code`}>{r.seat.code}</span>,
          },
          {
            key: "room",
            header: "Room",
            mono: true,
            // The room's `code`, not its id — F-2 carries the room as a column, and an id is not
            // addressable across the seam swap.
            render: (r) => <span data-testid={`seats-row-${r.seat.code}-room`}>{r.roomCode}</span>,
          },
          {
            key: "ports",
            header: "Ports",
            mono: true,
            // A port belongs to a seat and is part of that seat's fixed physical description; it does
            // not move when an occupant changes (01-story.md out-of-scope item 2). Read-only here.
            render: (r) => (
              <span data-testid={`seats-row-${r.seat.code}-ports`}>
                {r.seat.ports.map((p) => p.portCode).join(", ")}
              </span>
            ),
          },
          {
            key: "occupant",
            header: "Occupant",
            // AC-1: a seat with no occupant is shown as having none. The literal is the value, not an
            // empty cell — an empty cell is indistinguishable from a cell that failed to render.
            render: (r) => (
              <span data-testid={`seats-row-${r.seat.code}-occupant`}>
                {r.occupantName ?? "no occupant"}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            // INV-03, AC-10. One element, three-way readable against the occupant cell beside it:
            // derived from `occupantId` on every render, never stored and never cached. There is no
            // separate OCCUPIED/VACANT element, which is what makes AC-10's three-write sequence
            // assertable as a sequence rather than as three unrelated states.
            render: (r) => (
              <Badge
                tone={deriveSeatStatus(r.seat) === "OCCUPIED" ? "accent" : "muted"}
                data-testid={`seats-row-${r.seat.code}-status`}
              >
                {deriveSeatStatus(r.seat)}
              </Badge>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <div className="flex flex-wrap justify-end gap-2">
                {/* AC-1, and 02-design.md 1.5 rule 1: Assign is present only on a seat with no
                    occupant and Release only on a seat that has one. AC-3 and AC-8 are consequently
                    unreachable through this UI, which is correct — the refusal belongs to the
                    operation, not to the absence of a control, and both are verified at the seam. */}
                {r.seat.occupantId === null ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setAssignError(null);
                      setAssignTarget(r);
                    }}
                    data-testid={`seats-row-${r.seat.code}-assign`}
                  >
                    Assign
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => void runRelease(r.seat.id)}
                    data-testid={`seats-row-${r.seat.code}-release`}
                  >
                    Release
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />

      <EntityFormDialog
        open={assignTarget !== null}
        title="Assign an occupant"
        submitLabel="Assign occupant"
        onSubmit={onAssignSubmit}
        onClose={closeAssign}
        testIdPrefix="seat-assign"
        pending={pending}
      >
        <p className="text-sm text-muted">
          Seat:{" "}
          {/* A bare seat code, so the dialog's subject is readable without parsing a sentence that a
              wording change would break. */}
          <span className="code" data-testid="seat-assign-seat">
            {assignTarget?.seat.code ?? ""}
          </span>
        </p>

        <Field label="Occupant" htmlFor="seat-assign-occupant">
          <Select
            id="seat-assign-occupant"
            name="occupantId"
            // The control remounts when the target changes, so it opens on the placeholder for each
            // seat rather than keeping the choice made for the seat opened before it.
            key={`occupant-${assignTarget?.seat.id ?? "none"}`}
            defaultValue=""
            data-testid="seat-assign-occupant"
          >
            {/* The placeholder's empty value is part of the contract, not a rendering detail: it is
                how "no member chosen" reaches the schema and is refused there (AC-9). */}
            <option value="">Select an occupant</option>
            {occupantOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </Select>
          {/* AC-9's validation message, and the `MEMBER_NOT_FOUND` refusal, which is the one refusal
              that is a fact about the value the user supplied. */}
          <FieldError testId="seat-assign-occupant-error" message={assignFields.occupantId} />
        </Field>
        {assignLoose !== null ? <p className="text-sm text-accent">{assignLoose}</p> : null}
      </EntityFormDialog>
    </div>
  );
}
