---
ticket: GRP-01
stage: DESIGN
agent: tech-lead-design
produced_at: 2026-08-25T07:14:49Z
inputs_read: [ .ai/board/tickets/GRP-01/01-story.md, .ai/board/tickets/GRP-01/ticket.yaml, .ai/registry/features.md, .ai/registry/invariants.md, .ai/registry/rules.md, .ai/standards/architecture.md, .ai/standards/coding-standards.md, .ai/standards/data-model.md, .ai/standards/rbac-and-security.md, .ai/standards/testing-standards.md, .ai/standards/ui-design-system.md, .ai/01-operating-model.md, .ai/templates/tech-design.md, prisma/schema.prisma, src/lib/data/types.ts, src/lib/data/index.ts, src/lib/data/fixtures.ts, src/lib/data/mock/store.ts, src/lib/data/mock/groups.ts, src/lib/data/mock/members.ts, src/lib/data/prisma/groups.ts, src/lib/data/prisma/members.ts, "src/app/(app)/groups/page.tsx", "src/app/(app)/layout.tsx", "src/app/(app)/members/page.tsx", "src/app/(app)/members/members-manager.tsx", src/actions/members.ts, src/lib/validation/member.ts, src/components/shared/DataTable.tsx, src/components/shared/EntityFormDialog.tsx, src/components/ui/Dialog.tsx, src/components/ui/Select.tsx, tests/unit/seam-parity.test.ts, tests/e2e/members.spec.ts, playwright.config.ts, package.json, tsconfig.json, eslint.config.mjs, .ai/board/tickets/MEM-01/ticket.yaml ]
consulted: none
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: IN_PROGRESS
---

# GRP-01 — Group CRUD UI — technical design

Seven sections, and a section 0 that carries the findings. Two of the story's three open questions
were routed here and both are answered — `Q-3` (the Group field set and whether it carries a parent
reference) as **F-1**, and `Q-7` (how QA reaches AC-13's Given) as **F-3**. `Q-4`'s two residues,
which the story left to this stage without numbering, are answered as **F-2**. `Q-5` is the
operator's and is untouched.

**The ticket does not stop.** Out-of-scope item 11 says GRP-01 stops rather than acquiring a
migration if the draft schema turns out to carry no parent reference. It carries one —
`prisma/schema.prisma:152-154` — so `schema_delta` stays `none`, `requires_adr` stays `false`, and
section 4 says nothing else.

**Size is `M`, ten files, and it agrees with the BA's `size_estimate`.** Nothing to route back.

## 0. Findings

Seven. Two of them are about files this ticket does not touch and both are for a human.

### F-1 — `Q-3` ANSWERED. A Group is three fields, and the parent reference exists

Transcribed, not invented. `prisma/schema.prisma:145-159`, with the model's own three-line
`TODO(verify)` comment above `parentId` elided and nothing else changed:

```prisma
model Group {
  id       String  @id @default(cuid())
  name     String
  parentId String?
  parent   Group?  @relation("GroupTree", fields: [parentId], references: [id], onDelete: SetNull)
  children Group[] @relation("GroupTree")
  members  Member[]
  @@index([parentId])
}
```

The DTO already exists and already matches — `src/lib/data/types.ts` declares `Group` with `id`,
`name` and `parentId: string | null`, and `src/lib/data/fixtures.ts:13-16` holds two rows in that
shape. **No field is added to `Group` by this ticket.** Everything section 1 adds is an input type or
an outcome type beside it.

Three consequences, each of which the story asked for by name:

- **There is no `createdAt` and no `updatedAt` on `Group`**, unlike `Room`, `Member`, `Device` and
  `Account`. Out-of-scope item 9 says the system does not record when a group was created or who
  moved it; the model agrees, and this is where that agreement is written down.
- **There is no unique constraint of any kind.** No `@unique` on `name`, no `@@unique([parentId,
  name])`. Sibling uniqueness is therefore not a transcription of the model — see F-2.
- **`Group.members` is a back-relation only.** Nothing on the Group side of it is stored; the
  membership lives on `Member.groupId`. AC-13 writes `Member.groupId`, which is why section 3 has
  `mock/groups.ts` reading the members array rather than the reverse.

### F-2 — `Q-4`'s two residues ANSWERED. Exact comparison, held at the seam, and a unique index would not have worked anyway

The story left the uniqueness *rule* decided by the operator and the *enforcement* to this stage,
in two parts.

**Case: the comparison is exact and is not case-folded.** `Platform` and `platform` are two groups
that may sit under the same parent. This follows MEM-01's F-1 rather than departing from it — the
model imposes no case rule on `Group.name` at all, so folding case here would be a rule this design
invented, in the direction that never produces a wrong row and only a rejected one. If case-folded
identity is wanted it is a schema decision (a citext column or a functional index) and it is human.
Section 6.4 states this as a behavioural fact so QA has it; it is not otherwise reachable from the
story.

**Where it is held: in `src/lib/data/`, in one predicate, called from both write paths.** INV-10 is
the worked precedent — a constraint that no index expresses, checked at the seam on every write. Here
the precedent is stronger than "no index expresses it", because an index expresses it *wrongly*:

> `@@unique([parentId, name])` in PostgreSQL does not refuse two rows whose `parentId` is `NULL`.
> `NULL` is not equal to `NULL` under the SQL standard, and a unique index treats every such row as
> distinct. **AC-4a's top-level case is exactly that row.** A schema-held constraint would refuse
> `Engineering/Platform` twice and permit two top-level `Platform`s, and it would do it silently.

The story anticipated the top-level case in prose — *a rule about "the same parent" that says nothing
about "no parent" is a rule with a hole in it at the one level every tree has*. This is that hole in
the one place it would actually have opened. Section 7 alternative D is the rejection; this finding
is why it is not a close call.

### F-3 — `Q-7` ANSWERED. The seed already holds groups and members inside them, and `data-model.md` does not say so

**AC-13's Given is reachable, and no fixture has to be added.** `src/lib/data/fixtures.ts:13-22`:

- two groups — `Engineering` at the top level, and `Platform` beneath it;
- all three seeded members carry a `groupId`: Ada Admin in `Engineering`, Mo Manager and Uma User in
  `Platform`.

So the seed contains, without anything being written to it:

- a group with a child group and no way to be deleted — `Engineering`, which is AC-12's Given;
- a group with no children and two members — `Platform`, which is AC-13's Given;
- three members who belong to a group, occupy a seat and own a device — which is AC-9's Given.

**The story's premise on this point was wrong, and it was wrong from a document rather than from
carelessness.** `01-story.md` says the seed has *no groups at all*, citing
`.ai/standards/data-model.md`, which describes the seed as *2 rooms, about 12 seats, 3 members across
the three roles, 5 devices* and does not mention groups. `fixtures.ts` has held two since it was
written. **That is a defect in `.ai/standards/data-model.md:122-124`, it is a human-only file
(RULE-01), and this design does not edit it.** It is worth a line to the operator because the next
BA to reason about fixture state will read the same sentence and reach the same wrong conclusion.

What this design owes QA in consequence is in section 6.2: the seed facts, and the ordering
constraint that follows from AC-13 consuming one of them.

### F-4 — AC-12 says "delete and confirm", and under this design there is nothing to confirm

AC-12's When is *When I delete `A` and confirm*. This design refuses at the point of request: pressing
Delete on a group that has children opens a refusal dialog that has **no confirm control**, because
there is nothing to confirm. The confirmation dialog is only ever opened for a group that can
actually be deleted.

That is MEM-01's shape (its section 7 alternative A rejected the confirm-then-refuse dialog) and
ADR-005's reasoning applied to a third relation: a person should not be asked to confirm something
that will not happen. It is also the shape AC-12's own *Then* wants — *a message states that its
child groups must be deleted or moved first* is a refusal, and a refusal that arrives after a
confirmation has already been given reads as a failure rather than as a rule.

**Nothing in the story is rewritten for this.** An acceptance criterion is the BA's. What this
finding does instead is make the interaction unambiguous in section 6.2, which is the channel QA
reads: for a group with children the sequence is *press Delete → the refusal dialog appears → dismiss
it*, and `group-delete-confirm` is never rendered. AC-12's "and confirm" is satisfied by the refusal
arriving in place of the confirmation.

If the operator or the BA wants the literal confirm-then-refuse sequence instead, that is a story
amendment and a redesign of section 1.5, and section 7 alternative G is the argument they would be
overturning.

### F-5 — the draft schema would silently reparent the children AC-12 refuses to strand

`prisma/schema.prisma:153` declares `parent Group? @relation("GroupTree", ..., onDelete: SetNull)`.
Under a wired Prisma implementation, deleting `Engineering` would succeed and set `Platform.parentId`
to null — the group would silently move to the top level. **That is the reparent branch of `Q-1`,
which the operator rejected**, and it is declared in the model that the operator has not yet
approved.

Two things follow.

1. **The refusal is the seam's, on both sides.** `deleteGroup` refuses before it issues any delete,
   in the mock today and in `prisma/groups.ts` when it is wired. A Prisma implementation that
   delegated the decision to the database would produce `Q-1`'s rejected behaviour with no code
   saying so anywhere.
2. **It is a note for whoever approves the schema.** `onDelete: Restrict` on that relation would make
   the model agree with AC-12 rather than contradict it. Changing it is RULE-09 and this design does
   not propose the edit — it records that the line and the criterion disagree, which is the same
   service ROO-01's design did when INV-11 and the `Seat.room` cascade disagreed.

### F-6 — the model and AC-13 agree, and this one is worth stating because F-5 is not

`prisma/schema.prisma:167` declares `group Group? @relation(..., onDelete: SetNull)` on `Member`.
Deleting a group sets its members' `groupId` to null. That is `Q-2`'s answer exactly, and the seam
performs the same write explicitly rather than relying on it, for the reason `mock/members.ts` gives
about the three cascades it does not implement: a behaviour that only happens because a database was
configured for it is a behaviour no test in mock mode can reach.

### F-7 — the existing `/groups` page renders a cuid where a person needs a name

`src/app/(app)/groups/page.tsx` is a Phase B scaffold: a flat two-column table whose Parent column
renders `g.parentId ?? "none"` — a raw cuid. It is replaced wholesale by this ticket, and section 5
carries it for that reason rather than as a new file. The replacement renders the parent's **name**,
which is ADR-005's *a cuid names nothing to a person* applied to a column instead of to a refusal
message.

## 1. Contract

Every name below is final. The Developer implements these and invents nothing (RULE-04). The
TypeScript and the Zod in this section were typechecked as written, under the project's own
`strict` plus `noUncheckedIndexedAccess` settings, before this document was gated.

### 1.1 Seam DTOs — `src/lib/data/types.ts`, additive only

`Group` already exists and **does not change**. Everything here is added beside it.

```ts
/**
 * Input to createGroup. `id` is minted by the seam. `parentId` is null for a top-level group —
 * AC-2 — and a group id for a child — AC-3. There is no third state: the create form's parent
 * placeholder carries value="" and the Zod schema maps it to null before it reaches here.
 */
export interface NewGroup {
  name: string;
  parentId: string | null;
}

/**
 * Input to updateGroup. One patch carries both editable fields, and that is the whole reason AC-6a
 * cannot be passed by accident: a rename (AC-5) and a move (AC-6, AC-7) reach the same function and
 * the same sibling-uniqueness check. An implementation that checked uniqueness only where a name was
 * typed would need two functions to do it, and this shape does not offer the second one.
 */
export interface GroupPatch {
  name: string;
  parentId: string | null;
}

/**
 * What refers to a group, read together rather than one at a time — MemberReferences' shape and its
 * reasoning. AC-12 requires the refusal to name what is blocking it, and ADR-005's ground is that a
 * bare "cannot delete" sends the operator hunting.
 *
 * childGroupNames — the names of this group's DIRECT children, sorted ascending. Empty when it has
 *                   none. Names and not ids, because a cuid names nothing to a person.
 * memberCount     — how many members belong to this group. A count and not a list: out-of-scope
 *                   item 2 forbids a group-scoped view of members, and this is the one place any
 *                   member fact reaches this surface at all (AC-13's confirmation names it).
 */
export interface GroupReferences {
  childGroupNames: string[];
  memberCount: number;
}

/**
 * AC-2, AC-3, AC-4a. Both refusals are the seam's, because both turn on stored data the caller did
 * not supply — whether the chosen parent exists, and what already sits beneath it.
 *
 * DUPLICATE_NAME_IN_PARENT is one reason code covering the top-level case as well, because "no
 * parent" is a parent value and not a separate rule (F-2).
 */
export type CreateGroupOutcome =
  | { created: true; group: Group }
  | { created: false; reason: "PARENT_NOT_FOUND" | "DUPLICATE_NAME_IN_PARENT" };

/**
 * AC-5, AC-5a, AC-6, AC-6a, AC-7, AC-8. Four distinct refusals and they are separate members rather
 * than one "ILLEGAL", for the reason DesignatePrimaryOutcome gives: a shared reason code makes two
 * failures indistinguishable in a test, which is how the bug survives. Here the pair that must stay
 * distinguishable is ANCESTOR_CYCLE and DUPLICATE_NAME_IN_PARENT — AC-8 and AC-6a are both a refused
 * move, and an implementation that reported either for both would pass one criterion by accident.
 */
export type UpdateGroupOutcome =
  | { updated: true; group: Group }
  | {
      updated: false;
      reason: "NOT_FOUND" | "PARENT_NOT_FOUND" | "DUPLICATE_NAME_IN_PARENT" | "ANCESTOR_CYCLE";
    };

/**
 * AC-11, AC-12, AC-13.
 *
 * `membersDetached` is returned rather than inferred, for the reason DeleteRoomOutcome returns its
 * counts: after the group is gone there is nothing left to read the membership off, and AC-13 is
 * then assertable at the seam and not only through two rendered surfaces.
 *
 * The HAS_CHILDREN arm carries the same `references` the pre-delete read returns, so the refusal
 * names the children (AC-12) without a second query. There is no `cascaded` arm and there never was
 * one: Q-1 rejected the cascade and Q-1 rejected the reparent, and F-5 records that the draft schema
 * would perform the reparent if the seam ever let it reach the database.
 */
export type DeleteGroupOutcome =
  | { deleted: true; groupId: string; membersDetached: number }
  | { deleted: false; reason: "NOT_FOUND" }
  | { deleted: false; reason: "HAS_CHILDREN"; references: GroupReferences };
```

### 1.2 Seam functions — identical names and arity in both implementations

Three functions already exist in `src/lib/data/{mock,prisma}/groups.ts` — `listGroups()`,
`getGroup(id)`, `listChildGroups(parentId)`. **None of their signatures changes.** `listChildGroups`
is not called by this ticket and is left exactly as it is; deleting an unused export from a file this
run did not write is not this ticket's to do.

Four functions are added, in both files, with the same names and the same arity —
`tests/unit/seam-parity.test.ts` already has `groups` in its `PAIRS` list, so it fails on the first
drift and needs no edit itself.

```ts
export async function createGroup(input: NewGroup): Promise<CreateGroupOutcome>;
export async function updateGroup(id: string, patch: GroupPatch): Promise<UpdateGroupOutcome>;
export async function getGroupReferences(id: string): Promise<GroupReferences | null>;
export async function deleteGroup(id: string): Promise<DeleteGroupOutcome>;
```

The Prisma side is `notWired(...)` bodies with every parameter declared and discarded with `void`,
exactly as `prisma/members.ts` does it — an omitted parameter is an arity drift the type system will
not see and the parity test will.

**Six rules the mock implementation holds, in this order.** They are numbered because section 3.1
cites them and because the order between rules 3 and 4 is a decision rather than an accident.

1. **Every check runs before the first write.** AC-5's *no other group is changed in any respect*,
   AC-6a's *no change is saved*, AC-8's *the tree is unchanged* and AC-12's *the whole tree is
   unchanged* are all assertions about a refusal having written nothing. A partially applied patch —
   a new name saved beside a refused parent — fails those criteria even though the illegal state
   never existed.
2. **`PARENT_NOT_FOUND` is checked first on both write paths.** A parent id that names no group is
   not a uniqueness question and not a cycle question; answering it as either would report the wrong
   refusal for a group that was deleted in another tab.
3. **`ANCESTOR_CYCLE` is checked before `DUPLICATE_NAME_IN_PARENT` on the update path.** AC-8 and
   AC-6a can both be true of one submission — moving `Engineering` beneath its own child `Platform`
   while a second `Platform` sits at the destination. The cycle wins, because the destination's set
   of siblings is not well defined inside a cycle, and reporting a name collision for a move that
   could never have been performed sends the operator to fix the wrong thing.
4. **The cycle walk is bounded.** It climbs `parentId` from the proposed parent and refuses if it
   reaches the group's own id; it also refuses if it takes more steps than there are groups. The
   store is a process-global mutable array (`mock/store.ts`), so an unbounded walk over data that is
   already cyclic hangs the server rather than failing a test. `parentId === id` — setting a group's
   parent to itself, AC-8's second clause — falls out of the same walk on step zero and needs no
   special case.
5. **Sibling uniqueness is one predicate, called from both write paths**, taking the name, the
   parent, and the id to exclude. `createGroup` excludes nothing; `updateGroup` excludes the group
   being edited, because a group keeping its own name is not a duplicate of itself. Comparison is
   `===` on the trimmed name (F-2) and `===` on `parentId`, where `null === null` is the top-level
   case and is the reason a database index could not have held this (F-2).
6. **`deleteGroup` computes the refusal itself and trusts no caller.** `getGroupReferences` answers
   the same question for the UI, so the surface can open the right dialog, but the enforcement is
   inside the delete. A surface that asked and a seam that assumed would put AC-12 in the client.

`deleteGroup`'s success path does two writes and only two: it sets `groupId` to null on every member
whose `groupId` is this group, counting them, and it splices the group out of the groups array.
**Spliced in place, never reassigned** — `store.ts` exports the array binding and every other mock
module holds that same object.

### 1.3 Zod schemas — `src/lib/validation/group.ts`, new file

```ts
import { z } from "zod";

// `.trim()` runs before `.min(1)`, so "   " fails rather than passing as three characters (AC-4).
export const groupNameSchema = z.string().trim().min(1, "A name is required.").max(120);

export const groupIdSchema = z.string().trim().min(1);

/**
 * The parent select's placeholder carries value="", which is how "no parent chosen" reaches the
 * server (AC-2, AC-7). It is mapped to null HERE rather than in the action or the seam, so that
 * `NewGroup.parentId` and `GroupPatch.parentId` are `string | null` and the empty string is not a
 * third state anything downstream has to know about.
 *
 * `z.literal("")` is first in the union deliberately: `groupIdSchema` would reject "" with a message
 * about a required field, and a top-level group is not a validation failure.
 */
export const groupParentIdSchema = z.union([
  z.literal("").transform(() => null),
  z.null(),
  groupIdSchema,
]);

// One schema per field on both paths, for the reason `roomNameSchema` was extracted: a value
// acceptable at creation and rejected at edit is a rule that exists in two places and agrees in
// neither.
export const createGroupSchema = z.object({
  name: groupNameSchema,
  parentId: groupParentIdSchema,
});

export const updateGroupSchema = z.object({
  id: groupIdSchema,
  name: groupNameSchema,
  parentId: groupParentIdSchema,
});

// `getGroupReferences` and `deleteGroup` both take an id and nothing else.
export const groupIdOnlySchema = z.object({ id: groupIdSchema });

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
```

**No schema here refuses a duplicate name and none refuses a cycle.** Both are facts about stored
data, not about the submitted value, and `coding-standards.md` puts them at the seam. A Zod refinement
that reached into the store to answer them would be the authorization-check-in-the-UI mistake with a
different subject.

### 1.4 Server actions — `src/actions/groups.ts`, new file

Five steps in the fixed order — `"use server"`, parse, check permission, call the seam, return a typed
result. Step 3 is absent by specification on this ticket and each action carries the comment at the
line where the check belongs; section 2 says which gate.

```ts
export type GroupFieldName = "name" | "parentId";

/**
 * DUPLICATE_NAME, PARENT_NOT_FOUND and ANCESTOR_CYCLE all carry a field map, so one helper renders
 * all three against the input they belong to. HAS_CHILDREN carries structure and no sentence, for
 * MemberActionError's reason: AC-12 asserts the children are named, the client composes the sentence
 * and renders the list in its own element, and a caller should not have to parse prose for a name.
 */
export type GroupActionError =
  | { kind: "VALIDATION"; fields: Partial<Record<GroupFieldName, string>> }
  | { kind: "DUPLICATE_NAME"; fields: { name: string } }
  | { kind: "PARENT_NOT_FOUND"; fields: { parentId: string } }
  | { kind: "ANCESTOR_CYCLE"; fields: { parentId: string } }
  | { kind: "HAS_CHILDREN"; references: GroupReferences }
  | { kind: "NOT_FOUND"; message: string };

export type GroupActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: GroupActionError };

export async function createGroup(input: unknown): Promise<GroupActionResult<Group>>;
export async function updateGroup(input: unknown): Promise<GroupActionResult<Group>>;
export async function getGroupReferences(input: unknown): Promise<GroupActionResult<GroupReferences>>;
export async function deleteGroup(input: unknown): Promise<GroupActionResult<{ id: string; membersDetached: number }>>;
```

Each parameter is `unknown` and is narrowed by its schema inside the action. A server action is a
network boundary; typing the parameter as `CreateGroupInput` would claim a guarantee the caller never
had to honour.

The four message strings, fixed here so the surface and the tests do not each invent one:

| Constant | Text | Criterion |
|---|---|---|
| `DUPLICATE_NAME_MESSAGE` | `That name is already used in that parent.` | AC-4a, AC-5a, AC-6a |
| `PARENT_GONE_MESSAGE` | `That parent group no longer exists.` | none — a concurrent delete |
| `ANCESTOR_CYCLE_MESSAGE` | `A group cannot be moved inside itself or one of its own child groups.` | AC-8 |
| `GROUP_GONE_MESSAGE` | `That group no longer exists.` | none — a concurrent delete |

`fieldErrors` takes the first message per field, as `actions/members.ts` does, and `id` maps to no
entry because it is never typed by a person.

**Step 5, revalidation: `revalidatePath("/groups")` on the three write actions, and nothing else.**

- `grep -rln "groups\|groupId" src/app src/actions src/components` returns exactly two files today:
  `src/app/(app)/groups/page.tsx` and `src/app/(app)/layout.tsx`, and the layout holds nav labels
  only. **No second route renders group data**, which is why this ticket does not repeat MEM-01's
  two-path revalidation.
- **`/members` is deliberately not revalidated, although AC-13 writes `Member.groupId`.** MEM-01
  dropped the group column from the member list on purpose — *a group id is not a group name and no
  seam function resolves one* — so no rendered cell anywhere depends on the field this ticket writes.
  Adding the path would be revalidating a route against a change it cannot display. **The ticket that
  restores a group column to `/members` — `GRP-02`, out-of-scope items 1 and 2 — makes `/members` a
  second reader and must add the path in the same change.**
- `getGroupReferences` does not revalidate. It writes nothing, and revalidating on a read would
  re-render the page every time a delete button is pressed, including the times it is then cancelled.
- `src/app/(app)/layout.tsx:3` already carries `export const dynamic = "force-dynamic"`, adopted by
  MEM-01 at its version 4. This ticket relies on it and does not touch it; it is not in
  `allowed_paths`.

### 1.5 UI components

Two files, in the pattern MEM-01 established: a server component that reads the seam and holds no
state, and a client component that holds the dialogs and calls the actions.

**`src/app/(app)/groups/page.tsx`** — replaced, not created (F-7). One seam read, `listGroups()`,
flattened into rows here rather than behind a `listGroupTree()`, because a nested DTO puts a new
*shape* across the seam and shape is the one thing `seam-parity.test.ts` does not check (section 7,
alternative F).

```ts
/** One rendered row. Pre-order: every group appears immediately after its parent. */
export interface GroupRow {
  group: Group;
  /** 0 for a top-level group. Drives the name cell's indent and nothing else. */
  depth: number;
  /** Ancestor names from the root, joined by "/". The row key — see section 6.1. */
  path: string;
  /** The parent's NAME, or null at the top level. AC-1, AC-3, AC-7. */
  parentName: string | null;
  /** The names of this group's DIRECT children, sorted. Empty when it has none. AC-2, AC-3. */
  childNames: string[];
}
```

Siblings are ordered by name for rendering. **That is not the ordering feature out-of-scope item 7
excludes**: nothing is stored, no field is added, and no control reorders anything. It is what makes
the rendered tree the same tree on every request, which every criterion that says *the tree is
unchanged* needs in order to mean anything.

**`src/app/(app)/groups/groups-manager.tsx`** — new, `"use client"`. Holds the create dialog, the
edit dialog, the delete confirmation and the delete refusal, and calls `router.refresh()` after every
successful write. It keeps no copy of the group list; `rows` is a prop.

Five decisions inside it that are the design's and not the Developer's:

1. **The create control sits above the table, not inside it**, so it is present when the tree is
   empty. `ui-design-system.md`: an empty state that lacks the action needed to leave it is a dead
   end.
2. **Both parent selects list groups by their full path, not by their bare name.** AC-4b puts two
   groups named `Platform` in the tree at once; a select showing `Platform` twice is a control
   through which AC-6a cannot be exercised, because neither the person nor the test can say which one
   they meant. Option value is the group id, option label is the path.
3. **The edit form's parent select lists every group, including the group being edited and its own
   descendants.** This looks like an omission and is the opposite of one: AC-8 refuses a move that
   would make a group its own ancestor, and a select that filtered those options out would make the
   refusal unreachable through the interface. A refusal the UI makes unreachable is a refusal that is
   never tested and stops holding the moment another caller arrives — MEM-01's argument for keeping
   the empty role placeholder on its edit form, and the same argument here.
4. **Which delete dialog opens is decided before anything is confirmed** — `getGroupReferences` runs
   on the press, and a group with children gets the refusal dialog, which has a dismiss control and
   no confirm control (F-4). If the seam then refuses on the confirm path anyway — the children
   arrived between the read and the write — the confirmation closes and the refusal dialog opens with
   the references the seam returned, rather than a sentence inside a confirmation for a delete that
   did not happen.
5. **The confirmation names the number of members that will be detached**, in its own element. That
   is INV-11's shape — a destructive confirmation states what will be lost — applied to a change that
   is not a loss, and it is the one place any member fact reaches this surface. Out-of-scope item 2
   forbids a member count *on a group row*; this is not a row, it is the disclosure of what confirming
   will do, and MEM-01 set the precedent exactly: the device count is kept off the member list and
   reaches the person through the delete dialog instead.

Edit and Delete render on **every** row, unconditionally. Hiding Delete on a group that cannot be
deleted would make AC-12 unreachable through the UI, and the rule would appear to hold because the
button was missing.

## 2. Permission model

`Q-6` fixed the four write verbs at `ADMIN`. `ROLE_RANK` is `USER < MANAGER < ADMIN`
(`rbac-and-security.md`); every gate below is `can(role, "ADMIN")`.

| Operation | Server action | Gate | USER | MANAGER | ADMIN | Unauthenticated |
|---|---|---|---|---|---|---|
| Read the tree | none — the page reads the seam directly | **unstated upstream; none applied** | — | — | — | — |
| Create a group | `createGroup` | `ADMIN` | deny | deny | allow | deny |
| Rename a group | `updateGroup` | `ADMIN` | deny | deny | allow | deny |
| Move a group | `updateGroup` | `ADMIN` | deny | deny | allow | deny |
| Read what refers to a group | `getGroupReferences` | `ADMIN` | deny | deny | allow | deny |
| Delete a group | `deleteGroup` | `ADMIN` | deny | deny | allow | deny |

Two rows need their reasoning stated rather than inferred.

**`getGroupReferences` takes the same `ADMIN` gate as the delete it precedes.** It is a read, and it
would be defensible to leave it open — but it exists only to decide which delete dialog opens, so a
caller who may not delete has no use for it, and it discloses how many people are in a department.
The rule that a read inherits the gate of the operation it exists to serve is the same one MEM-01
applied to `getMemberReferences`.

**Reading the tree is ungated because nothing upstream states a gate.** `Q-6` named the four write
verbs and the story records in terms that *who may see the surface and read the tree was not part of
the answer* and belongs to the ticket that first enforces a rank. This design does not invent one: a
rank comparison chosen here would be a permission model authored at DESIGN, which is what
`rbac-and-security.md` sends to an ADR.

**Nothing enforces any of this today, and the exposure is worth naming precisely.** There is no
session and no `Member.role` to compare — the `AUT` feature was withdrawn from the registry on
2026-08-25. Consequently **anyone who can reach the application can restructure the organization's
group tree**, and the table above records the model this surface is intended to have rather than the
one it has. Each action carries the comment at the exact line where step 3 belongs, so the ticket
that builds the session has a list of insertion points rather than a search.

`PermissionGate` is **not imported** by `groups-manager.tsx`. A gate fed a hard-coded role renders a
surface that looks guarded and is not, which is worse than an ungated surface that admits it. When the
gate is built it belongs in the server action on every row above, not only in the UI — `PermissionGate`
hides a control and does not protect an operation, and review check R6 looks for both.

## 3. Seam impact

Four functions added to `src/lib/data/mock/groups.ts` and to `src/lib/data/prisma/groups.ts`, with
identical names and arity — section 1.2. No existing signature changes anywhere in `src/lib/data/`,
which is what keeps this ticket `M` rather than `XL`.

`tests/unit/seam-parity.test.ts` needs **no edit**: `groups` is already in its `PAIRS` list and its
per-pair assertions are generated from the mock's exported names. It is not in `allowed_paths`, and a
diff that touches it is a review finding.

**`src/lib/data/mock/store.ts` gains a `groups` alias, and `mock/groups.ts` imports from it.** Today
`mock/groups.ts` reads `groups` from `../fixtures` directly, which was harmless while it only read.
It becomes a writing module in this ticket, and `store.ts` says in its own text that a writing module
which bypasses the store makes its first sentence false and gives the next reader two places to look.
The alias is the same array object, not a clone — that property is load-bearing and is the whole of
MEM-01's R8 fix. `mock/members.ts` already reads its members through the same binding, so the detach
in `deleteGroup` and the member list on `/members` cannot disagree about what happened.

**`mock/groups.ts` reads the members array and writes one field on it.** That is the only write this
ticket makes outside the groups collection, it is AC-13, and it is a field, not a row: no member is
created and none is deleted.

### 3.1 Where each rule is held

| Rule | Held by | Criterion |
|---|---|---|
| A name is required and may not be blank | `groupNameSchema`, before the action calls the seam | AC-4 |
| Sibling uniqueness, including at the top level | one predicate in `mock/groups.ts`, called by `createGroup` and `updateGroup` | AC-4a, AC-4b, AC-5a, AC-6a |
| A group may not become its own ancestor | the bounded parent walk in `updateGroup` | AC-8 |
| A group with children may not be deleted | `deleteGroup`, recomputing its own references | AC-12 |
| A group's members are detached, not deleted | `deleteGroup`, writing `Member.groupId = null` | AC-13, AC-9 |
| No seat, device or occupancy is touched | the absence of any import of `seats` or `devices` in `mock/groups.ts` | AC-10 |

The last row is a mechanism and not a promise. `mock/groups.ts` imports `groups` and `members` from
`./store` and nothing else; there is no path from this ticket's code to a seat or a device, which is
what makes AC-10 a property of the module rather than a discipline. An import of `seats` or `devices`
in that file is a review finding under R8 regardless of what it is used for.

**INV-12 is not engaged and AC-9 is what keeps it that way.** No function in this design deletes a
member, and `DeleteGroupOutcome` has no arm that could report having done so.

## 4. Schema delta

**`none`.**

`Group` carries `parentId` in the draft schema already (F-1), so the nesting this ticket renders needs
no column that does not exist, and out-of-scope item 11's stop condition is not met. `requires_adr`
stays `false` and no migration is generated.

Two observations about `prisma/schema.prisma` that are **not** deltas and are for the human who
approves that file: F-5, where `Group.parent`'s `onDelete: SetNull` would perform the silent reparent
`Q-1` rejected, and F-2, where a `@@unique([parentId, name])` index would not hold sibling uniqueness
at the top level. Neither is proposed as an edit here — RULE-09.

## 5. allowed_paths

Ten files. Enumerated, not globbed.

```yaml
allowed_paths:
  - "src/app/(app)/groups/page.tsx"
  - "src/app/(app)/groups/groups-manager.tsx"
  - "src/actions/groups.ts"
  - "src/lib/validation/group.ts"
  - "src/lib/data/types.ts"
  - "src/lib/data/mock/store.ts"
  - "src/lib/data/mock/groups.ts"
  - "src/lib/data/prisma/groups.ts"
  - "tests/unit/groups.test.ts"
  - "tests/e2e/groups.spec.ts"
```

| Path | New or changed | Why it is in reach |
|---|---|---|
| `src/app/(app)/groups/page.tsx` | changed — replaces the Phase B scaffold | F-7. The tree read and the row projection |
| `src/app/(app)/groups/groups-manager.tsx` | new | The four dialogs and the action calls |
| `src/actions/groups.ts` | new | Three write actions and one read |
| `src/lib/validation/group.ts` | new | Section 1.3 |
| `src/lib/data/types.ts` | changed — **additive only** | Five types added beside `Group`, which does not change |
| `src/lib/data/mock/store.ts` | changed — one alias | `mock/groups.ts` becomes a writing module (section 3) |
| `src/lib/data/mock/groups.ts` | changed — four functions added | The seam's half of every rule in 3.1 |
| `src/lib/data/prisma/groups.ts` | changed — four `notWired` stubs | Parity |
| `tests/unit/groups.test.ts` | new | QA |
| `tests/e2e/groups.spec.ts` | new | QA |

**Four paths a reader might expect and which are deliberately absent.** A diff that touches any of
them is a review finding under R1.

- `tests/unit/seam-parity.test.ts` — `groups` is already in `PAIRS`; it needs nothing.
- `src/app/(app)/layout.tsx` — the nav already links `/groups` and `force-dynamic` is already set.
- `src/lib/data/fixtures.ts` — the seed already holds what AC-12 and AC-13 need (F-3), and changing
  it would change what four other spec files see.
- `prisma/schema.prisma` — section 4, and RULE-09.

**`size: M`.** Ten files against the operating model's table — `M` is up to 12. It is not `XL`:
`types.ts` is changed, and the table's `XL` row names that file, but the paragraph beneath it fixes
the test as *whether existing callers must change, not whether the seam was touched at all*. Every
change here is additive, no existing signature moves, and no existing caller is affected. MEM-01 is
the precedent, additive in the same file and sized `M`.

**The verdict agrees with `size_estimate: M`.** Nothing routes back to `ba`.

## 6. Testability contract

RULE-05 makes this section the only channel through which selectors reach QA. A control missing from
these tables does not exist as far as QA is concerned, and check R7 verifies the reverse.

`<path>` in a row testid is the group's full path from the root, ancestor names joined by `/` —
`Engineering`, `Engineering/Platform`, `Product/Platform`. Section 6.1 says why, and states the one
case in which it is ambiguous.

### The table

| data-testid | Element | Used by |
|---|---|---|
| `groups-page` | The page section | AC-1 |
| `groups-create-open` | The button that opens the create dialog. Present whether or not the tree is empty | AC-1, AC-2, AC-3 |
| `groups-table` | The table, rendered when at least one group exists | AC-1 |
| `groups-empty` | The empty state, rendered instead of the table when no group exists | AC-1 |
| `groups-action-error` | A message belonging to no form — a group that is already gone | — |
| `groups-row-<path>` | One row. Rows appear in pre-order: a child immediately follows its parent | AC-1, AC-3, AC-6, AC-7 |
| `groups-row-<path>-name` | The group's name | AC-1, AC-2, AC-5 |
| `groups-row-<path>-parent` | The **parent's name**, or the literal `none` at the top level | AC-1, AC-2, AC-3, AC-6, AC-7 |
| `groups-row-<path>-children` | The direct children's names, sorted and comma-separated, or the literal `none` | AC-2, AC-3, AC-6, AC-7, AC-12 |
| `groups-row-<path>-edit` | Opens the edit dialog for that row | AC-5, AC-6, AC-7, AC-8 |
| `groups-row-<path>-delete` | Requests the delete for that row | AC-11, AC-12, AC-13 |
| `group-create-dialog` | The create dialog | AC-2, AC-3, AC-4, AC-4a, AC-4b |
| `group-create-name` | The name input | AC-2, AC-4, AC-4a |
| `group-create-name-error` | The message against the name. Absent while the name is accepted | AC-4, AC-4a |
| `group-create-parent` | The parent select. Placeholder `No parent (top level)` carries `value=""`; every other option's value is a group id and its label is that group's path | AC-2, AC-3, AC-4b |
| `group-create-parent-error` | The message against the parent | — |
| `group-create-submit` | Submits the create form | AC-2, AC-3, AC-4, AC-4a |
| `group-create-cancel` | Closes the create dialog, writing nothing | — |
| `group-edit-dialog` | The edit dialog | AC-5, AC-5a, AC-6, AC-6a, AC-7, AC-8 |
| `group-edit-name` | The name input, defaulted to the row's current name | AC-5, AC-5a |
| `group-edit-name-error` | The message against the name | AC-5a, AC-6a |
| `group-edit-parent` | The parent select, defaulted to the row's current parent. **Lists every group, including this one and its own descendants** | AC-6, AC-7, AC-8 |
| `group-edit-parent-error` | The message against the parent — the cycle refusal renders here | AC-8 |
| `group-edit-error` | A message belonging to no field — the group is already gone | — |
| `group-edit-submit` | Submits the edit form | AC-5, AC-5a, AC-6, AC-6a, AC-7, AC-8 |
| `group-edit-cancel` | Closes the edit dialog, writing nothing | — |
| `group-delete-dialog` | The confirmation. **Opens only for a group that can be deleted** | AC-11, AC-13 |
| `group-delete-message` | The confirmation sentence, naming the group | AC-11, AC-13 |
| `group-delete-members` | The number of members that will be detached, bare, in its own element. `0` when the group has none | AC-13 |
| `group-delete-confirm` | Performs the delete | AC-11, AC-13 |
| `group-delete-cancel` | Dismisses the confirmation, writing nothing | AC-11 |
| `group-delete-refused-dialog` | The refusal. **Opens instead of the confirmation, and has no confirm control** | AC-12 |
| `group-delete-refused-message` | The refusal sentence | AC-12 |
| `group-delete-refused-children` | The blocking children's names, sorted and comma-separated, bare, in its own element | AC-12 |
| `group-delete-refused-dismiss` | Closes the refusal | AC-12 |

`-children`, `-members` and `-refused-children` render **bare** — the value and nothing else, with the
label outside the element. Each fact must be assertable without parsing a sentence, because AC-12
asserts the children are named and AC-13 asserts the members are counted, and a wording change should
not fail a criterion it did not touch.

### 6.1 The row key, and the one case where it is ambiguous

**Rows are keyed by path, not by group id and not by name.**

- **Not by id.** Ids are minted with `crypto.randomUUID()`, so a test cannot address a row for a
  group it just created. This is MEM-01's reason for keying members by email.
- **Not by name.** AC-4b requires two groups named `Platform` to exist at once. A name key is
  ambiguous by construction on the criterion that exists to prove names may repeat.
- **By path**, which sibling uniqueness makes unique: two groups may share a name only under
  different parents, so their paths differ. It is also a value the test supplied, since the test chose
  every name in it.

**The ambiguity, stated rather than discovered:** a group whose *name* contains `/` produces a path
that could be read two ways. No criterion uses such a name and neither seeded group does. Nothing
refuses one — `groupNameSchema` accepts any non-blank string, and refusing `/` would be a rule this
design invented (F-2's reasoning). **QA should not put `/` in a group name**; if a later ticket needs
to, the key becomes a separator that names cannot contain, and that is a change to this table.

### 6.2 What the seed holds, and the ordering it forces

QA may not read `src/**` (RULE-05), so these facts arrive here or not at all. They also correct
`.ai/standards/data-model.md`, which describes the seed and omits groups entirely — F-3.

**The seed holds exactly two groups:**

- `Engineering`, at the top level, with one child and one member.
- `Platform`, beneath `Engineering`, with no children and **two** members.

**And three members, each belonging to a group, occupying a seat and owning a device** — which is
AC-9's Given, satisfied by any of them, with nothing to construct.

Four constraints follow, and they are this design's rather than QA's to discover.

1. **`tests/e2e/groups.spec.ts` runs in serial mode** — `test.describe.configure({ mode: "serial" })`.
   `playwright.config.ts` already sets `workers: 1` for the whole suite, but the criteria here assert
   *the tree is unchanged* and *no other group is changed*, and those are assertions about a shared
   mutable store. Serial mode inside the file makes the order this section depends on explicit rather
   than incidental.
2. **AC-12 uses the seed READ-ONLY, or builds its own.** Pressing Delete on `Engineering` writes
   nothing — that is the criterion — so the seed survives it. Building the Given instead (create `X`,
   create `Y` beneath `X`, delete `X`) is equally valid and does not depend on the seed at all;
   **prefer it**, so that AC-12 does not fail if AC-13 has already run.
3. **AC-13 consumes a fixture and must run last.** It is the only criterion whose Given this ticket
   cannot construct — out-of-scope item 1 means nothing here puts a member into a group — so it needs
   `Platform`, and deleting `Platform` detaches its two members permanently for the rest of the
   process. There is exactly one retry available afterwards: `Engineering` is then childless and still
   holds one member. **Place AC-13's e2e test at the end of the file.**
4. **Every group this suite creates, it deletes again**, unless the criterion consumed it. The
   surface the spec leaves behind should be the surface it found, minus `Platform`.

**AC-13's survival clauses are covered at the seam as well as through the UI.** *Every member who
belonged to `A` still exists, keeps their attributes, the seat they occupy and the devices they own*
is four assertions, and `deleteGroup`'s `membersDetached` count plus a read of the members, seats and
devices collections asserts all four in one unit test, at the point where the write actually happens.
The e2e half asserts what the person sees: the group is gone from the tree, and the two members are
still on `/members` with the seats they had. Section 6.3 has the selectors for that.

### 6.3 Selectors this ticket needs from other tickets' designs, restated

AC-9 and AC-10 assert that nothing on a member, a seat or a device changed, and AC-13 asserts that
two members survived with their seats and devices. None of that is observable on `/groups`. These
testids are already in the markup and belong to `MEM-01`, `SEA-01` and `DEV-01`; they are restated
here because section 6 is QA's only channel and a selector QA cannot see is a selector QA cannot use.

| data-testid | Renders | Route | Used by |
|---|---|---|---|
| `members-row-<email>-name` | The member's full name | `/members` | AC-9, AC-13 |
| `members-row-<email>-seats` | The seat codes they occupy, comma-separated, or `none` | `/members` | AC-9, AC-10, AC-13 |
| `seats-row-<code>-occupant` | The occupant's full name, or `no occupant` | `/seats` | AC-10 |
| `seats-row-<code>-status` | `OCCUPIED` or `VACANT`, derived (INV-03) | `/seats` | AC-10 |
| `devices-row-<assetTag>-owner` | The owner's full name, or `unowned` | `/devices` | AC-9, AC-10, AC-13 |
| `devices-row-<assetTag>-seat` | The seat code, or `unassigned` | `/devices` | AC-10 |
| `devices-row-<assetTag>-rank` | The designation | `/devices` | AC-10 |

**These are read-only for this spec.** A groups test that pressed a control on any of those three
surfaces would be writing another ticket's data, and `tests/e2e/members.spec.ts` already asserts that
nothing else moved.

### 6.4 Behavioural facts QA cannot get from the story

Four, each of which the story left to this stage or did not reach.

1. **Name comparison is exact and case-sensitive** (F-2). `Platform` and `platform` may sit under the
   same parent, and creating the second is a success, not a refusal. A test that assumed otherwise
   would be asserting a rule nobody wrote.
2. **Names are trimmed before they are stored and before they are compared.** `  Platform  ` is
   stored as `Platform` and collides with an existing `Platform`. The row testid therefore uses the
   **trimmed** name in its path.
3. **A group with children shows no confirm control at all** (F-4). AC-12's sequence is: press
   `groups-row-<path>-delete`, `group-delete-refused-dialog` appears, `group-delete-confirm` is never
   rendered, dismiss it. Asserting the tree is unchanged afterwards is the criterion.
4. **A cycle refusal renders against the parent field, a duplicate-name refusal against the name
   field** — on both the create and the edit form. Both refusals are also assertable at the seam,
   where `UpdateGroupOutcome` distinguishes `ANCESTOR_CYCLE` from `DUPLICATE_NAME_IN_PARENT`.

## 7. Rejected alternatives

Eight. Each was a live option at some point in writing this document.

### A — key the rows by group `id`

The obvious choice, and it is what the scaffold's `rowKey` does today. Rejected because ids are minted
with `crypto.randomUUID()`: a test that creates `Product` has no way to name the row it just made, and
the alternative — reading the id back out of the DOM — makes every selector depend on a value the test
did not choose. MEM-01 reached the same conclusion about members and keyed them by `email`. Groups have
no `@unique` field to borrow, which is what made the path key necessary rather than merely tidy.

### B — filter the group and its descendants out of the edit form's parent select

Better UX, and rejected on testability. AC-8 refuses a move that would make a group its own ancestor;
a select that cannot express the move makes the refusal unreachable through the interface, so it is
never tested, and it stops holding the day a second caller arrives. The same argument kept the empty
role placeholder on MEM-01's edit form. The refusal is the server's, and the control is what proves
the server has it.

### C — cascade the delete to child groups, or reparent them to the top level

Rejected by the operator at `Q-1`, on three grounds recorded in the story: consistency with ADR-005,
the mis-click that destroys a branch of departments, and a silent structural change that no audit log
can explain afterwards. It is listed here because F-5 found that `prisma/schema.prisma:153` **performs
the reparent** — so this alternative is not hypothetical, it is what the system does if the seam ever
stops refusing first. Out-of-scope item 12 forbids re-opening it.

### D — hold sibling uniqueness with `@@unique([parentId, name])` in the schema

The right instinct, and wrong twice. It is a schema change, which is RULE-09 and out-of-scope item 11.
More importantly it would not work: PostgreSQL treats `NULL` as distinct from `NULL` in a unique index,
so two top-level groups named `Platform` would both be accepted while `Engineering/Platform` twice was
refused — a rule that holds everywhere except the level every tree has (F-2). INV-10 is the precedent
for a constraint held in `src/lib/data/`, and this one has a better claim to it than INV-10 does.

### E — a recursive nested `<ul>` component instead of flattening into `DataTable` rows

Renders the tree more honestly, and rejected on three counts: `DataTable` already carries the row
testid convention every other surface uses, the actions column needs a table's alignment to stay
readable, and a recursive component makes the *order* of rows a property of the recursion rather than
of a list QA can enumerate. Depth survives as an indent on the name cell; the assertable facts —
parent and children — are columns, because a CSS indent is not in the selector contract and never
should be.

### F — a `listGroupTree()` seam function returning a nested DTO

Moves the projection behind the seam, and puts a new *shape* across it. `seam-parity.test.ts` checks
names and arity, not shapes, so a mock returning a nested tree the Prisma implementation cannot
reproduce passes parity and breaks at the swap. `architecture.md` says the same thing in its own
words. MEM-01 rejected the equivalent `listMemberRows()` for this reason and joined in the page
instead; this ticket does the same.

### G — one delete dialog, with the refusal returned from the confirm

This is what AC-12's *and confirm* literally describes, which is why it was considered rather than
dismissed. Rejected because it asks a person to confirm a destructive action that will not happen,
and because the refusal then arrives as the *outcome of a delete* rather than as a rule about the
tree. MEM-01 rejected the same shape for INV-12. The residue is F-4, and it is handled by making the
interaction explicit in section 6.2 rather than by rewriting a criterion that is not this stage's to
rewrite.

### H — fold case when comparing sibling names

`Platform` and `platform` beneath one parent are almost certainly a mistake by whoever typed the
second. Rejected because the model imposes no case rule on `Group.name`, so folding it here would be
stricter than the model — and stricter in the invisible direction, since a wrongly-refused creation
looks like a working validation. MEM-01 settled `Member.email` the same way against a column that at
least had `@unique` on it; this one does not even have that. If case-insensitive identity is wanted it
is a schema decision, and it is human.

## Changelog

- `2026-08-25T07:14:49Z` — initial. Seven findings. `Q-3` answered (F-1), `Q-4`'s two residues
  answered (F-2), `Q-7` answered (F-3). `allowed_paths` enumerated at ten files; `size` set to `M`,
  agreeing with `size_estimate`. `schema_delta` stays `none` and `requires_adr` stays `false`. Gate
  `PASS`. Written by `tech-lead-design`.
