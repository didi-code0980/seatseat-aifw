---
ticket: GRP-02
stage: DESIGN
agent: tech-lead-design
produced_at: 2026-08-26T03:28:58Z
inputs_read: [ .ai/board/tickets/GRP-02/ticket.yaml, .ai/board/tickets/GRP-02/01-story.md, .ai/registry/features.md, .ai/registry/invariants.md, .ai/registry/glossary.md, .ai/standards/architecture.md, .ai/standards/rbac-and-security.md, .ai/standards/testing-standards.md, .ai/standards/integrations.md, .ai/templates/tech-design.md, .ai/board/tickets/GRP-01/02-design.md, .ai/board/tickets/MEM-01/01-story.md, "src/** — read to answer Q-1 and Q-3", prisma/schema.prisma, eslint.config.mjs, playwright.config.ts, tests/e2e/members.spec.ts ]
consulted:
  - with: ba
    asked: "Nothing was asked. Q-1 and Q-3 were routed to this stage by the story and are answered from the tree, not from the BA."
    answer: "n/a"
    resulted_in_amendment: false
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: IN_PROGRESS
---

# GRP-02 — Member assignment to groups — technical design

**Two of the story's five open questions were routed here and both are answered below from the
tree.** `Q-1` — does the seam write `Member.groupId`, and does anything resolve a group id to a
group name — is F-1. `Q-3` — which surface holds the assignment control — is F-2. The other three
(`Q-0`, `Q-2`, `Q-4`) are the operator's and this stage does not touch them; `Q-5` is the operator's
and section 4 states what would change if it is answered the other way.

**Nothing here is blocked.** `schema_delta` is `none` and it is verified rather than assumed —
`prisma/schema.prisma:166` already declares `groupId String?` and line 167 the relation, so this
ticket adds no column and needs no ADR (RULE-09).

## 0. Findings

Seven. F-1 and F-2 discharge the story's routed questions; F-3 through F-7 are facts the story could
not reach and that change what the Developer and QA must do.

### F-1 — `Q-1` ANSWERED. Nothing writes `Member.groupId` but the detach, and nothing resolves a name

Both halves of `Q-1`, read off the tree.

**No seam function assigns a group.** `src/lib/data/mock/members.ts` exports six functions and none
of them writes `groupId` in the direction that carries information: `createMember` writes the literal
`null` (`mock/members.ts:57`, and `NewMember` in `types.ts` has no field for one), and `updateMember`
cannot express it — `MemberPatch` is `fullName`, `email`, `role` and the doc comment on it says in
terms that *`groupId` is absent for the same reason it is absent from NewMember*. The only writer in
the whole tree is `deleteGroup` in `mock/groups.ts`, which sets the field to `null`. **The story's
sentence that *the only transition the system can perform on group membership is losing it* is
literally true of the code**, and this ticket adds exactly one function to change that.

**Nothing resolves a group id to a group name, and nothing needs to be added to the seam for it to.**
MEM-01's out-of-scope item 5 was correct when written. GRP-01 then added `listGroups()`,
`getGroup(id)` and `listChildGroups(parentId)`, and `listGroups()` is sufficient: the members page
already composes three seam reads into `MemberRow[]` in its own server component, and a fourth read
plus a `Map<id, name>` is the whole of AC-1's resolution. **No read is added to the seam.** Section 3
is the argument, and section 7 alternative D is why a joined DTO is refused.

### F-2 — `Q-3` ANSWERED. The control is on `/members`, and the decisive reason is a contract on the other surface

`Q-3` offered the member surface or the group surface and said both were consistent with every
criterion. They are not equally consistent with the *tree*, and the thing that decides it is written
into `src/app/(app)/groups/page.tsx`:

> **It does not read members, and that is contractual.** Out-of-scope item 2 forbids a group-scoped
> view of members, so no member fact reaches a row on any render […] A `members.*` import here is a
> review finding, not an optimisation.

A chooser on `/groups` needs the member list on `/groups`. That is the import that file names as a
review finding, and this story's own out-of-scope item 4 forbids the same thing from its side. The
group surface is therefore not available, and it is not a close call.

The second reason is AC-3's last clause — *the members list shows that group's name on that member's
row without a manual reload*. A control on `/groups` satisfies it only through a cross-route
invalidation the person does not see happen; a control on `/members` satisfies it the way MEM-01
already satisfies AC-2, with `revalidatePath` plus `router.refresh()`.

**The consequence for `allowed_paths` is the one the story predicted.** The member surface belongs to
`MEM`, and this ticket writes four files under it. GRP-01's design recorded that `GRP-02` *makes
`/members` a second reader and must add the path in the same change*; F-3 is that obligation.

### F-3 — GRP-01 left this ticket a written obligation in `src/actions/groups.ts`, and it is three lines

`src/actions/groups.ts:24-31` says, in the file:

> **`/members` is deliberately not revalidated, although AC-13 writes `Member.groupId`.** […] no
> rendered cell anywhere depends on the field this ticket writes. […] The ticket that restores a
> group column to `/members` — `GRP-02` […] makes `/members` a second reader and must add the path
> in the same change.

That is now false in the direction that matters, and it becomes false the moment AC-1 lands. **All
three group write actions gain `revalidatePath("/members")`**, not only the delete:

- `deleteGroup` — writes `Member.groupId` directly (AC-13). The group column would keep showing a
  deleted group's name.
- `updateGroup` — a rename changes the *text* AC-1 renders on every member row in that group.
- `createGroup` — the assign chooser is rendered by `/members`' server component from `listGroups()`,
  so a group created on `/groups` is missing from the chooser until something else refreshes
  `/members`. **This is MEM-01's finding F-6 exactly**, which was not a theory: a member created on
  `/members` was absent from the owner select on `/devices`, four options where there should have
  been five, and it was measured by QA rather than reasoned about.

`getGroupReferences` still does not revalidate — it writes nothing.

### F-4 — the assign input's type is what keeps `Q-4` unbuilt, and the tree already contains the shape that would build it by accident

Story out-of-scope item 2 and `Q-4`: there is no third verb — *remove from group without assigning
another* is neither built nor refused. That is a statement about behaviour, and under this design it
is held by a **type**, in two places:

- The seam function takes `groupId: string`, **not** `string | null`. A nullable parameter *is* the
  third verb; no discipline is needed to keep it unbuilt if it cannot be expressed.
- The Zod field is `memberGroupIdSchema` (a non-blank string), **not** `groupParentIdSchema`.

The second is the trap. `src/lib/validation/group.ts:29` already exports `groupParentIdSchema`, which
maps `z.literal("")` to `null` — it exists because a top-level group legitimately has no parent. It
is the obvious schema to reach for on a select whose placeholder carries `value=""`, it is one import
away, and reusing it here would silently ship `Q-4`'s verb: the person leaves the chooser on its
placeholder, presses the submit control, and the member is quietly removed from their group. No
criterion asks for that and no criterion refuses it, so **no test would fail**.

Under this design the empty string is a validation refusal — *A group is required.* — rendered
against the group field. Section 7 alternatives E and F are the two ways this was nearly got wrong.

### F-5 — assigning a member to the group they are already in succeeds, and the neighbouring seam function reasons the opposite way

`AssignOccupantOutcome` in `types.ts` says there is deliberately no
`SEAT_ALREADY_OCCUPIED_BY_THIS_MEMBER` arm, and that re-assigning a member to a seat they already
occupy is refused *because INV-01 counts occupants, not identities*, and an idempotent success would
be *a write path that reports having done something it did not do*.

**That reasoning does not transfer, and the difference is that there is no invariant here.** INV-01
makes a second occupant an illegal state; nothing makes a member already being in `Platform` illegal.
AC-3 and AC-4 both assert a postcondition — *the member belongs to that group* — and that
postcondition is true. So the assignment succeeds, and `previousGroupId` comes back equal to
`groupId`, which is exactly how a caller distinguishes the no-op without a reason code for it.

Stated because a reviewer reading `types.ts` top to bottom will find the opposite argument two
hundred lines above this one, and the two are consistent only once the invariant is named.

### F-6 — the seed will not be there when QA needs it, because `groups.spec.ts` runs first and eats it

`playwright.config.ts` sets `fullyParallel: false` and `workers: 1` against **one** `webServer`, and
`src/lib/data/mock/store.ts` says the store is *process-global and does NOT reset between tests*. So
every spec file shares one mutable fixture set, in the order Playwright walks `tests/e2e`, which is
alphabetical by path.

`groups.spec.ts` therefore runs **before** any file this ticket adds whose name sorts after `g`, and
its AC-13 deletes the seeded `Platform` group — detaching Mo Manager and Uma User permanently for the
rest of the process. GRP-01's own section 6.2 says so and calls it consuming a fixture.

**The consequence is a constraint, not a warning:** no Given in this ticket's e2e spec may depend on
the seeded `Platform` group or on any seeded member's group. Section 6.2 requires every Given to be
constructed. It is cheap here in a way it was not for GRP-01 — this is the ticket that can put a
member into a group, so it can build its own world and take it down again.

### F-7 — adding a column does not break `tests/e2e/members.spec.ts`, and this was checked rather than assumed

A new column in a shared `DataTable` is the obvious way to break a neighbouring spec that reads cells
positionally. `tests/e2e/members.spec.ts` does not: `cellText()` addresses
`members-row-<email>-<cell>` by testid, `listedEmails()` matches on a testid suffix, and no assertion
counts columns or reads `<th>`. `rowState()` names five cells explicitly and will keep returning
those five.

**So `tests/e2e/members.spec.ts` is NOT in `allowed_paths`** and a diff touching it is a review
finding under R1. The same holds for `tests/unit/members.test.ts`: its three `groupId` assertions
(lines 163, 309, 342) assert that `createMember` writes null and that `MemberPatch` cannot express a
group, and both stay true — this ticket adds a function beside them and changes neither.

## 1. Contract

Exact and copy-pasteable. Every field name that appears in the code appears here first (RULE-04). The
Developer implements this and invents nothing.

### 1.1 Seam DTO — `src/lib/data/types.ts`, additive only

One type is added. `Member`, `NewMember` and `MemberPatch` **do not change**, and that is what keeps
this ticket out of the `XL` band (section 5).

```ts
/**
 * GRP-02, AC-3, AC-4, AC-6, AC-7.
 *
 * `groupId` is not nullable on the way in, and the absence of a null is the whole of how
 * out-of-scope item 2 is held: "remove from a group without assigning another" is a verb the story
 * neither grants nor refuses (Q-4), and a signature that cannot express it cannot ship it by
 * accident. 02-design.md F-4.
 *
 * `previousGroupId` is the group the member belonged to before, or null when they belonged to none.
 * It is RETURNED rather than inferred, for the reason `DeleteRoomOutcome` returns its counts and
 * `DesignatePrimaryOutcome` returns `demotedDeviceId`: AC-4's "no longer belongs to Engineering" is
 * then assertable at the seam, where the write actually happens, and not only through a rendered
 * cell.
 *
 * Two reason codes and not one `ILLEGAL`, for the reason `DesignatePrimaryOutcome` gives at length:
 * a shared reason code makes two failures indistinguishable in a test, which is how the bug
 * survives. AC-6 asserts the GROUP_NOT_FOUND arm specifically.
 *
 * Assigning a member to the group they already belong to SUCCEEDS, with `previousGroupId` equal to
 * `groupId`. There is no arm for it and it is not an oversight — 02-design.md F-5 says why this
 * reasons the opposite way from `AssignOccupantOutcome` two hundred lines above.
 */
export type AssignMemberToGroupOutcome =
  | { assigned: true; member: Member; previousGroupId: string | null }
  | { assigned: false; reason: "MEMBER_NOT_FOUND" | "GROUP_NOT_FOUND" };
```

### 1.2 Seam function — identical name and arity in both implementations

One function is added to `src/lib/data/mock/members.ts` and to `src/lib/data/prisma/members.ts`.
Identical name, identical arity, or `tests/unit/seam-parity.test.ts` fails — `members` is already in
its `PAIRS` list and that file needs no edit.

```ts
export async function assignMemberToGroup(
  memberId: string,
  groupId: string
): Promise<AssignMemberToGroupOutcome>;
```

**The Prisma half is a `notWired` stub**, parameters declared and discarded with `void`, exactly as
the six functions beside it. An omitted parameter is arity drift the type system will not see and
the parity test will.

**The mock half obeys five rules**, and they are numbered because section 3.1 refers to them.

1. **Every check runs before the first write.** AC-8's *the member's name, email and role are
   unchanged* and AC-6's *the member's group is unchanged* are assertions about a refusal having
   written nothing. A partially applied write cannot occur if no write precedes the last check.
2. **`MEMBER_NOT_FOUND` is checked before `GROUP_NOT_FOUND`.** The member is the subject of the
   operation; a request naming neither should report the missing subject, not the missing argument.
3. **`GROUP_NOT_FOUND` is the seam's refusal and not the caller's** (AC-6). Whether the chosen group
   still exists is stored data the caller did not supply, and the chooser was rendered from a read
   taken before the group was deleted. The surface may not pre-check it into existence.
4. **Exactly one field is written, on exactly one row.** `member.groupId = groupId` and nothing else.
   AC-8, AC-9, AC-10 and AC-11 are all the same claim about scope, and the strongest form of it is a
   function whose only assignment statement is that one.
5. **`groups` is imported from `./store`, read as the array.** Rule 3 needs the group collection;
   `store.ts` re-exports the fixture arrays themselves, so this module and `mock/groups.ts` hold the
   same object and cannot disagree about which groups exist. It is read as an array rather than
   through `listGroups()`, for the reason the file's existing header gives about `seats` and
   `devices`: a seam module calling another seam module's clone-returning read to answer a predicate
   is a structured clone of the whole collection on every write. **There is no cycle** — both modules
   import `./store`, neither imports the other.

```ts
/**
 * AC-3, AC-4, AC-6, AC-7, AC-8.
 *
 * `groupId` is non-nullable, so this function cannot remove a member from a group. That is
 * out-of-scope item 2 held by the signature rather than by a check (02-design.md F-4).
 *
 * Both refusals run before the write (rules 1, 2, 3). AC-8's "the member's name, email and role are
 * unchanged" and AC-6's "the member's group is unchanged" are assertions about a refusal having
 * written nothing.
 *
 * It touches no seat, no device and no room, and the mechanism is the import list: there is no path
 * from this line to any of them. AC-11 is a property of the file (02-design.md section 3.1).
 */
export async function assignMemberToGroup(
  memberId: string,
  groupId: string
): Promise<AssignMemberToGroupOutcome> {
  const member = members.find((m) => m.id === memberId);
  if (member === undefined) return { assigned: false, reason: "MEMBER_NOT_FOUND" };

  if (!groups.some((g) => g.id === groupId)) {
    return { assigned: false, reason: "GROUP_NOT_FOUND" };
  }

  const previousGroupId = member.groupId;
  member.groupId = groupId;
  return { assigned: true, member: structuredClone(member), previousGroupId };
}
```

### 1.3 Zod schemas — `src/lib/validation/member.ts`, additive

```ts
/**
 * GRP-02. A group id, required.
 *
 * It is NOT `groupParentIdSchema` from `./group`, and the difference is the whole of out-of-scope
 * item 2. That schema maps `z.literal("")` to null because a top-level group legitimately has no
 * parent; here the empty string arrives from the chooser's placeholder and mapping it to null would
 * silently build the "remove from group" verb the story neither grants nor refuses (Q-4), with no
 * criterion to fail. 02-design.md F-4 and section 7 alternative E.
 *
 * It carries its own message rather than reusing `groupIdSchema`, which has none: the action's
 * `fieldErrors` helper renders the first message per field, and Zod's default for `.min(1)` is not
 * a sentence anyone should read.
 */
export const memberGroupIdSchema = z.string().trim().min(1, "A group is required.");

/** AC-3, AC-4. The id comes from a rendered row; the group id comes from the chooser. */
export const assignMemberToGroupSchema = z.object({
  id: memberIdSchema,
  groupId: memberGroupIdSchema,
});

export type AssignMemberToGroupInput = z.infer<typeof assignMemberToGroupSchema>;
```

`createMemberSchema`, `updateMemberSchema` and `memberIdOnlySchema` **do not change**. No group field
is added to either write form, which is what keeps `updateMember` unable to move a member between
groups (F-1) and AC-8 assertable.

### 1.4 Server action — `src/actions/members.ts`, additive

Three existing types gain one member each. All three changes are additive; no existing arm moves.

```ts
export type MemberFieldName = "fullName" | "email" | "role" | "groupId";

const MEMBER_FIELD_NAMES: readonly string[] = ["fullName", "email", "role", "groupId"];

export type MemberActionError =
  | { kind: "VALIDATION"; fields: Partial<Record<MemberFieldName, string>> }
  | { kind: "DUPLICATE_EMAIL"; fields: { email: string } }
  | { kind: "GROUP_NOT_FOUND"; fields: { groupId: string } }   // GRP-02, AC-6
  | { kind: "REFERENCED"; references: MemberReferences }
  | { kind: "NOT_FOUND"; message: string };

const GROUP_GONE_MESSAGE = "That group no longer exists.";
```

`GROUP_NOT_FOUND` carries a **field map and not a bare message**, so AC-6's refusal renders against
the control the person used. This is GRP-01's `PARENT_NOT_FOUND` shape and the same reasoning: a
refusal about a chosen value belongs where the value was chosen.

```ts
/**
 * AC-3, AC-4, AC-6, AC-7, AC-8.
 *
 * Five steps in the order `coding-standards.md` fixes: "use server", parse, check permission, call
 * the seam, return a typed result. Step 3 is absent by specification, as it is on every other action
 * in this file and in `actions/groups.ts` — see section 2.
 */
export async function assignMemberToGroup(
  input: unknown
): Promise<MemberActionResult<Member>> {
  const parsed = assignMemberToGroupSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification. There is no session and no role
  // to compare (01-story.md, Permissions). The check belongs on this line, and WHICH check is
  // itself open: `Q-2` asks whether a Manager may assign, and 02-design.md section 2 records both
  // readings without choosing between them.

  const outcome = await members.assignMemberToGroup(parsed.data.id, parsed.data.groupId);
  if (!outcome.assigned) {
    if (outcome.reason === "MEMBER_NOT_FOUND") return notFound();
    return {
      ok: false,
      error: { kind: "GROUP_NOT_FOUND", fields: { groupId: GROUP_GONE_MESSAGE } },
    };
  }

  // One path. `/devices` renders member NAMES for the owner select and no group data, and this
  // action changes no member's name — so MEM-01's F-6 two-path rule does not extend here. `/groups`
  // renders no member data at all, contractually (F-2).
  revalidatePath("/members");
  return { ok: true, data: outcome.member };
}
```

**The return payload is the `Member`, not the outcome.** `previousGroupId` is a seam-level fact that
exists so AC-4 is assertable in a unit test; no rendered element needs it, and putting it in the
action's success payload would be a field the client is expected to have a use for.

### 1.5 Server action change — `src/actions/groups.ts`

`revalidatePath("/members")` is added to `createGroup`, `updateGroup` and `deleteGroup`, beside the
existing `revalidatePath("/groups")` in each. The block comment at the head of that file that says
`/members` is deliberately not revalidated is **replaced**, not deleted — it names GRP-02 as the
ticket that must change it, and the replacement should say what changed and keep F-3's three reasons.

Nothing else in that file moves. No signature, no error type, no message string.

### 1.6 UI — `src/app/(app)/members/page.tsx`

The server component gains **one seam read and two projections**. It still holds no state.

```ts
export interface MemberRow {
  member: Member;
  occupiedSeatCodes: string[];
  hasAccount: boolean;
  /**
   * AC-1, AC-2. The NAME of the group this member belongs to, or null when they belong to none.
   *
   * A name and not an id, which is the whole point of the column: MEM-01 dropped it because it
   * rendered a cuid, and a cuid names nothing to a person (ADR-005's ground).
   *
   * Null ALSO when `groupId` names no group. That is a corrupt-store state the seam refuses to
   * create — `assignMemberToGroup` checks the group exists, `deleteGroup` detaches rather than
   * stranding, and `prisma/schema.prisma:167` declares `onDelete: SetNull` — and rendering the
   * empty state is the honest answer rather than rendering the unresolvable id.
   */
  groupName: string | null;
}

/** One option in the assign chooser. AC-5. */
export interface GroupOption {
  id: string;
  /** Ancestor names from the root, joined by "/". The label; the value is `id`. */
  path: string;
}
```

The page reads `members.listMembers()`, `seats.listSeats()`, `accounts.listAccounts()` and — new —
`groups.listGroups()`, all four in one `Promise.all`, and composes:

- `groupName` from a `Map<id, name>` built over the group list. **This is the whole of AC-1's
  resolution and it adds nothing to the seam** (F-1, section 7 alternative D).
- `groupOptions: GroupOption[]` by **the same walk `/groups` renders**: bucket groups by
  `parentId ?? ""`, sort each bucket by `name` with `localeCompare`, then walk pre-order from the
  top level building `path` as `parent.path + "/" + name`. A group unreachable from a root — a
  `parentId` naming no group, or a cycle — is omitted, which is exactly the set `/groups` shows, and
  both are states the seam refuses to create (`PARENT_NOT_FOUND`, `ANCESTOR_CYCLE`).

**Walking down from the roots rather than climbing `parentId` upwards is a decision, not a style
choice.** The store is a process-global mutable array; a climb over data that was already cyclic
would hang the render rather than fail a test, and would then need a step bound that has to be
invented. The downward walk terminates on the shape of the data. GRP-01's page takes the same route
for the same reason.

**Duplication, stated rather than hidden.** `groups/page.tsx` computes an equivalent path for its own
rows. This design does **not** extract a shared module and does not put `groups/page.tsx` in
`allowed_paths`: the shared thing is the *convention* — ancestor names joined by `/` — and section 6
is where a convention QA depends on is fixed. Refactoring a shipped surface whose e2e spec addresses
rows by that exact path, to save eight lines, is risk this ticket has no reason to take. If a third
surface needs it, that is the ticket that extracts it.

`MembersManager` is called as `<MembersManager rows={rows} groupOptions={groupOptions} />`.

### 1.7 UI — `src/app/(app)/members/members-manager.tsx`

Four changes. Nothing existing is removed.

1. **A `Group` column**, placed after `Role` and before `Seats occupied`. Renders `groupName`, or the
   literal `none` when it is null. **`none` is the same literal MEM-01 uses for a member occupying no
   seat and GRP-01 uses for a group with no parent**, and it satisfies AC-2's *distinguishable from a
   group whose name is blank* because GRP-01's `groupNameSchema` makes a blank name unreachable —
   which AC-2 says itself.
2. **An `Assign group` button on every row**, beside `Edit` and `Delete`, **unconditional**. It is
   not hidden for a member who already has a group — that member is AC-4's subject — and it is not
   hidden when no group exists. The empty case is handled inside the dialog (item 3), because hiding
   a control makes the state that produced it untestable, which is the reasoning MEM-01 gives for
   showing `Delete` on a member who cannot be deleted.
3. **An assign dialog**, built on `EntityFormDialog` with `testIdPrefix="member-assign"`, holding one
   `Select`:
   - The placeholder is `Select a group` with `value=""`. It is always rendered. An unmade choice
     therefore arrives as the empty string and is refused by `memberGroupIdSchema` — **it is not an
     unassignment** (F-4).
   - Every other option's `value` is a group id and its label is that group's `path`. **Paths, not
     bare names**: GRP-01's AC-4b puts two groups named `Platform` in the tree at once, and a chooser
     showing `Platform` twice is a control through which neither a person nor a test can say which
     one they meant. This is GRP-01's `ParentOptions` reasoning, and the labels agree with the
     `groups-row-<path>` testids by construction.
   - `defaultValue` is the member's current `groupId ?? ""`, keyed on the member's id so the control
     remounts when the target row changes — MEM-01's pattern for the edit form's three controls.
   - **Nothing is filtered out.** The member's current group stays in the list; choosing it is F-5's
     successful no-op.
   - When `groupOptions` is empty, the select renders the placeholder alone and the dialog shows a
     sentence saying no group exists yet. Nothing else changes; submitting is refused by the schema.
4. **`submitAssign`** follows `submitEdit` exactly: set pending, call the action, on failure store the
   error, on success clear it, close the dialog and `router.refresh()` — which is AC-3's and AC-4's
   *without a manual reload*.

State added: `assignTarget: MemberRow | null` and `assignError: MemberActionError | null`.
`fieldMessages()` gains `GROUP_NOT_FOUND` to its list of field-carrying kinds; `looseMessage()` is
unchanged and already returns the `NOT_FOUND` sentence for a member deleted in another tab.

## 2. Permission model

**No rank check is implemented by this ticket, and one cell of the intended model is undecided.**
Both statements are the story's (out-of-scope item 11, `Q-2`) and this section records them at the
level of the action.

| Operation | Control | Intended gate | Implemented here |
|---|---|---|---|
| Read the members list, including the group column | `/members` page render | `MANAGER` | no — no session exists |
| Assign / re-assign a member to a group | `assignMemberToGroup` action | **open — `Q-2`**, `MANAGER` or `ADMIN` | no |
| Open the assign dialog | `members-row-<email>-assign` | mirrors the action's gate | no |
| Read the group tree for the chooser | `groups.listGroups()` on `/members` | `MANAGER` | no |

**`ADMIN` is `yes` on every row** by *Admin: everything*. **`USER` is `no` on every row**, on MEM-01's
ground: *manage their own devices* is the whole of the User scope that touches this data.

**The `MANAGER` cell is `Q-2` and this stage does not fill it in.** The story sets out both readings
and neither is weak: GRP-01's `Q-6` put the four group *write* verbs at `ADMIN` only, and this is a
write on a **Member**, which `rbac-and-security.md` places inside the Manager scope. Choosing here
would be inventing the operator's position on a question they were not asked, and section 7
alternative G is why the neighbouring answer does not extend by itself.

**Where the check goes when it exists.** In the server action, on the line the code comment marks,
**before** the seam call and after the Zod parse — `validate, then authorize, then call the seam`, and
`rbac-and-security.md` is explicit that `PermissionGate` hides a control and does not protect an
endpoint. Review check R6 compares the implementation against this table.

**The exposure, stated rather than implied.** With no gate, anyone who can reach the application can
move any person into any department. That is the current state of every write surface in this system
and it is not made worse here; it is written down because a table of intended gates that does not say
it is enforced by nothing reads like a control.

**`PermissionGate` is not imported by `members-manager.tsx`.** MEM-01's file says why and it still
holds: a control wrapped in a gate fed a hard-coded role renders a surface that looks guarded and is
not.

## 3. Seam impact

**One function added. No existing signature changes, and no existing caller is affected.**

| File | Change |
|---|---|
| `src/lib/data/types.ts` | `AssignMemberToGroupOutcome` added. `Member`, `NewMember`, `MemberPatch` untouched |
| `src/lib/data/mock/members.ts` | `assignMemberToGroup` added; `groups` added to the `./store` import |
| `src/lib/data/prisma/members.ts` | `assignMemberToGroup` added as a `notWired` stub |

**No read is added** — AC-1 is served by `listGroups()`, which GRP-01 already built (F-1). Section 7
alternative D is why a joined `listMemberRows()` is refused.

**`tests/unit/seam-parity.test.ts` needs no edit.** `members` is already in its `PAIRS` list, so the
new pair is compared automatically and fails on the first arity drift.

### 3.1 Where each rule is held

| Rule | Held by | Not by |
|---|---|---|
| AC-6 — the chosen group must still exist | `assignMemberToGroup`, rule 3 | the chooser, which was rendered from an earlier read |
| AC-7 — at most one group | `Member.groupId` being a scalar, and `assignMemberToGroup` writing it rather than appending | any check |
| AC-8 — nothing else about the member changes | rule 4: one assignment statement | an assertion |
| AC-9 — nothing deletes a member | `AssignMemberToGroupOutcome` has no arm that could report it, and no `splice` exists on this path | the UI omitting a control |
| AC-10 — no group is created, renamed, moved or deleted | `mock/members.ts` reading `groups` and never writing it | discipline |
| AC-11 — no seat, device, room or occupancy is touched | the import list: `mock/members.ts` imports `devices` and `seats` for INV-12's predicate only, and this function names neither | a test |
| out-of-scope item 2 — no third verb | `groupId: string` and `memberGroupIdSchema` (F-4) | a review comment |

**An import of `rooms` into `mock/members.ts`, or a write to `groups` from it, is a review finding
under R8 regardless of what it is used for.** This is `mock/groups.ts`'s rule stated from the other
side.

## 4. Schema delta

**`none`. Verified, not assumed.**

`prisma/schema.prisma:166-167` already declares `groupId String?` and
`group Group? @relation(fields: [groupId], references: [id], onDelete: SetNull)`, and line 180 an
`@@index([groupId])`. Line 156 declares `members Member[]` on `Group`. Every field this ticket writes
exists in the draft model, so `requires_adr` stays `false` and nothing here is human-gated.

**Two things worth recording while the file is open.**

- **The model agrees with GRP-01's detach, and this is the mirror of GRP-01's F-5.** `Member.group`
  is `onDelete: SetNull`, which is exactly what `deleteGroup` does to its members (AC-13). GRP-01
  found the opposite on `Group.parent` — the schema would silently reparent children the seam
  refuses to strand. The member relation carries no such disagreement.
- **`Q-5` is a schema question and the schema currently answers it the narrow way.**
  `prisma/schema.prisma:150-151` says so in a comment: *Whether a Member may belong to more than one
  Group is also open — modelled here as one, which is the narrower reading and the easier one to
  widen later.* AC-7 writes that reading down and this design implements it. **If the operator answers
  `Q-5` as many-to-many, this ticket's contract does not survive it**: a scalar `groupId` becomes a
  join table, `AssignMemberToGroupOutcome` loses its meaning, and that is a schema change requiring
  an ADR under RULE-09 — not a widening of anything below. Section 7 alternative H.

## 5. allowed_paths

Ten files. Enumerated, not globbed.

```yaml
allowed_paths:
  - "src/app/(app)/members/page.tsx"
  - "src/app/(app)/members/members-manager.tsx"
  - "src/actions/members.ts"
  - "src/actions/groups.ts"
  - "src/lib/validation/member.ts"
  - "src/lib/data/types.ts"
  - "src/lib/data/mock/members.ts"
  - "src/lib/data/prisma/members.ts"
  - "tests/unit/member-groups.test.ts"
  - "tests/e2e/member-groups.spec.ts"
```

| Path | New or changed | Why it is in reach |
|---|---|---|
| `src/app/(app)/members/page.tsx` | changed — one read, two projections | AC-1, AC-2, AC-5 (1.6) |
| `src/app/(app)/members/members-manager.tsx` | changed — one column, one button, one dialog | AC-1 to AC-6 (1.7) |
| `src/actions/members.ts` | changed — one action, three additive type members | 1.4 |
| `src/actions/groups.ts` | changed — **three lines** | F-3, and GRP-01 wrote the obligation into the file |
| `src/lib/validation/member.ts` | changed — additive | 1.3, and F-4 is why the schema is new rather than imported |
| `src/lib/data/types.ts` | changed — **additive only** | 1.1 |
| `src/lib/data/mock/members.ts` | changed — one function added | 1.2 |
| `src/lib/data/prisma/members.ts` | changed — one `notWired` stub | parity |
| `tests/unit/member-groups.test.ts` | new | QA |
| `tests/e2e/member-groups.spec.ts` | new | QA |

**Six paths a reader might expect, deliberately absent.** A diff touching any of them is a review
finding under R1.

- `src/app/(app)/groups/page.tsx` and `groups-manager.tsx` — F-2. The chooser is not on that surface
  and the path duplication is accepted with reasons (1.6).
- `tests/e2e/members.spec.ts` and `tests/unit/members.test.ts` — F-7, checked rather than assumed.
- `tests/unit/seam-parity.test.ts` — `members` is already in `PAIRS`.
- `src/lib/data/fixtures.ts` — the seed already holds three members in two groups, and changing it
  changes what five other spec files see.
- `src/lib/validation/group.ts` — F-4. Reaching into it for `groupParentIdSchema` is the mistake, not
  the shortcut.
- `prisma/schema.prisma` — section 4, and RULE-09.

**Why the tests are new files rather than additions to `members.spec.ts`.** Three reasons and the
third is the one that decides it: this ticket's subject is neither entity alone; MEM-01's spec would
have to be opened by QA to add to it, which puts another ticket's file in `allowed_paths` for no
gain; and **F-6** — the ordering constraint this suite lives under is GRP-02's own, and burying it in
a file whose header already carries two other tickets' constraints is how it gets lost.

**`size: M`.** Ten files against the sizing table in `.ai/01-operating-model.md` — `M` is up to 12.

**It is not `XL`, and the row that would say otherwise is read with the paragraph beneath it.** The
`XL` row names `types.ts`, which this ticket changes; the paragraph fixes the test as *whether
existing callers must change, not whether the seam was touched at all*, and adds that *adding new
functions to `src/lib/data/` is ordinary feature work*. One type is added beside `Member`, which does
not change; one function is added; no existing signature moves; no existing caller is affected.
GRP-01 and MEM-01 are both worked precedents, additive in the same file and both sized `M`.

**The verdict agrees with `size_estimate: M`. Nothing routes back to `ba`.**

## 6. Testability contract

RULE-05 makes this section the only channel through which selectors reach QA. A control missing from
these tables does not exist as far as QA is concerned, and check R7 verifies the reverse.

`<email>` in a row testid is the member's email **exactly as stored** — `memberEmailSchema` trims but
does not lowercase. `<path>` in a group row testid is the group's full path from the root, ancestor
names joined by `/`. Both conventions are inherited, from MEM-01 and GRP-01 respectively.

### The table — what this ticket adds

| data-testid | Element | Used by |
|---|---|---|
| `members-row-<email>-group` | The **name** of the group this member belongs to, or the literal `none`. Bare — the value and nothing else | AC-1, AC-2, AC-3, AC-4, AC-8, AC-10, AC-11 |
| `members-row-<email>-assign` | Opens the assign dialog for that row. Present on **every** row, whether or not the member has a group and whether or not any group exists | AC-3, AC-4, AC-5, AC-6, AC-9 |
| `member-assign-dialog` | The assign dialog | AC-3, AC-4, AC-5, AC-6, AC-7 |
| `member-assign-group` | The group select. The placeholder `Select a group` carries `value=""`; every other option's value is a group id and its label is that group's **path**. Defaults to the member's current group, or to the placeholder when they have none | AC-3, AC-4, AC-5, AC-7 |
| `member-assign-group-error` | The message against the group. **AC-6's refusal renders here.** Absent while the group is accepted | AC-6 |
| `member-assign-empty` | A sentence rendered inside the dialog **only when no group exists at all**. Absent otherwise | — |
| `member-assign-submit` | Submits the assignment | AC-3, AC-4, AC-6, AC-7 |
| `member-assign-cancel` | Closes the dialog, writing nothing | AC-8, AC-10, AC-11 |
| `member-assign-error` | A message belonging to no field — the member is already gone | — |

`-group` renders **bare**: the value in its own element with the label in the column header, so AC-1's
*shows `Platform`* and AC-2's empty state are assertable without parsing a sentence.

**There is no testid for a control that removes a member from a group, and there is no such control.**
Out-of-scope item 2, `Q-4`, F-4. A QA test that looks for one is testing a verb the story declined to
grant.

### 6.1 What AC-1's "never its identifier" means for a test

AC-1 has two clauses and the second is the one MEM-01's column failed. Asserting
`members-row-<email>-group` equals `Platform` passes on a cell rendering a name. It would also pass on
a cell rendering a name *and* an id, and it says nothing at all if the test never sees a group whose
name and id differ.

**They always differ, and the test can rely on it**: group ids are minted with `crypto.randomUUID()`
for every group created through the interface, so a group QA creates and names `GRP02-Alpha` has an id
that shares no characters with it. Asserting the cell's exact text is the whole of the criterion, and
an assertion that the cell does **not** contain a `-` is a cheap second half.

### 6.2 The state QA may rely on, and the four constraints on this spec

QA may not read `src/**` (RULE-05), so these facts arrive here or not at all.

**The seed holds three members and two groups**, and every member is in a group: `Ada Admin`
(`ada@example.internal`, ADMIN) in `Engineering`; `Mo Manager` (`mo@example.internal`, MANAGER) and
`Uma User` (`uma@example.internal`, USER) both in `Platform`, which sits beneath `Engineering`. So the
seeded paths are `Engineering` and `Engineering/Platform`.

**A member created through the interface belongs to no group.** `createMember` writes the group as
null and the create form has no field for one. **This is AC-2's and AC-3's Given, and it costs
nothing to construct.**

Four constraints follow. They are this design's rather than QA's to discover.

1. **`tests/e2e/member-groups.spec.ts` runs in serial mode** — `test.describe.configure({ mode:
   "serial" })`. `playwright.config.ts` already sets `workers: 1` for the whole suite, but the
   criteria here assert *no other member's group changes* and *nothing else is touched*, and those
   are assertions about a shared mutable store. Serial mode inside the file makes the order explicit
   rather than incidental.
2. **Do not depend on the seeded `Platform` group, or on any seeded member's group.** F-6: spec files
   share one process-global store that does not reset, Playwright walks `tests/e2e` alphabetically,
   and `tests/e2e/groups.spec.ts` runs first and **deletes `Platform`** as its AC-13 — detaching Mo
   and Uma for the rest of the run. Every Given in this file is constructed: create the groups, create
   the members, assert, then take them down again.
3. **Every group and every member this suite creates, it deletes again.** A member this suite created
   occupies no seat and owns no device, so INV-12 does not block deleting them; a group this suite
   created has no children once its own child is deleted first. The surface this spec leaves behind
   should be the surface it found. AC-1 is the one test that may read a seeded row, and it must only
   read.
4. **AC-4's Given is built by AC-3's verb, and that is intended.** Create a member (they have no
   group), assign them to a group, then re-assign them to a second group. This ticket is the first
   that can construct its own Given for a group membership, which is exactly what GRP-01's section
   6.2 said it could not do.

### 6.3 Behavioural facts QA cannot get from the story

Six, each of which the story left to this stage or did not reach.

1. **The chooser's options are labelled with the group's full path**, ancestor names joined by `/`
   — `Engineering`, `Engineering/Platform` — and not with the bare name. Two groups may share a name
   under different parents (GRP-01 AC-4b), so a bare-name chooser is ambiguous by construction. The
   labels agree with the `groups-row-<path>` testids on `/groups`.
2. **The chooser's placeholder is a validation refusal, not an unassignment.** Opening the dialog for
   a member with no group and pressing submit without choosing produces *A group is required.* in
   `member-assign-group-error`, and the member's group is unchanged. It does **not** remove them from
   a group they were in. F-4.
3. **Assigning a member to the group they already belong to succeeds.** No refusal, no error element,
   the cell reads the same name afterwards. F-5.
4. **AC-6's Given is constructible and the sequence is exact**: open the assign dialog for a member
   (this renders the chooser from the group list as it is now), then — without closing it — delete
   that group on `/groups` in a second page or tab, then return and submit. The refusal renders in
   `member-assign-group-error` and the member's `-group` cell is unchanged. Playwright's second page
   on the same context is the ordinary way to do this; the store is shared by the server, not by the
   browser.
5. **Nothing in this ticket writes a group.** Pressing `member-assign-submit` changes no group's name,
   parent or existence, and `/groups` renders identically before and after. AC-10 is asserted by
   reading the `/groups` rows on both sides of an assignment.
6. **A group rename is visible on `/members` without a manual reload of that route** (F-3). Not an
   acceptance criterion — no AC covers it — but it is the observable half of the three
   `revalidatePath("/members")` lines, and a test for it is cheap insurance against them being
   removed as dead code. MEM-01's F-6 is the precedent for why that insurance is worth having.

### 6.4 Selectors from other tickets' designs, restated

Every Given in this spec is constructed, which means this spec drives three other surfaces. These
testids are already in the markup and belong to `MEM-01`, `GRP-01`, `SEA-01` and `DEV-01`; they are
restated because section 6 is QA's only channel and a selector QA cannot see is a selector QA cannot
use.

**On `/members` — MEM-01. Used to build members and to assert AC-8.**

| data-testid | Renders / does | Used by |
|---|---|---|
| `members-page` | The page section | all |
| `members-table` | The table, when at least one member exists | AC-1 |
| `members-create-open` | Opens the create dialog | AC-2, AC-3, AC-4 |
| `member-create-name` / `-email` / `-role` | The three create inputs. The role select's placeholder is `value=""` | AC-2, AC-3, AC-4 |
| `member-create-submit` / `-cancel` | Submits / closes the create form | AC-2, AC-3, AC-4 |
| `members-row-<email>-name` | The member's full name | AC-8 |
| `members-row-<email>-email` | The member's email | AC-8 |
| `members-row-<email>-role` | The member's role, exactly as stored | AC-8 |
| `members-row-<email>-seats` | The seat codes they occupy, comma-separated, or `none` | AC-8, AC-11 |
| `members-row-<email>-signin` | `account` or `no account` | AC-8 |
| `members-row-<email>-delete` | Requests the delete — the cleanup in constraint 3 | — |
| `member-delete-confirm` / `-cancel` | Performs / dismisses the delete | — |
| `member-delete-refused-dialog` | Opens instead, for a member something still refers to | — |

**On `/groups` — GRP-01. Used to build and tear down the groups every Given needs, and to assert AC-10.**

| data-testid | Renders / does | Used by |
|---|---|---|
| `groups-page` | The page section | AC-10 |
| `groups-create-open` | Opens the create dialog | AC-3 to AC-6 |
| `group-create-name` | The name input | AC-3 to AC-6 |
| `group-create-parent` | The parent select. Placeholder `No parent (top level)` carries `value=""`; every other option's value is a group id and its label is that group's path | AC-5 |
| `group-create-submit` / `-cancel` | Submits / closes the create form | AC-3 to AC-6 |
| `groups-row-<path>` | One group row, pre-order | AC-5, AC-10 |
| `groups-row-<path>-name` | The group's name | AC-5, AC-10 |
| `groups-row-<path>-parent` | The parent's name, or `none` | AC-10 |
| `groups-row-<path>-children` | Direct children's names, sorted and comma-separated, or `none` | AC-10 |
| `groups-row-<path>-edit` | Opens the edit dialog — used for 6.3 item 6 | — |
| `group-edit-name` / `group-edit-submit` | Rename a group | — |
| `groups-row-<path>-delete` | Requests the delete — **AC-6's Given, and the cleanup** | AC-6 |
| `group-delete-confirm` / `-cancel` | Performs / dismisses the delete | AC-6 |
| `group-delete-refused-dialog` | Opens instead, for a group with children | — |

**On `/seats` and `/devices` — SEA-01, DEV-01. AC-11 only, and READ-ONLY.**

| data-testid | Renders | Route | Used by |
|---|---|---|---|
| `seats-row-<code>-occupant` | The occupant's full name, or `no occupant` | `/seats` | AC-11 |
| `seats-row-<code>-status` | `OCCUPIED` or `VACANT`, derived (INV-03) | `/seats` | AC-11 |
| `devices-row-<assetTag>-owner` | The owner's full name, or `unowned` | `/devices` | AC-11 |
| `devices-row-<assetTag>-seat` | The seat code, or `unassigned` | `/devices` | AC-11 |
| `devices-row-<assetTag>-rank` | The designation | `/devices` | AC-11 |

**A test that pressed a control on `/seats` or `/devices` would be writing another ticket's data.**
Read those rows before an assignment and after it; that is the whole of AC-11 through the UI, and the
seam half is stronger anyway (section 3.1).

## 7. Rejected alternatives

Eight. Each was a live option and A, E and G were the close ones.

### A — put `groupId` into `MemberPatch` and the existing edit form

The smallest-looking change: one field on a form that already exists, no new action, no new dialog.

**Rejected on three counts, and the first is fatal.** `MemberPatch` is an existing type with an
existing caller; adding a field to it is **not** additive, and the sizing table sends *changes the
signature of an existing `src/lib/data/` function* to `XL`, which escalates. AC-6's refusal would then
have to be a new arm on `UpdateMemberOutcome`, which is a second non-additive change to a shipped
type. And AC-8 — *assigning a member changes nothing else about that member* — stops being a claim
about an operation and becomes a claim about which form fields the person happened not to touch,
which is not testable at the seam at all.

**The house rule already exists and says the same thing**, in `types.ts` on `DevicePatch`: *`seatId`
and `rank` are absent by design. An attribute edit may not move a device or change its designation;
those are `assignDeviceToSeat`, `unassignDevice` and `designatePrimaryDevice`, and keeping them out
of the patch is what puts each invariant check on exactly one operation.* Assignment is that shape.

### B — put the chooser on `/groups`

`Q-3` offered it and the story wrote AC-3 and AC-4 so that neither surface was presupposed.

**Rejected because the other surface has a written contract against it.** `groups/page.tsx` states
that it does not read members and that a `members.*` import there is a review finding; out-of-scope
item 4 forbids a group-scoped view of members from this ticket's side. A chooser needs the member
list. F-2 has the second reason, which is AC-3's *without a manual reload*.

### C — an inline select in the members row that submits on change

No dialog, one fewer click, and the table already has a column for it.

**Rejected on the story's words and on the consequence.** AC-3 and AC-4 both say *chooses a group for
that member **and confirms***, which names two steps. And a select that writes on `change` turns a
misclick into a completed re-assignment with no confirm step and no undo — this system has no
assignment history (out-of-scope item 8), so *who moved this person, and from where* is unanswerable
afterwards. A control whose accidental use is unrecoverable should not be the fastest one on the page.

### D — a `listMemberRows()` seam function returning the member joined to their group name

It would put AC-1's resolution behind the seam instead of in a page.

**Rejected for MEM-01's and GRP-01's reason, which both files state in the same words:** a joined DTO
puts a new *shape* across the seam rather than a new name, and shape is the one thing
`tests/unit/seam-parity.test.ts` does not check. A mock returning a joined row the real
implementation cannot reproduce passes parity and breaks at the swap. The join is four lines in a
server component that already performs three of them.

### E — reuse `groupParentIdSchema` for the assign input

It is one import away, it already exists, and it handles the placeholder's empty string — which is
exactly the problem.

**Rejected because it silently implements a verb the story declined to grant.** That schema maps `""`
to `null` because a top-level group has no parent. Here `""` means *the person did not choose*, and
mapping it to null makes the submit control remove the member from their group — `Q-4`'s third verb,
built by accident, with no criterion to fail and therefore no test to catch it. F-4. This is the
alternative most likely to be reached for at IN_PROGRESS, which is why the contract in 1.3 names the
schema it must not be.

### F — a single `setMemberGroup(memberId, groupId: string | null)` seam function

More general, one function instead of the two a later ticket might need.

**Rejected for E's reason at the type level.** The nullable parameter *is* the third verb. Generality
here is not spare capacity, it is an unbuilt feature reachable by any caller that passes null,
including one written by a later ticket that never reads this story. `Q-4` is a question for the
operator, and the honest shape of an unanswered question is a signature that cannot express either
answer.

### G — read GRP-01's `Q-6` answer as settling `Q-2`

The operator answered `ADMIN only` for the group verbs six days ago, on the ground that the
department structure is a core organization-level resource. Treating assignment as a fifth verb under
that answer would fill in the open cell and close a question.

**Rejected because the answer named four verbs and assignment was not among them** — it was already
deferred to this ticket when the question was put. And the counter-reading is not weak:
`rbac-and-security.md` gives Manager *manage accounts, members, and devices*, and this is a write on
a Member. Filling the cell from the neighbouring ticket would be recording a position the operator
did not take, in a table that later tickets will read as though they did. Section 2 leaves it open
and says why, which is what `Q-2` asked for.

### H — implement `Q-5`'s many-to-many reading now, since assignment is where it would live

The story says `Q-5` *presses harder here than it did on GRP-01, because assignment is exactly where a
second group would have to be expressible*, so there is a real argument for settling it in the ticket
that would carry it.

**Rejected because it is a schema change wearing a feature's clothes** — out-of-scope item 10 names
this exact risk, and RULE-09 makes approving a schema change permanently human. A scalar `groupId`
cannot hold two groups; the change is a join table, an ADR, and a migration. The asymmetry the story
records is also the reason waiting is cheap: one group can be widened to many later without any
existing row becoming wrong, and many cannot be narrowed to one without deciding which to keep for
every member who has several.

## Changelog

- `2026-08-26T03:28:58Z` — design created at DESIGN. Sections 0 through 7 complete, `allowed_paths`
  enumerated and written back to `ticket.yaml`, `size: M`. Raised by `tech-lead-design`. Amended by
  `tech-lead-design`.
