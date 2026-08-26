"use client";

// The interactive half of the member management screen (MEM-01).
//
// It keeps no copy of the member list. `rows` is a prop, every mutation calls `revalidatePath` on
// the server and `router.refresh()` here, and the server re-sends the list. A client-side copy would
// be a second source of truth for data the server already re-sends.
//
// Nothing here gates a control on a role, and that is the specified state rather than an omission:
// `PermissionGate` is not imported and `can()` is not called, because a control wrapped in a gate
// fed a hard-coded role renders a surface that looks guarded and is not (02-design.md section 2).
// On this surface that gap is the sharpest in the system — it is where the role every rank
// comparison is made against is written — and 01-story.md says so in terms.

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, JSX, ReactNode } from "react";

import type { GroupOption, MemberRow } from "./page";
import {
  assignMemberToGroup,
  createMember,
  deleteMember,
  getMemberReferences,
  updateMember,
} from "@/actions/members";
import type { MemberActionError, MemberFieldName } from "@/actions/members";
import { DataTable } from "@/components/shared/DataTable";
import { EntityFormDialog } from "@/components/shared/EntityFormDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { MemberReferences, Role } from "@/lib/data";

/**
 * The role select's options, in `ROLE_RANK` order (`rbac-and-security.md`: USER < MANAGER < ADMIN).
 * Option value and label are both the role string; the placeholder's value is "" and is what makes
 * AC-3's and AC-7's "no role chosen" reachable and refusable at the schema.
 */
const ROLE_OPTIONS: readonly Role[] = ["USER", "MANAGER", "ADMIN"];

/** The literal a cell renders when a member occupies no seat — AC-1's "or that they occupy none". */
const NO_SEATS = "none";

/**
 * GRP-02, AC-2. The literal the group cell renders for a member who belongs to no group.
 *
 * The same spelling MEM-01 uses for a member occupying no seat and GRP-01 uses for a group with no
 * parent. It satisfies AC-2's "distinguishable from a group whose name is blank" because
 * `groupNameSchema` makes a blank name unreachable — which AC-2 says itself.
 */
const NO_GROUP = "none";

/** GRP-02. The assign chooser's placeholder. Its `value=""` carries "no group chosen" to the schema. */
const SELECT_A_GROUP_LABEL = "Select a group";

/**
 * The fields a form collects. `VALIDATION` and `DUPLICATE_EMAIL` both arrive as a field map.
 * `REFERENCED` never does: it has two assertable facts inside it and renders structurally, in the
 * refusal dialog, rather than as a sentence against a field (02-design.md section 1.4).
 */
function fieldMessages(error: MemberActionError | null): Partial<Record<MemberFieldName, string>> {
  if (error === null) return {};
  if (error.kind === "VALIDATION" || error.kind === "DUPLICATE_EMAIL") return error.fields;
  // GRP-02, AC-6. A refusal about the group the person chose, rendered against the control they
  // chose it in — the third field-carrying kind, and it joins the two above for their reason.
  if (error.kind === "GROUP_NOT_FOUND") return error.fields;
  return {};
}

/** A message that belongs to no field: a member that is already gone. */
function looseMessage(error: MemberActionError | null): string | null {
  if (error === null) return null;
  if (error.kind === "NOT_FOUND") return error.message;
  return null;
}

/** AC-1, AC-10: seat codes comma-separated and sorted, or the literal `none`. One rendering, two places. */
function seatCodeList(codes: string[]): string {
  return codes.length === 0 ? NO_SEATS : codes.join(", ");
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

/** What the refusal dialog was opened about: the row, and the two halves that blocked the delete. */
interface RefusedTarget {
  row: MemberRow;
  references: MemberReferences;
}

export function MembersManager({
  rows,
  groupOptions,
}: {
  rows: MemberRow[];
  // GRP-02, AC-5. Composed by the server component from `listGroups()`; this component never reads
  // the seam and never derives a path of its own.
  groupOptions: GroupOption[];
}): JSX.Element {
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MemberRow | null>(null);
  const [assignTarget, setAssignTarget] = useState<MemberRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberRow | null>(null);
  const [refusedTarget, setRefusedTarget] = useState<RefusedTarget | null>(null);

  const [pending, setPending] = useState(false);
  const [createError, setCreateError] = useState<MemberActionError | null>(null);
  const [editError, setEditError] = useState<MemberActionError | null>(null);
  const [assignError, setAssignError] = useState<MemberActionError | null>(null);
  const [deleteError, setDeleteError] = useState<MemberActionError | null>(null);
  // A refused row action has no form open to render against. Absent until one is refused, which is
  // why it is null rather than "".
  const [actionError, setActionError] = useState<MemberActionError | null>(null);

  const createFields = fieldMessages(createError);
  const editFields = fieldMessages(editError);
  const assignFields = fieldMessages(assignError);

  const editLoose = looseMessage(editError);
  const assignLoose = looseMessage(assignError);
  const deleteLoose = looseMessage(deleteError);
  const actionMessage = looseMessage(actionError);

  async function submitCreate(data: FormData): Promise<void> {
    setPending(true);
    const result = await createMember({
      fullName: String(data.get("fullName") ?? ""),
      email: String(data.get("email") ?? ""),
      // The role select's placeholder carries `value=""`, so an unmade choice arrives as the empty
      // string and is refused by `memberRoleSchema`. No `required` attribute is relied on: that is a
      // browser affordance and the server action is a network boundary.
      role: String(data.get("role") ?? ""),
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
    const result = await updateMember({
      id,
      fullName: String(data.get("fullName") ?? ""),
      email: String(data.get("email") ?? ""),
      role: String(data.get("role") ?? ""),
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

  /**
   * GRP-02, AC-3, AC-4, AC-6. `submitEdit`'s shape exactly.
   *
   * The chooser's placeholder carries `value=""`, so an unmade choice arrives as the empty string
   * and is refused by `memberGroupIdSchema` with *A group is required.* **It is not an
   * unassignment** — no control here can remove a member from a group, and the mechanism is the
   * type rather than a check (02-design.md F-4).
   */
  async function submitAssign(id: string, data: FormData): Promise<void> {
    setPending(true);
    const result = await assignMemberToGroup({
      id,
      groupId: String(data.get("groupId") ?? ""),
    });
    setPending(false);

    if (!result.ok) {
      setAssignError(result.error);
      return;
    }

    setAssignError(null);
    setAssignTarget(null);
    // AC-3's and AC-4's "without a manual reload". `revalidatePath` invalidated the server's copy;
    // this is what makes the page re-render against it.
    router.refresh();
  }

  /**
   * AC-10's "the refusal is raised at the point of request", implemented literally. The branch is
   * chosen before anything is confirmed: a member who cannot be deleted is never asked to confirm
   * something that will not happen.
   *
   * The read decides which dialog opens. It is not the enforcement — `deleteMember` in the seam
   * computes the same two halves itself, so a caller reaching the action directly is refused too
   * (02-design.md section 3.1).
   */
  async function requestDelete(row: MemberRow): Promise<void> {
    setActionError(null);
    setDeleteError(null);
    setPending(true);
    const result = await getMemberReferences({ id: row.member.id });
    setPending(false);

    if (!result.ok) {
      setActionError(result.error);
      return;
    }

    const references = result.data;
    if (references.occupiedSeatCodes.length > 0 || references.ownedDeviceCount > 0) {
      setRefusedTarget({ row, references });
      return;
    }
    setDeleteTarget(row);
  }

  async function submitDelete(row: MemberRow): Promise<void> {
    setPending(true);
    const result = await deleteMember({ id: row.member.id });
    setPending(false);

    if (!result.ok) {
      // The seam refused after the read said it would not. Nothing was written, and the honest
      // presentation is the refusal dialog the read would have opened — not a sentence inside a
      // confirmation for a delete that did not happen.
      if (result.error.kind === "REFERENCED") {
        setDeleteTarget(null);
        setRefusedTarget({ row, references: result.error.references });
        return;
      }
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

  function onEditSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (editTarget === null) return;
    void submitEdit(editTarget.member.id, new FormData(event.currentTarget));
  }

  function onAssignSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (assignTarget === null) return;
    void submitAssign(assignTarget.member.id, new FormData(event.currentTarget));
  }

  function closeCreate(): void {
    setCreateOpen(false);
    setCreateError(null);
  }

  function closeEdit(): void {
    setEditTarget(null);
    setEditError(null);
  }

  // AC-8, AC-10, AC-11: dismissing the assign dialog writes nothing. The assignment is the submit
  // control's, and it alone.
  function closeAssign(): void {
    setAssignTarget(null);
    setAssignError(null);
  }

  // AC-8: dismissing the confirmation performs nothing. Nothing has been written at this point —
  // the delete is the confirm control's, and it alone.
  function closeDelete(): void {
    setDeleteTarget(null);
    setDeleteError(null);
  }

  // AC-10, AC-11: the refusal dialog has no confirm control, because there is nothing to confirm.
  function closeRefused(): void {
    setRefusedTarget(null);
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
          data-testid="members-create-open"
        >
          New member
        </Button>
      </div>

      {actionMessage !== null ? (
        <p data-testid="members-action-error" className="text-sm text-accent">
          {actionMessage}
        </p>
      ) : null}

      <DataTable
        rows={rows}
        // Keyed by `email`, not by member id. Ids are minted with `crypto.randomUUID()`, so a test
        // cannot address a row for a member it just created; `email` is `@unique` in the model and
        // is a value the test supplies (02-design.md section 6). The key is the address exactly as
        // stored — `memberEmailSchema` trims but does not lowercase.
        rowKey={(r) => r.member.email}
        testIdPrefix="members"
        emptyMessage="No members yet. Create one to get started."
        columns={[
          {
            key: "name",
            header: "Name",
            render: (r) => (
              <span data-testid={`members-row-${r.member.email}-name`}>{r.member.fullName}</span>
            ),
          },
          {
            key: "email",
            header: "Email",
            mono: true,
            render: (r) => (
              <span data-testid={`members-row-${r.member.email}-email`}>{r.member.email}</span>
            ),
          },
          {
            key: "role",
            header: "Role",
            // Exactly the stored value. AC-2 and AC-6 assert the role by name, so nothing is
            // prettified here — `USER`, `MANAGER` or `ADMIN`, as recorded.
            render: (r) => (
              <Badge
                tone={r.member.role === "ADMIN" ? "accent" : "neutral"}
                data-testid={`members-row-${r.member.email}-role`}
              >
                {r.member.role}
              </Badge>
            ),
          },
          {
            key: "group",
            header: "Group",
            // GRP-02, AC-1 and AC-2. The group's NAME, bare — the value in its own element with the
            // label in the header — so AC-1's "shows Platform" and AC-2's empty state are assertable
            // without parsing a sentence. MEM-01 dropped this column because it rendered a raw id;
            // the resolution to a name happens in the server component (page.tsx).
            render: (r) => (
              <span data-testid={`members-row-${r.member.email}-group`}>
                {r.groupName ?? NO_GROUP}
              </span>
            ),
          },
          {
            key: "seats",
            header: "Seats occupied",
            mono: true,
            // AC-1's occupancy clause is not display polish: deleting a member is refused by INV-12
            // on exactly this fact, and this cell is where a person reads it before they try.
            render: (r) => (
              <span data-testid={`members-row-${r.member.email}-seats`}>
                {seatCodeList(r.occupiedSeatCodes)}
              </span>
            ),
          },
          {
            key: "signin",
            header: "Sign-in",
            // AC-4, INV-08. A standing fact about every row rather than a sentence that vanishes
            // with the create dialog: every member this surface creates reads `no account`, and the
            // seeded members read `account`, which is what makes the assertion informative rather
            // than trivially true of every row.
            render: (r) => (
              <span data-testid={`members-row-${r.member.email}-signin`}>
                {r.hasAccount ? "account" : "no account"}
              </span>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            // Edit and Delete on every row, unconditionally. No control is hidden by state on this
            // surface: the only state-dependent behaviour is which delete dialog opens, and that is
            // decided by the seam rather than by the presence of a button. Hiding Delete on a member
            // who cannot be deleted would make AC-10 and AC-11 unreachable through the UI, and the
            // invariant would appear to hold because the button was missing.
            render: (r) => (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditError(null);
                    setEditTarget(r);
                  }}
                  data-testid={`members-row-${r.member.email}-edit`}
                >
                  Edit
                </Button>
                {/* GRP-02, AC-3 to AC-6. Unconditional, like Edit and Delete beside it: not hidden
                    for a member who already has a group — that member is AC-4's subject — and not
                    hidden when no group exists, because hiding a control makes the state that
                    produced it untestable. The empty case is handled inside the dialog. */}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setAssignError(null);
                    setAssignTarget(r);
                  }}
                  data-testid={`members-row-${r.member.email}-assign`}
                >
                  Assign group
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={pending}
                  onClick={() => void requestDelete(r)}
                  data-testid={`members-row-${r.member.email}-delete`}
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
        title="New member"
        submitLabel="Create member"
        onSubmit={onCreateSubmit}
        onClose={closeCreate}
        testIdPrefix="member-create"
        pending={pending}
      >
        <Field label="Full name" htmlFor="member-create-name">
          <Input id="member-create-name" name="fullName" data-testid="member-create-name" />
          <FieldError testId="member-create-name-error" message={createFields.fullName} />
        </Field>

        <Field label="Email" htmlFor="member-create-email">
          <Input id="member-create-email" name="email" data-testid="member-create-email" />
          <FieldError testId="member-create-email-error" message={createFields.email} />
        </Field>

        <Field label="Role" htmlFor="member-create-role">
          <Select id="member-create-role" name="role" defaultValue="" data-testid="member-create-role">
            {/* The placeholder's empty value is part of the contract, not a rendering detail: it is
                how "no role chosen" reaches the schema and is refused there (AC-3). */}
            <option value="">Select a role</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
          <FieldError testId="member-create-role-error" message={createFields.role} />
        </Field>

        {/* AC-4, INV-08. The form offers no password, no credential and no control that grants a
            sign-in, and this states that rather than leaving it to be inferred from an absence.
            There is no code path from this dialog to an Account row — creating one belongs to the
            AUT group (01-story.md out-of-scope item 2). */}
        <p data-testid="member-create-no-account" className="text-sm text-muted">
          This creates a member record only. No sign-in account is created and no password is set —
          a member who cannot sign in is a normal state, not a half-built one.
        </p>
      </EntityFormDialog>

      <EntityFormDialog
        open={editTarget !== null}
        title="Edit member"
        submitLabel="Save member"
        onSubmit={onEditSubmit}
        onClose={closeEdit}
        testIdPrefix="member-edit"
        pending={pending}
      >
        {/* The three controls remount when the target changes, so their defaults follow the row that
            was opened rather than the one opened first. */}
        <Field label="Full name" htmlFor="member-edit-name">
          <Input
            id="member-edit-name"
            name="fullName"
            key={`name-${editTarget?.member.id ?? "none"}`}
            defaultValue={editTarget?.member.fullName ?? ""}
            data-testid="member-edit-name"
          />
          <FieldError testId="member-edit-name-error" message={editFields.fullName} />
        </Field>

        <Field label="Email" htmlFor="member-edit-email">
          <Input
            id="member-edit-email"
            name="email"
            key={`email-${editTarget?.member.id ?? "none"}`}
            defaultValue={editTarget?.member.email ?? ""}
            data-testid="member-edit-email"
          />
          <FieldError testId="member-edit-email-error" message={editFields.email} />
        </Field>

        <Field label="Role" htmlFor="member-edit-role">
          <Select
            id="member-edit-role"
            name="role"
            key={`role-${editTarget?.member.id ?? "none"}`}
            defaultValue={editTarget?.member.role ?? ""}
            data-testid="member-edit-role"
          >
            {/* The same empty placeholder as create, and it is not an oversight: AC-7 refuses an edit
                submitted with no role selected, and that state is unreachable if the edit select has
                no empty option. A refusal the UI makes unreachable is a refusal that is never tested
                and stops holding the moment another caller arrives. */}
            <option value="">Select a role</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
          <FieldError testId="member-edit-role-error" message={editFields.role} />
        </Field>
        {editLoose !== null ? <p className="text-sm text-accent">{editLoose}</p> : null}
      </EntityFormDialog>

      {/* GRP-02, AC-3 to AC-7. One control: the group chooser. Nothing else about the member is on
          this form, which is what makes AC-8 a claim about the operation rather than about which
          fields the person happened not to touch. */}
      <EntityFormDialog
        open={assignTarget !== null}
        title="Assign group"
        submitLabel="Assign group"
        onSubmit={onAssignSubmit}
        onClose={closeAssign}
        testIdPrefix="member-assign"
        pending={pending}
      >
        <Field label="Group" htmlFor="member-assign-group">
          <Select
            id="member-assign-group"
            name="groupId"
            // Keyed on the member's id so the control remounts when the target row changes and its
            // default follows the row that was opened rather than the one opened first.
            key={`group-${assignTarget?.member.id ?? "none"}`}
            defaultValue={assignTarget?.member.groupId ?? ""}
            data-testid="member-assign-group"
          >
            {/* The placeholder is always rendered and its empty value is part of the contract: an
                unmade choice arrives as "" and is refused by `memberGroupIdSchema` with *A group is
                required.* It is NOT an unassignment — `assignMemberToGroup` takes `groupId: string`
                and cannot express one (02-design.md F-4). */}
            <option value="">{SELECT_A_GROUP_LABEL}</option>
            {/* AC-5. Every group in the tree, by full path, and nothing is filtered out: the
                member's current group stays in the list, and choosing it is the successful no-op
                F-5 describes. Paths and not bare names, because two groups may share a name under
                different parents (GRP-01 AC-4b). */}
            {groupOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.path}
              </option>
            ))}
          </Select>
          <FieldError testId="member-assign-group-error" message={assignFields.groupId} />
        </Field>

        {/* Rendered only when no group exists at all. The control that opened this dialog is still
            shown on every row in that state, so the sentence has to be here rather than in place of
            a button that was hidden. Submitting is refused by the schema either way. */}
        {groupOptions.length === 0 ? (
          <p data-testid="member-assign-empty" className="text-sm text-muted">
            No group exists yet. Create one on the Groups screen, then assign this member to it.
          </p>
        ) : null}

        {assignLoose !== null ? (
          <p data-testid="member-assign-error" className="text-sm text-accent">
            {assignLoose}
          </p>
        ) : null}
      </EntityFormDialog>

      <Dialog
        open={deleteTarget !== null}
        title="Delete member"
        onClose={closeDelete}
        data-testid="member-delete-dialog"
      >
        <div className="space-y-4">
          {/* Opens only for a member who can be deleted, so this sentence never has to hedge. */}
          <p data-testid="member-delete-message">
            {deleteTarget === null
              ? ""
              : `Delete ${deleteTarget.member.fullName} (${deleteTarget.member.email})? They occupy no seat and own no device. This cannot be undone.`}
          </p>
          {deleteLoose !== null ? <p className="text-sm text-accent">{deleteLoose}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeDelete} data-testid="member-delete-cancel">
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (deleteTarget !== null) void submitDelete(deleteTarget);
              }}
              data-testid="member-delete-confirm"
            >
              Delete permanently
            </Button>
          </div>
        </div>
      </Dialog>

      {/* INV-12, ADR-005. The refusal dialog, opened instead of the confirmation. It has no confirm
          control because there is nothing to confirm — only a dismiss. */}
      <Dialog
        open={refusedTarget !== null}
        title="This member cannot be deleted"
        onClose={closeRefused}
        data-testid="member-delete-refused-dialog"
      >
        <div className="space-y-4">
          <p data-testid="member-delete-refused-message">
            {refusedTarget === null
              ? ""
              : `${refusedTarget.row.member.fullName} (${refusedTarget.row.member.email}) cannot be deleted while anything still refers to them. Release the seats they occupy and reassign the devices they own, then delete them.`}
          </p>
          {/* Each fact in its own element, and rendered bare — including when empty. AC-10 asserts
              the seats are named and AC-11 asserts the count is stated, and the two must fail
              independently: AC-11's Given holds occupancy at zero, so `-seats` reads `none` there
              while `-devices` reads a positive integer. Parsing either out of the sentence above
              would break on a wording change. */}
          <p className="text-sm text-muted">
            Seats they occupy:{" "}
            <span className="code" data-testid="member-delete-refused-seats">
              {refusedTarget === null ? NO_SEATS : seatCodeList(refusedTarget.references.occupiedSeatCodes)}
            </span>
          </p>
          <p className="text-sm text-muted">
            Devices they own:{" "}
            <span className="code" data-testid="member-delete-refused-devices">
              {refusedTarget?.references.ownedDeviceCount ?? 0}
            </span>
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeRefused}
              data-testid="member-delete-refused-dismiss"
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
