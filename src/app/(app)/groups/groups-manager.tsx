"use client";

// The interactive half of the group management screen (GRP-01).
//
// It keeps no copy of the group list. `rows` is a prop, every mutation calls `revalidatePath` on the
// server and `router.refresh()` here, and the server re-sends the tree. A client-side copy would be
// a second source of truth for data the server already re-sends — and on a tree it would also be a
// second place the pre-order flattening could disagree with itself.
//
// Nothing here gates a control on a role, and that is the specified state rather than an omission:
// `PermissionGate` is not imported and `can()` is not called, because a control wrapped in a gate
// fed a hard-coded role renders a surface that looks guarded and is not (02-design.md section 2).
// The gate belongs in the server action on every write, not only here — `PermissionGate` hides a
// control and does not protect an operation, and review check R6 looks for both.

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, JSX, ReactNode } from "react";

import type { GroupRow } from "./page";
import {
  createGroup,
  deleteGroup,
  getGroupReferences,
  updateGroup,
} from "@/actions/groups";
import type { GroupActionError, GroupFieldName } from "@/actions/groups";
import { DataTable } from "@/components/shared/DataTable";
import { EntityFormDialog } from "@/components/shared/EntityFormDialog";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { GroupReferences } from "@/lib/data";

/**
 * The literal a cell renders where there is nothing to name — a top-level group's parent, a
 * childless group's children. One constant, because AC-2, AC-3, AC-7 and AC-12 all assert against
 * it and a second spelling would fail one of them silently.
 */
const NONE = "none";

/** The parent select's placeholder. Its `value=""` is what carries "no parent chosen" to the schema. */
const NO_PARENT_LABEL = "No parent (top level)";

/**
 * The fields a form collects. Four of the six error kinds arrive as a field map and render against
 * the input they belong to — a duplicate name against `name`, a dead parent and a cycle against
 * `parentId` (02-design.md section 6.4 item 4).
 *
 * `HAS_CHILDREN` never does: it has an assertable list inside it and renders structurally, in the
 * refusal dialog, rather than as a sentence against a field.
 */
function fieldMessages(error: GroupActionError | null): Partial<Record<GroupFieldName, string>> {
  if (error === null) return {};
  if (error.kind === "VALIDATION") return error.fields;
  if (error.kind === "DUPLICATE_NAME") return error.fields;
  if (error.kind === "PARENT_NOT_FOUND") return error.fields;
  if (error.kind === "ANCESTOR_CYCLE") return error.fields;
  return {};
}

/** A message that belongs to no field: a group that is already gone. */
function looseMessage(error: GroupActionError | null): string | null {
  if (error === null) return null;
  if (error.kind === "NOT_FOUND") return error.message;
  return null;
}

/**
 * Names comma-separated, or the literal `none`. One rendering, three places — the children cell, the
 * refusal dialog's list, and nothing else. The list arrives sorted from the seam and from the row
 * projection, so this does not sort again: two sorts is two places the order could differ.
 */
function nameList(names: string[]): string {
  return names.length === 0 ? NONE : names.join(", ");
}

/**
 * An error element exists only while its field is rejected. AC-4 wants a message against the
 * offending field, so absence is the resting state rather than an empty element that is always
 * present.
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
 * What a delete dialog was opened about: the row, and what the seam said refers to it.
 *
 * Both dialogs carry it, and for the same reason. The confirmation states how many members will be
 * detached (AC-13) and the refusal names the children that block it (AC-12), and both facts come
 * from one read taken before either dialog opened.
 */
interface DeleteTarget {
  row: GroupRow;
  references: GroupReferences;
}

/**
 * Both parent selects list every group by its full path, and the edit select lists the group being
 * edited and its own descendants along with the rest.
 *
 * **The paths, not the bare names.** AC-4b puts two groups named `Platform` in the tree at once; a
 * select showing `Platform` twice is a control through which AC-6a cannot be exercised, because
 * neither the person nor the test can say which one they meant.
 *
 * **Nothing is filtered out of the edit select, and that is the opposite of an omission.** AC-8
 * refuses a move that would make a group its own ancestor, and a select that hid those options would
 * make the refusal unreachable through the interface. A refusal the UI makes unreachable is a
 * refusal that is never tested and stops holding the moment another caller arrives (02-design.md
 * 1.5, decision 3, and section 7 alternative B).
 */
function ParentOptions({ rows }: { rows: GroupRow[] }): ReactNode {
  return (
    <>
      <option value="">{NO_PARENT_LABEL}</option>
      {rows.map((r) => (
        <option key={r.group.id} value={r.group.id}>
          {r.path}
        </option>
      ))}
    </>
  );
}

export function GroupsManager({ rows }: { rows: GroupRow[] }): JSX.Element {
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GroupRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [refusedTarget, setRefusedTarget] = useState<DeleteTarget | null>(null);

  const [pending, setPending] = useState(false);
  const [createError, setCreateError] = useState<GroupActionError | null>(null);
  const [editError, setEditError] = useState<GroupActionError | null>(null);
  const [deleteError, setDeleteError] = useState<GroupActionError | null>(null);
  // A refused row action has no form open to render against. Absent until one is refused, which is
  // why it is null rather than "".
  const [actionError, setActionError] = useState<GroupActionError | null>(null);

  const createFields = fieldMessages(createError);
  const editFields = fieldMessages(editError);

  const editLoose = looseMessage(editError);
  const deleteLoose = looseMessage(deleteError);
  const actionMessage = looseMessage(actionError);

  async function submitCreate(data: FormData): Promise<void> {
    setPending(true);
    const result = await createGroup({
      name: String(data.get("name") ?? ""),
      // The parent select's placeholder carries `value=""`, so "no parent" arrives as the empty
      // string and `groupParentIdSchema` maps it to null. No `required` attribute is relied on:
      // that is a browser affordance and the server action is a network boundary.
      parentId: String(data.get("parentId") ?? ""),
    });
    setPending(false);

    if (!result.ok) {
      setCreateError(result.error);
      return;
    }

    setCreateError(null);
    setCreateOpen(false);
    // AC-2, AC-3: the new group appears without a reload. `revalidatePath` invalidated the server's
    // copy; this is what makes the page re-render against it.
    router.refresh();
  }

  async function submitEdit(id: string, data: FormData): Promise<void> {
    setPending(true);
    const result = await updateGroup({
      id,
      name: String(data.get("name") ?? ""),
      parentId: String(data.get("parentId") ?? ""),
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
   * F-4, implemented literally: which delete dialog opens is decided before anything is confirmed.
   * A group that cannot be deleted is never asked to confirm something that will not happen, so
   * AC-12's refusal is raised at the point of request and `group-delete-confirm` is never rendered
   * for it.
   *
   * The read decides which dialog opens. It is not the enforcement — `deleteGroup` in the seam
   * recomputes the same references itself, so a caller reaching the action directly is refused too
   * (02-design.md 1.2, rule 6).
   */
  async function requestDelete(row: GroupRow): Promise<void> {
    setActionError(null);
    setDeleteError(null);
    setPending(true);
    const result = await getGroupReferences({ id: row.group.id });
    setPending(false);

    if (!result.ok) {
      setActionError(result.error);
      return;
    }

    const references = result.data;
    if (references.childGroupNames.length > 0) {
      setRefusedTarget({ row, references });
      return;
    }
    setDeleteTarget({ row, references });
  }

  async function submitDelete(target: DeleteTarget): Promise<void> {
    setPending(true);
    const result = await deleteGroup({ id: target.row.group.id });
    setPending(false);

    if (!result.ok) {
      // Children arrived between the read and the write. Nothing was written, and the honest
      // presentation is the refusal dialog the read would have opened — not a sentence inside a
      // confirmation for a delete that did not happen (02-design.md 1.5, decision 4).
      if (result.error.kind === "HAS_CHILDREN") {
        setDeleteTarget(null);
        setRefusedTarget({ row: target.row, references: result.error.references });
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
    void submitEdit(editTarget.group.id, new FormData(event.currentTarget));
  }

  function closeCreate(): void {
    setCreateOpen(false);
    setCreateError(null);
  }

  function closeEdit(): void {
    setEditTarget(null);
    setEditError(null);
  }

  // AC-11: dismissing the confirmation performs nothing. Nothing has been written at this point —
  // the delete is the confirm control's, and it alone.
  function closeDelete(): void {
    setDeleteTarget(null);
    setDeleteError(null);
  }

  // AC-12: the refusal dialog has no confirm control, because there is nothing to confirm — only a
  // dismiss.
  function closeRefused(): void {
    setRefusedTarget(null);
  }

  return (
    <div className="space-y-4">
      {/* Above the table rather than inside it, so it is present when the tree is empty.
          `ui-design-system.md`: an empty state that lacks the action needed to leave it is a dead
          end. */}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          data-testid="groups-create-open"
        >
          New group
        </Button>
      </div>

      {actionMessage !== null ? (
        <p data-testid="groups-action-error" className="text-sm text-accent">
          {actionMessage}
        </p>
      ) : null}

      <DataTable
        rows={rows}
        // Keyed by path, not by group id and not by name. Ids are minted with
        // `crypto.randomUUID()`, so a test cannot address a row for a group it just created; a name
        // is ambiguous by construction on AC-4b, which exists to prove names may repeat. Sibling
        // uniqueness is what makes the path unique, and it is a value the test supplied
        // (02-design.md section 6.1).
        rowKey={(r) => r.path}
        testIdPrefix="groups"
        emptyMessage="No groups yet. Create one to get started."
        columns={[
          {
            key: "name",
            header: "Name",
            // The indent is the whole of what `depth` drives. The testid sits on the name itself, so
            // the element's text is the name and nothing else.
            render: (r) => (
              <span className="inline-block" style={{ paddingLeft: `${r.depth * 1.25}rem` }}>
                <span data-testid={`groups-row-${r.path}-name`}>{r.group.name}</span>
              </span>
            ),
          },
          {
            key: "parent",
            header: "Parent",
            // The parent's NAME. F-7: the Phase B scaffold this screen replaces rendered the raw
            // `parentId` here, which is a cuid, which names nothing to a person.
            render: (r) => (
              <span data-testid={`groups-row-${r.path}-parent`}>{r.parentName ?? NONE}</span>
            ),
          },
          {
            key: "children",
            header: "Child groups",
            // Direct children only — AC-12 refuses on a group having children at all, so a
            // descendant list would answer a question nobody asked. It is also the fact a person
            // reads before they press Delete and are refused.
            render: (r) => (
              <span data-testid={`groups-row-${r.path}-children`}>{nameList(r.childNames)}</span>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            // Edit and Delete on every row, unconditionally. Hiding Delete on a group that cannot be
            // deleted would make AC-12 unreachable through the UI, and the rule would appear to hold
            // because the button was missing.
            render: (r) => (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditError(null);
                    setEditTarget(r);
                  }}
                  data-testid={`groups-row-${r.path}-edit`}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={pending}
                  onClick={() => void requestDelete(r)}
                  data-testid={`groups-row-${r.path}-delete`}
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
        title="New group"
        submitLabel="Create group"
        onSubmit={onCreateSubmit}
        onClose={closeCreate}
        testIdPrefix="group-create"
        pending={pending}
      >
        <Field label="Name" htmlFor="group-create-name">
          <Input id="group-create-name" name="name" data-testid="group-create-name" />
          <FieldError testId="group-create-name-error" message={createFields.name} />
        </Field>

        <Field label="Parent group" htmlFor="group-create-parent">
          <Select
            id="group-create-parent"
            name="parentId"
            defaultValue=""
            data-testid="group-create-parent"
          >
            <ParentOptions rows={rows} />
          </Select>
          <FieldError testId="group-create-parent-error" message={createFields.parentId} />
        </Field>
      </EntityFormDialog>

      <EntityFormDialog
        open={editTarget !== null}
        title="Edit group"
        submitLabel="Save group"
        onSubmit={onEditSubmit}
        onClose={closeEdit}
        testIdPrefix="group-edit"
        pending={pending}
      >
        {/* Both controls remount when the target changes, so their defaults follow the row that was
            opened rather than the one opened first. */}
        <Field label="Name" htmlFor="group-edit-name">
          <Input
            id="group-edit-name"
            name="name"
            key={`name-${editTarget?.group.id ?? "none"}`}
            defaultValue={editTarget?.group.name ?? ""}
            data-testid="group-edit-name"
          />
          <FieldError testId="group-edit-name-error" message={editFields.name} />
        </Field>

        <Field label="Parent group" htmlFor="group-edit-parent">
          <Select
            id="group-edit-parent"
            name="parentId"
            key={`parent-${editTarget?.group.id ?? "none"}`}
            defaultValue={editTarget?.group.parentId ?? ""}
            data-testid="group-edit-parent"
          >
            <ParentOptions rows={rows} />
          </Select>
          {/* AC-8's refusal renders here, against the field that was refused. */}
          <FieldError testId="group-edit-parent-error" message={editFields.parentId} />
        </Field>
        {editLoose !== null ? (
          <p data-testid="group-edit-error" className="text-sm text-accent">
            {editLoose}
          </p>
        ) : null}
      </EntityFormDialog>

      <Dialog
        open={deleteTarget !== null}
        title="Delete group"
        onClose={closeDelete}
        data-testid="group-delete-dialog"
      >
        <div className="space-y-4">
          {/* Opens only for a group that can be deleted, so this sentence never has to hedge. */}
          <p data-testid="group-delete-message">
            {deleteTarget === null
              ? ""
              : `Delete ${deleteTarget.row.group.name}? It has no child groups. Its members are not deleted — they keep everything they have and stop belonging to any group. This cannot be undone.`}
          </p>
          {/* AC-13, and INV-11's shape applied to a change that is not a loss: a destructive
              confirmation states what it will do. Bare and in its own element, `0` included, because
              the criterion asserts a count and a wording change should not fail it. Out-of-scope
              item 2 forbids a member count on a group ROW; this is not a row, it is the disclosure
              of what confirming will do. */}
          <p className="text-sm text-muted">
            Members who will be detached:{" "}
            <span className="code" data-testid="group-delete-members">
              {deleteTarget?.references.memberCount ?? 0}
            </span>
          </p>
          {deleteLoose !== null ? <p className="text-sm text-accent">{deleteLoose}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeDelete} data-testid="group-delete-cancel">
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (deleteTarget !== null) void submitDelete(deleteTarget);
              }}
              data-testid="group-delete-confirm"
            >
              Delete permanently
            </Button>
          </div>
        </div>
      </Dialog>

      {/* AC-12, and Q-1's answer. The refusal dialog, opened INSTEAD of the confirmation. It has no
          confirm control because there is nothing to confirm — only a dismiss (F-4). */}
      <Dialog
        open={refusedTarget !== null}
        title="This group cannot be deleted"
        onClose={closeRefused}
        data-testid="group-delete-refused-dialog"
      >
        <div className="space-y-4">
          <p data-testid="group-delete-refused-message">
            {refusedTarget === null
              ? ""
              : `${refusedTarget.row.group.name} still has child groups. Delete them or move them to another parent first.`}
          </p>
          {/* The blocking names in their own element, rendered bare. AC-12 asserts the children are
              named, and parsing a name out of the sentence above would break on a wording change. */}
          <p className="text-sm text-muted">
            Child groups:{" "}
            <span className="code" data-testid="group-delete-refused-children">
              {refusedTarget === null ? NONE : nameList(refusedTarget.references.childGroupNames)}
            </span>
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeRefused}
              data-testid="group-delete-refused-dismiss"
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
