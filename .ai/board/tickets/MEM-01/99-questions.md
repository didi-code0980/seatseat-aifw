# MEM-01 — open questions

Questions raised by a stage that cannot answer them from its own inputs, and the stage or person they
are routed to. Each is stated in full here and in full wherever it is acted on, because every artifact
stands alone (RULE-16).

**None of these blocks DESIGN.** `02-design.md` passed its gate on `2026-08-23T09:28:06Z` with all
five open. They are stated as findings in section 0 of that document, which is the binding record;
this file is the routing.

`Q-1` from `01-story.md` is not here. It was the blocking question of SPEC, it was answered `refuse`
by the operator, and it is closed as INV-12 and ADR-005. `Q-2` is closed by F-2 below. `Q-3` is an
`AUT` question the story records and this stage does not touch.

---

## F-1 — `Member.email` is `@unique`, so A-2 is false and AC-3 and AC-7 are incomplete

**Routed to:** `ba`. **Raised by:** `tech-lead-design`, DESIGN. **Blocks:** QA, not IN_PROGRESS.

`01-story.md` A-2 assumes no field of a Member carries a uniqueness constraint and says "DESIGN is
expected to check this and raise it". `prisma/schema.prisma:164` reads `email String @unique`.

`02-design.md` specifies the refusal anyway, on create and on edit — the seam is agreeing with the
model, not adding a rule, and a mock that accepts a duplicate accepts data the database rejects. What
is missing is the criteria.

**Answer needed:** a refusal clause in **AC-3** (create) and in **AC-7** (edit). Section 6 of the
design already carries the selectors, marked *pending F-1*.

**A note for whoever answers it: the refusal is exact, not case-folded.** `@unique` in Postgres is
case-sensitive, so `Ada@x.internal` and `ada@x.internal` are two rows the database would accept.
Matching case-insensitively would be a stricter rule than the model imposes and would be invented. If
the operator wants case-folded identity it is a schema decision — a citext column or a normalising
write — not a line in a Zod schema.

### The part of F-1 that is not MEM-01's

**This is the third consecutive ticket whose story assumed no uniqueness and was wrong.** `ROO-01` on
`Room.code`, `DEV-01` on `Device.assetTag`, MEM-01 on `Member.email`. Each story predicted it and
asked DESIGN to check, and each time DESIGN found it — so the process worked three times out of three.

That is the problem rather than the reassurance. `.ai/standards/data-model.md` states that it
*contains no field names* and that inventing them is prohibited, so `ba` has no source that could ever
answer the question, and the story is structurally unable to get this right. Every future entity story
will make the same assumption and rely on DESIGN to catch it.

Recorded here rather than filed as model debt, because `.ai/board/model-debt.md` is a human-reviewed
register and this is an observation for the steward, not a change this ticket may make.

---

## F-2 — Q-2 answered: the member's field set, and `groupId` is not on the form

**Routed to:** `ba`. **Raised by:** `tech-lead-design`, DESIGN. **Blocks:** QA, not IN_PROGRESS.

`01-story.md` Q-2 asks what a Member's required fields are. Transcribed from
`src/lib/data/types.ts:91-97` and `prisma/schema.prisma:161-181`:

- Collected by the form, all required: `fullName`, `email`, `role`.
- Not collected: `id` (minted by the seam) and `groupId` (always `null` — group membership is
  out-of-scope item 5).

`role` is required and the design deliberately does **not** use the model's `@default(USER)`. AC-3
refuses a creation with no role chosen, and a default would silently satisfy the thing that criterion
refuses.

**Answer needed:** AC-2, AC-3, AC-5 and AC-7 amended from "every required field" to the three named
fields. The criteria become more specific, not different, which is what the story predicted.

Worth a line when it is answered: the existing scaffold at `src/app/(app)/members/page.tsx` renders a
Group column showing the raw `groupId`. The design drops it — a group id is not a group name, no seam
function resolves one, and showing it would make the surface look like it manages groups.

---

## F-3 — the email format refusal has no criterion, and it is a judgement rather than a transcription

**Routed to:** `ba`. **Raised by:** `tech-lead-design`, DESIGN. **Blocks:** QA, not IN_PROGRESS.

Separate from F-1 because F-1 is compelled by the model and this is not.
`prisma/schema.prisma:164` types the column `String` with no format constraint, so refusing `banana`
is a rule the design is choosing. `DEV-01` faced the same choice on `assetTag` and declined it.

The design decides the other way here, on three grounds set out in full in `02-design.md` section 0:
the column's name fixes its meaning where `assetTag`'s does not; ADR-003 makes the email the
identifier an account is eventually linked against, and `Account.email` is `@unique`; and nothing
downstream repairs an unreachable person the way an edit repairs a mistyped asset tag.

**Answer needed:** a malformed-email clause in **AC-3** and **AC-7**, or a decision that the format is
not checked. The design ships `z.string().trim().min(1).email()` until told otherwise, and the change
is one line.

---

## F-4 — three declared cascades reach `Member`, and this ticket implements none of them

**Routed to:** a human, and to whichever of `SEA`, `REG` or `AUT` lands first.
**Raised by:** `tech-lead-design`, DESIGN. **Blocks:** nothing.

INV-12 governs seats and devices. Three *other* references to `Member` exist in the draft schema, each
with a declared `onDelete`, and none is mentioned by INV-12, by ADR-005, or by any criterion:

| Declaration | Line | On member delete |
|---|---|---|
| `Account.member ... onDelete: Cascade` | `prisma/schema.prisma:231` | the member's account row is destroyed |
| `SeatRequest.requester ... onDelete: Cascade` | `prisma/schema.prisma:206` | the member's seat requests are destroyed |
| `Account.createdBy ... onDelete: SetNull` | `prisma/schema.prisma:235` | accounts they created lose their creator |

`ROO-01` set the precedent that the mock implements what the schema declares. **This design does not,
because all three are unreachable and the code would be untestable.** The proof, so it can be
falsified rather than trusted:

1. INV-12 refuses deletion of any member who occupies a seat.
2. `src/lib/data/fixtures.ts:57-62` occupies `seat-a-01` and `seat-a-04` with `mem-admin`,
   `seat-a-02` with `mem-manager`, `seat-b-01` with `mem-user`. All three seeded members occupy at
   least one seat.
3. Nothing writes occupancy. MEM-01 does not (out-of-scope item 3), `ROO-01` and `DEV-01` do not, and
   `SEA` and `REG` do not exist.
4. Every account and every seat request in the seed belongs to one of those three members, and no
   path creates another — MEM-01 creates no account (AC-4, INV-08) and no request.

So no member holding an account or a request can be deleted, and no test QA is able to write could
enter any of the three branches. `testing-standards.md` treats an unreachable branch as coverage that
is not there.

**What must happen, and when.** The moment a write path ends a member's seat occupancy, a deletable
member with an account becomes constructible and all three cascades become live. **That is a `SEA` or
`REG` ticket, and it must add them in the same change.** `deleteMember` carries a comment naming the
three declarations and this condition, but the ticket that needs it will be reading a story and a
design, not `mock/members.ts` — which is why it is written here.

**A second thing for the same human.** INV-12 says the delete is refused, and the draft schema
declares `onDelete: SetNull` on both `Seat.occupant` and `Device.owner` — which is the cascade ADR-005
rejected, expressed in the schema. `onDelete: Restrict` is what INV-12 reads like. Under
`DATA_SOURCE=mock` there is no database for that to be wrong in yet, and it is not a change this
ticket may make (RULE-09), but whoever writes the migration should find it recorded rather than
discover it from a nulled occupancy.

---

## F-5 — `ADR-003` mandates `Member.authUserId` and the draft schema does not have it

**Routed to:** a human — RULE-01 and RULE-09. **Raised by:** `tech-lead-design`, DESIGN.
**Blocks:** nothing.

ADR-003 is `ACCEPTED`. Its Decision reads: *"`Member` is its own table. It carries `authUserId`,
**nullable**, in a 1-1 relation to Better Auth's `user`."* Its Consequences add that the field is
*nullable and unique* and that the relation is `onDelete: SetNull`.

`grep -rn "authUserId" prisma/ src/` returns nothing. The field is in neither `prisma/schema.prisma`
nor `src/lib/data/types.ts`.

**MEM-01 does not need it and does not add it.** Adding a column is a schema change, which
out-of-scope item 7 forbids this ticket to acquire and RULE-09 makes human. AC-4 is satisfied against
the `Account` model, which does exist, is seeded, and is what the design's Sign-in column reads.

**Why it is worth attention beyond bookkeeping.** The schema holds two representations of *this person
can sign in* — ADR-003's `Member.authUserId`, absent, and `Account.memberId @unique`, present. ADR-003
does not mention `Account` at all. Whichever is the real one, `AUT` has to reconcile them before it can
create an account, and ADR-003's Consequences already promise that account creation *creates both
rows, in that order, or neither* — a sentence that names two rows without saying which two.

**Answer needed:** either the field is added to the draft schema and the DTO, or ADR-003 is amended to
name `Account` as the mechanism. Both are registry work.

---

## Not a question — recorded because it has no other home

**The `tech-lead-design` to `ba` chat edge still has no `chat_budget` pair.** `ticket.yaml` seeds four
pairs and omits this one, although the chat topology in `.ai/01-operating-model.md` permits it. That
is MD-04 in `.ai/board/model-debt.md` and MD-2 in `.ai/board/model-defects.md`, both open.

**This is the third ticket to hit it at the same stage.** `ROO-01`'s Q1 to Q3 went through the missing
edge unbudgeted and uncounted; `DEV-01`'s F-1 to F-5 reached `ba` as a file; MEM-01's do the same.
`consulted` in `02-design.md` is empty and `chat_before_verdict` reads `none`; both are accurate.

Nothing is asked of `ba` here.

**And one thing that is not model debt but is worth the steward seeing.** MEM-01's `allowed_paths`
intersect `DEV-01`'s in `src/lib/data/types.ts`. `ticket.yaml`'s header sets the parallel-dispatch
condition as *"allowed_paths pairwise disjoint after glob expansion"*, and SPEC reasoned that the
refusal answer to `Q-1` would keep them disjoint by keeping MEM-01 out of the device surface. It did
keep MEM-01 out of the device surface, and the two still collide — on `types.ts`, which every entity
shares and which every future ticket will also touch. The disjointness test as written will refuse
every pair of feature tickets, which is the same shape as the XL sizing row that caught every ticket
(MD-4). Recorded, not acted on; `DEV-01` is `DONE` so nothing collides today.

---

## F-6 — section 6.3 says a new member appears in `/devices`' owner select; section 1.4 makes that impossible

**Routed to:** `tech-lead-design`. **Raised by:** `qa`, QA. **Blocks:** the e2e half of AC-11.

`02-design.md` section 6.3 restates five `DEV-01` selectors so `tests/e2e/members.spec.ts` can give a
just-created member a device, and closes: *"The new member appears in that select because it lists
every member the system holds — which is `DEV-01`'s AC-2, and is the sentence in `01-story.md`'s User
value section that this ticket makes true."*

**It does not. Measured three ways on this build:**

1. Create a member through `/members`, navigate to `/devices`, open the create dialog —
   `device-create-owner` holds **4** options: the empty placeholder and the three seeded members. The
   new member is absent.
2. Hard-reload `/devices` and reopen the dialog — still **4**. It is not the client router cache.
3. In the same session create one device with a seeded owner, which revalidates `/devices`, and
   reopen — **5**. The new member is now present and selectable.

`/members` reloaded shows the new member, so the write landed and the store holds it. `/devices` is
stale.

**Section 1.4 step 5 is the mechanism.** It specifies `revalidatePath("/members")` on the three write
actions and nothing else. The implementation matches the contract it was given, so this is not a
Developer defect and `rework_count` is not incremented for it. Sections 1.4 and 6.3 of the same
document contradict each other.

**Answer needed:** which of the two is right.

- If **6.3** is right, section 1.4 step 5 gains `/devices` — `src/actions/members.ts` is already in
  `allowed_paths`, so it is a one-line contract change and then a Developer's rework. Whether it also
  wants an acceptance criterion is `ba`'s, and F-1 to F-3 are already owed one amendment pass.
- If **1.4** is right, section 6.3's closing sentence is struck and AC-11 is covered at the seam
  permanently.

**Worth deciding rather than striking.** A Manager creates a member in order to give them a device;
on this build the person they just created is not in the picker until an unrelated device write
happens to refresh the page. No criterion in `01-story.md` asserts it, which is why QA reports it as
a finding rather than a failed test — but `DEV-01`'s AC-2 does say an owner is *chosen from the
members the system holds*, `DEV-01` is `DONE`, and its own suite cannot see this because it never
creates a member.

**What QA did meanwhile.** AC-11 is covered at the seam, which section 6.3 itself permits: *"doing
AC-11 at the seam with `devices.createDevice` (6.1) is available and is the simpler of the two; both
are permitted and QA chooses."* The e2e test was **not** written by creating a throwaway device first
to force the revalidation — that test would be written around the defect and would report green on
the day it is fixed and on every day before it. The gap is a comment at the foot of
`tests/e2e/members.spec.ts` rather than a silence.

---

## F-7 — a fourth e2e spec file makes `pnpm test:e2e` fail more often than it passes, in a file MEM-01 may not touch

**Routed to:** `tech-lead-design`. **Raised by:** `qa`, QA. **Blocks:** the QA gate's second half.

Fifteen runs of `pnpm test:e2e` at the configured worker count: **five exit 0, ten exit 1**. Every
failure is the same assertion, in another ticket's file:

```
tests/e2e/devices.spec.ts:370
  expect(after.model, "the list shows that device with the new value").toBe("QA model AC4 after")
  Expected: "QA model AC4 after"
  Received: "QA model AC4 before"
```

That is `DEV-01`'s `AC-4`, declared at `tests/e2e/devices.spec.ts:347`. It is a serial-mode file, so
the ten tests after it do not run.

**What was measured, so the cause is narrowed rather than guessed:**

| Configuration | Result |
|---|---|
| `tests/e2e/members.spec.ts` alone | 10 passed, every time |
| `devices` + `rooms` + `smoke` — the three files that existed before this ticket | 38 passed |
| `devices` + `rooms` | 24 passed |
| `devices` + `members` | 24 passed |
| All four files, `--workers=1` | 48 passed, twice |
| All four files, configured workers | 5 pass / 10 fail out of 15 |

**The trigger is a fourth spec file.** `playwright.config.ts` sets `fullyParallel: true`, a serial
file occupies one worker, and this machine reports 8 CPUs, so a fourth file takes the concurrency
against the single production server from three to four. Which file is fourth does not appear to
matter: `members.spec.ts` never visits `/devices`, writes no device and no seat, and pairs cleanly
with `devices.spec.ts` on its own.

**Two hypotheses, and QA cannot choose between them from here.** The edit dialog closes — so the
action returned success — and the row still shows the old model; the page snapshot at failure shows
one AC-4 row reading the old value, owned by a seeded member, so no member this suite created is
involved. Line 370 is a plain `innerText()` read rather than a retrying assertion.

- **The assertion is early.** A server action returns before the refreshed list lands, and the read
  loses a race that only opens under load. The fix is a retrying assertion on the model cell before
  the snapshot — one line in `tests/e2e/devices.spec.ts`.
- **The surface reports success before the list reflects it.** Same symptom, defect in the product
  rather than the test, and worth a criterion.

Distinguishing them means re-reading the cell until it changes or a timeout expires, in a file this
stage may not edit, or reading `src/**`, which RULE-05 forbids.

**Answer needed:** who fixes `tests/e2e/devices.spec.ts`, and under which ticket. It is not in
MEM-01's `allowed_paths` (RULE-03) and extending `allowed_paths` is `tech-lead-design`'s at DESIGN.
No edit to the three paths MEM-01 may write removes a fourth worker from the pool.

**What was done from inside `allowed_paths`, and what it did not achieve.** The same latent race
exists in `tests/e2e/members.spec.ts` wherever a snapshot follows a write, so AC-2, AC-5 and AC-6 each
carry a retrying `toHaveText` on the changed cell before the snapshot is taken. That is why the member
spec has never failed, and it is the shape the one-line fix would take. It does not change the exit
code, because the failing test is in another file.

**One thing the fix must not be.** `playwright.config.ts` already sets `retries: 2` under CI, so CI
will very likely mask this and report green. The local exit code is the honest signal here and the CI
one is the misleading one, which is the reverse of the usual assumption.

---

## Not a question — what QA did not raise, recorded so the silence is not mistaken for absence

**F-1, F-2 and F-3 are still open and QA did not re-route them.** They are already routed to `ba` in
this file, they are named in `ticket.yaml`'s `spec` and `review` gate notes, and they are the first
routed failure in `06-test-report.md`. Restating them here as new items would double-count one
defect. Nothing further is asked of `ba` beyond the amendment pass those three findings already
describe.

**No question was addressed to `developer` or to `tech-lead-review`.** RULE-12 forbids it before their
verdicts exist and `chat-guard.mjs` blocks the write; both verdicts do exist by now, and QA still has
no finding for either of them. Nothing in this ticket's implementation was found to be wrong.

**`chat_budget` is unchanged, and `qa->tech-lead-design` still reads `{ used: 0, max: 6 }`.** F-6 and
F-7 are written to a file, in a session with no channel to anyone (RULE-13), which is the same way
`tech-lead-design`'s F-1 to F-5 reached `ba`. If routing through this file is chat under RULE-15 then
three stages have now under-counted it and that is MD-04's neighbour rather than MEM-01's to decide.

---

## ANSWERED at DESIGN version 2, 2026-08-24 — F-6 and F-7

**Added by `tech-lead-design`, additive only. Nothing above is edited** — F-6 and F-7 are `qa`'s
findings and their statements stand as written. Both are defects in version 1 of `02-design.md` and
neither is the Developer's; `rework_count` stays 0 under RULE-08.

### F-6 — answered: section 6.3 is right, section 1.4 was incomplete

QA asked which of the two contradicting sections is right. **Section 6.3.**

`02-design.md` section 1.4 step 5 now specifies `revalidatePath("/members")` **and**
`revalidatePath("/devices")` on the three member write actions. One line in each of three functions in
`src/actions/members.ts`, which is already in `allowed_paths`, so this is a Developer rework and not a
scope change.

**Why 6.3 rather than 1.4.** `DEV-01`'s AC-2 requires the owner select to list *the members the system
holds*. That criterion was true when `DEV-01` shipped and could not be false, because nothing could
create a member. MEM-01 is what creates one, so MEM-01 is what makes another ticket's passing
criterion observably false. Striking 6.3's sentence — the alternative QA offered — would remove the
place anyone would notice, not the defect. The operational case is QA's own and it is decisive: a
Manager creates a member in order to give them a device.

**The blast radius is two paths and that was measured, not assumed.** `grep -rln "members" src/app`
returns `/members`, `/devices`, and `layout.tsx`, which holds nav labels and no member data. Both
paths are named explicitly rather than using `revalidatePath("/", "layout")`, for the reason in F-8
below and in section 7 alternative G.

**On QA's question of whether it also wants an acceptance criterion:** that is `ba`'s. This design does
not ask for one. The behaviour is `DEV-01`'s AC-2, which already exists and already asserts it; what
was missing was a revalidation, not a criterion. If `ba` disagrees, it is one clause and no contract
change.

**QA was right not to write the test around it.** Creating a throwaway device first to force the
revalidation would have produced a test that reports green on the day the defect is fixed and on every
day before it. The comment left at the foot of `tests/e2e/members.spec.ts` was the correct instrument.

### F-7 — answered: it is the test, at one site, and the file is now in `allowed_paths`

QA offered two hypotheses and could not choose, because choosing means reading `src/**` and RULE-05
forbids it. Read here, and **hypothesis 1 is correct: the assertion is early. The product is not
defective.**

`src/app/(app)/devices/devices-manager.tsx:153-171` hides the edit dialog with `setEditTarget(null)`
and *then* calls `router.refresh()` without awaiting it. So
`await expect(page.getByTestId("device-edit-dialog")).toBeHidden()` returns while the refresh is still
in flight, and `tests/e2e/devices.spec.ts:369` calls `rowState`, which is five plain `innerText()`
reads with no retry (`devices.spec.ts:43-56`). **"The dialog is hidden" never meant "the list has
updated."**

Every snapshot-after-write site in that file was audited, because a one-line fix is only worth making
if it is the only one:

| Site | Follows | Guarded? |
|---|---|---|
| `assignTo`, `:135-136` | a write | yes — `toHaveText(seat.code)` |
| `setOwner`, `:157-158` | a write | yes — `toHaveText(ownerLabel)` |
| AC-3, `:341-343` | a **cancel** | no write, no race |
| **AC-4, `:367-369`** | **a write** | **no — the defect** |
| AC-12, `:676-679` | a write | yes — `toHaveCount(0)` |
| AC-14, `:757-760` | a **cancel** | no write, no race |

One unguarded site. The fix is the shape the rest of the file already uses, and the shape
`tests/e2e/members.spec.ts` uses everywhere — which is why the member spec is 10 of 10:

```ts
await expect(page.getByTestId(`devices-row-${tag}-model`)).toHaveText("QA model AC4 after");
const after = await rowState(page, tag);
```

**Who fixes it, and under which ticket — QA's actual question.** `tests/e2e/devices.spec.ts` is added
to MEM-01's `allowed_paths` and **QA makes the edit**, because `tests/**` is QA's. MEM-01 did not write
the defect; it has been latent in `DEV-01`'s file since it was written. But MEM-01's fourth spec file
is what makes it fire, and the effect is `ROO-01`'s Q11 exactly — the suite exits 1, the gate cannot
pass, and no agent on the ticket may touch the file. A design that makes a file fail must put that
file in reach of the ticket that made it fail.

`--workers=1` and CI's `retries: 2` are both declined in section 7 alternative H. QA's point that the
CI signal is the misleading one here is correct and is recorded there.

**One thing version 1 of the design has to answer for.** Its section 6.2 told QA to configure serial
mode and warned about shared state across parallel spec files, and `members.spec.ts` followed it and
has never failed. The reasoning was right and was applied only to the file this ticket writes; what
version 1 did not ask was what a fourth file does to the three that already existed.

---

## F-8 — every route is statically prerendered, and four of them never revalidate at all

**Routed to:** a human. **Raised by:** `tech-lead-design`, DESIGN version 2. **Blocks:** nothing, and
MEM-01 cannot fix it.

F-6 is one instance of a general defect, and finding it was worth more than fixing the instance.
`pnpm build` on this branch reports every application route as `○ (Static)` — prerendered at build
time:

```
○ /   ○ /devices   ○ /groups   ○ /layout-designer   ○ /login   ○ /members   ○ /requests   ○ /rooms   ○ /seats
○  (Static)   prerendered as static content
```

The e2e suite runs `pnpm build && pnpm start` (`playwright.config.ts`), so every page is a static
shell built from the mock store as it stood at build time, and the only thing that ever refreshes one
is a `revalidatePath` from a server action. `grep -rn "revalidatePath" src/` returns exactly three
targets: `/rooms`, `/devices`, `/members`.

**Two consequences.**

1. **`/seats`, `/groups`, `/requests` and `/layout-designer` are never revalidated by anything.** They
   are frozen at build-time data for the life of the process.
2. **`ROO-01` already has a live instance of this.** `deleteRoom` cascades to seats and detaches
   devices — it returns `seatsDeleted` and `devicesDetached` — and then calls `revalidatePath("/rooms")`
   alone. After a room delete, `/seats` still lists the destroyed seats and `/devices` still shows the
   detached devices on their deleted seats. **That is INV-11 observably false through a rendered
   surface**, which is within one step of the R8 failure `ROO-01` was reworked for and fixed at the
   seam. The seam is now right and the cache is not.

**Why MEM-01 does not fix it.** The repair is in `src/actions/rooms.ts` and `src/actions/devices.ts`,
neither of which is in this ticket's `allowed_paths` (RULE-03). Adding them would make MEM-01 the owner
of two other tickets' surfaces on the strength of a finding with no criterion behind it. MEM-01 fixes
only its own two paths, under F-6.

**Two instruments a human can choose between**, both outside this ticket:

- `revalidatePath("/", "layout")` in every write action. One line each, self-maintaining, cannot go
  stale when a new surface reads an entity. Verified available: `revalidatePath` is
  `(originalPath: string, type?: "layout" | "page")` in the installed Next 16.3.0
  (`node_modules/next/dist/server/web/spec-extension/revalidate.d.ts`).
- A route-level rendering decision, so these pages are server-rendered on demand rather than
  prerendered. Larger, and it is a decision about the application's caching model rather than a patch.

**MEM-01 deliberately did not take the first one**, although it was tempting and would have fixed F-6
for free. It would have made the symptom disappear on the three paths MEM-01 touches and left the same
defect everywhere else, with the one surface that would have demonstrated it now quiet. Section 7
alternative G of `02-design.md` records that reasoning in full.

**Note for whoever picks this up:** consequence 2 is a defect in a `DONE` and merged ticket, not a
latent risk. It is reachable today through `/rooms`.

---

## F-9 — F-7's repair is in place, holds at its own site, and the suite still exits 1 on seven runs in twelve

**Routed to:** `tech-lead-design`. **Raised by:** `qa`, QA pass 2, 2026-08-24T02:33:50Z.
**Blocks:** the QA gate. **`rework_count`:** no increment — nothing here is the Developer's.

F-7 said: one unguarded site, `tests/e2e/devices.spec.ts:367-369`, and QA makes the edit. QA made it.

```ts
await expect(page.getByTestId("device-edit-dialog")).toBeHidden();
await expect(page.getByTestId(`devices-row-${tag}-model`)).toHaveText("QA model AC4 after");  // added
const after = await rowState(page, tag);
```

**That assertion has not failed once since.** The suite still fails.

### What was measured

Every configuration below is `pnpm test:e2e` against a fresh production build of the current tree —
`src/actions/members.ts` carrying design version 2's `revalidatePath("/devices")`, and
`tests/e2e/devices.spec.ts` carrying F-7's repair.

| Configuration | Runs | Exit 0 | Exit 1 |
|---|---|---|---|
| Full suite, default workers (4) | 12 | **5** | **7** |
| Full suite, `--workers=3` | 4 | 3 | 1 |
| Full suite, `--workers=2` | 4 | 3 | 1 |
| Full suite, `--workers=1` | 3 | **3** | 0 |
| `devices.spec.ts rooms.spec.ts smoke.spec.ts` — members.spec.ts withheld, default workers | 12 | **12** | 0 |
| `members.spec.ts` alone | 5 | **5** | 0 |

**Every failure in every run is in `tests/e2e/devices.spec.ts`.** Across 19 full-suite runs there is
not one failure in `members.spec.ts`, `rooms.spec.ts` or `smoke.spec.ts`. Tally:

| Site | Failures | The act that did not land |
|---|---|---|
| `:279` AC-2, at `:296` | 3 | a created device's row never appeared |
| `:385` AC-5, at `deleteDevice:187` and `makePrimary:141` | 3 | a deleted device's row stayed; a designation stayed `SECONDARY` |
| `:347` AC-4, at `deleteDevice:187` | 1 | a deleted device's row stayed |
| `:467` AC-7 | 1 | — |
| `:622` AC-11, at `makePrimary:141` | 1 | a designation stayed `SECONDARY` |
| `:690` AC-13, at `setOwner:157` | 1 (pass 2 pre-fix tree) | the edit dialog never closed |

### Why the prescribed repair could not have worked, stated as a correction rather than a complaint

F-7 diagnosed a **snapshot race**: a bare `innerText()` read overtaking a refresh, fixed by making the
read retry. That is a real defect and it was really at `:367-369`, and it is really gone.

**The failures above are not snapshot races.** Every one of them is at an assertion that *already
retries* — `toBeVisible`, `toHaveCount(0)`, `toHaveText` — with the full five-second timeout, and the
call log shows the locator resolving repeatedly to the wrong value for the whole of it. Nothing was
read too early. **The write did not land.** A row that was created is absent; a row that was deleted
is present; a device that was designated primary reads `SECONDARY`.

No retrying assertion fixes a write that did not happen, and there is no test edit that makes one
happen. The audit in F-7 asked *which reads are unguarded*; the question the measurements ask is *what
happens to a server action on the single mutable store while three other workers are writing to it*,
and QA cannot answer that — it is in `src/**` (RULE-05).

### What this does and does not say about MEM-01

**It confirms F-7's causal claim and refutes its scope.** Withhold `members.spec.ts` and the suite is
12 for 12; add it and it is 5 for 12. MEM-01's fourth spec file is the trigger, exactly as F-7 said.
It is not the defect: `--workers=1` passes 3 for 3 with all four files present, so the file count is
only a proxy for how many writers reach the server at once, and `--workers=2` already fails.

**No MEM-01 acceptance criterion fails, at either level.** 18 unit tests and 16 e2e tests, all sixteen
criteria mapped, zero failures across every configuration above. The member surface is not what is
breaking.

### The two questions this needs answered, both of which need `src/**`

1. **Can a lost write under concurrency violate INV-04 or INV-05 rather than merely dropping?** The
   symptom observed is always a *missing* effect — a row that was not added, not removed, not
   re-ranked. A drop cannot produce two primaries on one seat. But `:467` and `:622` are the tests
   *named* after INV-04 and INV-05, they are failing, and QA cannot read the write path to prove the
   failure mode is only ever a drop. **QA is not escalating under RULE-07** — no invariant was
   observed false, and the unit probes for INV-04, INV-05, INV-06, INV-08 and INV-12 all pass. This
   is recorded so the design rules it out deliberately rather than by silence.
2. **Which instrument, given the file this needs is outside MEM-01's `allowed_paths`?**
   `playwright.config.ts` is not in `allowed_paths` and neither is `src/**`, so QA can reach neither.
   `02-design.md` section 7 alternative H considered `--workers=1` and CI's `retries: 2` and declined
   both. **The declined option is the one that measures clean**, which is a fact alternative H did not
   have when it was written. Whether that changes the decision is `tech-lead-design`'s, not QA's.

The third possibility — that the application genuinely cannot serve four concurrent writers against
one in-memory store, and that this is a property of `DATA_SOURCE=mock` rather than of any ticket — is
the one QA would look at first if it could read the seam. It is named here because if it is the
answer, then the repair is neither MEM-01's nor `DEV-01`'s, and F-8 is standing next to it.

---

## F-9, EXTENDED at QA pass 3, 2026-08-24T10:22:00Z

**Routed to:** `tech-lead-design`, unchanged. **Raised by:** `qa`, pass 3. **Blocks:** the QA gate.
**`rework_count`:** no increment — nothing here is the Developer's.

Nothing above is retracted. Pass 3 re-measured F-9 on a rebuilt tree and got the same finding at the
same rate — **6 failures in 12 full runs**, against pass 2's 7 in 12 — and then ran three
configurations pass 2 did not, each designed to remove one candidate cause. The result narrows the
defect considerably, and it narrows it away from MEM-01.

### The three new configurations

Each is `pnpm test:e2e` against a fresh production build, `rm -rf .next` first.

| Configuration | Runs | Exit 0 | Exit 1 | What it rules out |
|---|---|---|---|---|
| AC-11's e2e **device write removed** from `members.spec.ts` | 10 | 6 | **4** | The cross-spec device write |
| **Every member-write test excluded** — only refused creates, refused deletes and reads remain | 8 | 5 | **3** | Design version 2's `revalidatePath("/devices")` |
| `members.spec.ts` reduced to **AC-1 alone** — one navigation to `/members`, no write of any kind | 10 | 9 | **1** | Everything MEM-01 does |
| Full suite at `--workers=3`, baseline's own concurrency | 8 | 6 | **2** | The worker count |
| Baseline: `devices.spec.ts rooms.spec.ts smoke.spec.ts`, `members.spec.ts` withheld | 18 | **18** | 0 | — (confirms pass 2's 12 for 12) |

### What that means, stated as plainly as the measurements allow

**It is not the device write.** Pass 3 began by taking section 6.3's other permitted route for AC-11
— the seam — on the theory that a device written from a second spec file was racing `devices.spec.ts`
against the same mutable store. The suite still failed 4 in 10. AC-11's e2e coverage was **restored**,
because the reason for giving it up turned out not to be true.

**It is not `revalidatePath("/devices")`.** Excluding every test in `members.spec.ts` that writes a
member — and so every call to the three actions design version 2 changed — still fails 3 in 8. F-6's
fix is not what destabilised the suite.

**It is not the worker count.** The baseline three files are clean 18 for 18 at their default four
workers; the full suite fails 2 in 8 at three. Pass 2 read `--workers` as a proxy for how many writers
reach the server; the proxy is weaker than that, because the fourth client need not write at all.

**A single read-only page load is enough.** With `members.spec.ts` cut to AC-1 — navigate to
`/members`, assert on the rows, write nothing, touch `/devices` never — `devices.spec.ts` still fails
1 in 10. This is the measurement that moves the finding: **nothing MEM-01 implemented and nothing QA
wrote is the cause.** A fourth concurrent client on the single production server is.

### And it is stale, not slow — which closes off the whole class of test repairs

The two most frequent failing sites were given a 30-second assertion timeout, six times the default,
and the suite was re-run six times. The failure did not go away; it **moved to a third site**, at the
same rate, with run durations unchanged at 13–15s — so the widened windows were never being consumed.

A retrying assertion cannot fix a write the next render does not carry. Every failing assertion in
every run already retries — `toBeVisible`, `toHaveCount(0)`, `toHaveText` — and the call log shows the
locator resolving to the wrong value for the entire window. F-7's audit asked *which reads are
unguarded* and answered it correctly; there are no unguarded reads left, and the suite still exits 1.

### One correction to the record above

F-9 as written says that across 19 full-suite runs there was not one failure in `members.spec.ts`.
**Pass 3 saw two**, both at `members.spec.ts:749` (AC-11), both the same symptom — the device created
through `DEV-01`'s dialog not reflected when the refusal is read back. The conclusion is unchanged.
What changes is that the defect is not confined to `DEV-01`'s spec file, and reading it as confined
there made it look more like another ticket's problem than it is.

### What is being asked, restated for pass 3

Unchanged in substance from the two questions above, with one fact added that the design did not have
when section 7 alternative H was written:

1. **The declined option is the one that measures clean.** Alternative H declined `--workers=1` as
   "masking rather than fixing" and declined CI's `retries: 2` as worse. `--workers=1` passes 3 for 3
   with all four spec files present. Whether a fact that arrived after the decision changes it is
   `tech-lead-design`'s call, not QA's — but the decision was made without it.
2. **The repair is not in reach of this ticket, under any reading.** `src/actions/devices.ts`, the
   `/devices` page and `playwright.config.ts` are all outside `allowed_paths`. MEM-01 cannot fix a
   defect that a read-only page load in a fourth browser tab is sufficient to trigger.
3. **F-8 is standing next to this and should probably be answered with it.** F-8 records that every
   application route is `○ (Static)`, that four are never revalidated by anything, and that `ROO-01`'s
   `deleteRoom` leaves `/seats` and `/devices` stale in a `DONE` ticket. A rendered surface that does
   not reflect a write that already succeeded is the same sentence. If one repair answers both, it is
   not MEM-01's and it is not `DEV-01`'s.

**Not escalated under RULE-07, and deliberately so.** Three failing `devices.spec.ts` tests carry
INV-04, INV-05 and INV-07 in their names. No invariant was observed false: the symptom is always a
missing effect, never a contradictory one, and the unit probes for INV-04, INV-05, INV-06, INV-08 and
INV-12 all pass on the same tree. QA cannot read the write path to prove the failure mode is only ever
a drop (RULE-05), which is why this is a question for the design rather than an escalation on a name.

---

## F-9, ANSWERED at DESIGN version 3, 2026-08-24T03:58:00Z

**Answered by:** `tech-lead-design`. **Routed to:** **a human.** **Blocks:** the QA gate, and now the
DESIGN gate too — `gate: BLOCKED`, `requires_adr: true`. **`rework_count`:** no increment.

Nothing QA measured is retracted and nothing is disputed. Every configuration in F-9 and in its pass-3
extension was re-run at this stage rather than accepted, because the conclusion below contradicts
version 2 of the design and would be worth nothing on the reporting session's evidence alone.

### The finding

**It is not a test defect. It is that every route in this application is served from a cache.**

`pnpm build` reports all seven `(app)` routes as `○ (Static)`, prerendered at build time.
`playwright.config.ts:20` runs the suite against `pnpm build && pnpm start`, and the server confirms
what it is serving:

```
$ curl -sD - -o /dev/null http://127.0.0.1:3199/devices
x-nextjs-cache: HIT
x-nextjs-prerender: 1
Cache-Control: s-maxage=31536000
```

`.next/prerender-manifest.json` gives `/devices` `"compute": "static"` and
`"initialRevalidateSeconds": false` — no time-based regeneration at all, so the only thing that ever
refreshes one of these pages is a `revalidatePath` from a server action. A rendered surface can
therefore lag a write that already succeeded, which is F-9's symptom word for word: **stale, not
slow**, and no retrying assertion can fix it.

### The measurement

| Configuration | Runs | Exit 0 | Exit 1 |
|---|---|---|---|
| Current tree, unchanged | 6 | 4 | **2** |
| One line added — `export const dynamic = "force-dynamic"` in `src/app/(app)/layout.tsx` | **16** | **16** | **0** |

Same suite, same four spec files, same four workers, same machine, same build command. QA's own
baseline was 7 in 12 and 6 in 12 across two sessions, so the failure rate has been about a third of
runs and stable across three independent measurements and three rebuilt trees.

**The line was reverted after measuring.** `git status` on that path is empty.

### Why a read-only fourth client is enough — the fact that decided this

QA's sharpest measurement was that cutting `members.spec.ts` to AC-1 alone — one navigation, no write
of any kind, `/devices` never visited — still failed `devices.spec.ts` 1 run in 10. The explanation is
in the layout: `src/app/(app)/layout.tsx:4-10` renders a nav of seven `<Link>`s on **every** page,
`/devices` among them, and a `<Link>` in the viewport is prefetched. A prefetch of `/devices` is a
render of `/devices`. A tab that only ever loads `/members` still makes the server produce and cache
`/devices` while another worker is writing to it.

**MEM-01's entire contribution is one more tab, therefore one more prefetcher.** QA's "MEM-01 IS THE
LOAD, NOT THE DEFECT" is correct and this is the mechanism behind it.

### QA's question 1, answered: INV-04 and INV-05 cannot be violated this way

Asked so the design would rule it out deliberately rather than by silence. **Ruled out, from the seam
rather than from the symptom.**

The mock's write functions have no `await` in their critical sections — `mock/devices.ts` has one
`await` in the entire file, `mock/seats.ts`, `mock/members.ts` and `mock/accounts.ts` have none.
`designatePrimaryDevice`, the function carrying both invariants, reads live state, runs its four
checks, demotes the incumbent and promotes the target with no suspension point between them
(`src/lib/data/mock/devices.ts:166-195`). Node runs one JavaScript thread, so that function cannot
interleave with another request. Every seam write is atomic with respect to every other.

**The cache can only make a surface lag the store. It cannot make the store contradict itself.** Two
`PRIMARY` devices on one seat is unreachable, because the only writer that could produce it re-checks
live state and refuses (`mock/devices.ts:178-186`) — and it refuses against the store, not against
whatever was rendered, so a person or a test acting on a stale page cannot induce it either.

QA was right not to escalate under RULE-07. This confirms it rather than defers it: no invariant is
violated, R8 has nothing to find, and the failing test *names* are a coincidence of which tests write
most often.

### The correction this stage owes

Design version 2 section 0.1 said: *"It is hypothesis 1: the assertion is early. The product is
correct."* The second sentence holds. The first is wrong, and QA disproved it by widening two
assertions to a 30-second timeout and watching the failure move to a third site with run durations
unchanged. Version 2 asked *which reads are unguarded*, answered it correctly, and never asked whether
an unguarded read was what was failing.

**F-7's repair stays and `tests/e2e/devices.spec.ts` stays in `allowed_paths`.** The unguarded snapshot
at `:367-369` was a real defect, it is now guarded, and it has not failed since. It simply was not the
cause.

### What a human has to decide

Three instruments. **None is in reach of this ticket** — `src/app/(app)/layout.tsx`,
`playwright.config.ts` and `src/actions/devices.ts` are all outside `allowed_paths`.

| # | Instrument | Fixes F-9 | Fixes F-8 | Verdict |
|---|---|---|---|---|
| **1** | `export const dynamic = "force-dynamic"` in `src/app/(app)/layout.tsx` | **yes, measured 16/16** | **yes, both consequences** | **recommended** |
| 2 | `--workers=1` in `playwright.config.ts` | hides it | no | rejected — repairs nothing |
| 3 | `revalidatePath("/", "layout")` in the write actions | **no** | partly | rejected — does not address it |

Instrument 3 is ruled out by QA's own measurement, not by argument: excluding every member-write test,
and so every call to all three actions version 2 changed, still failed 3 runs in 8.

Instrument 2 is what F-9 correctly noted the design had declined without knowing it measured clean.
Re-opened and declined again, on better grounds: it repairs nothing. The application still serves
stale surfaces, `ROO-01`'s room delete still leaves `/seats` and `/devices` showing destroyed seats and
detached devices, and this suite is the only instrument that has ever detected either. Making it blind
is not making it green.

**Instrument 1 is one line and it is verified against the installed version, not recalled.** `dynamic`
is removed in Next 16 only when Cache Components is enabled
(`node_modules/next/dist/docs/.../route-segment-config/index.md`, Version History); `next.config.ts`
does not enable it; the option is documented for this configuration at
`01-app/02-guides/caching-without-cache-components.md:87-97`. Applied to the `(app)` layout it moves
all seven routes at once and leaves `/` and `/login`, which hold no entity data, prerendered.

### Why this is routed to a human and not simply taken

Four grounds, the fourth deciding:

1. It reaches four routes with no MEM-01 acceptance criterion — `/groups`, `/layout-designer`,
   `/requests`, `/seats` — and one belonging to a merged ticket.
2. It repairs a live defect in `ROO-01`, which is `DONE`. F-8 consequence 2 is reachable today.
3. `src/app/(app)/layout.tsx` is not in `allowed_paths`, and this stage is the one that writes that
   list. A stage that grants itself any path it finds convenient is not constrained by RULE-03.
4. **There is no decision to apply.** `.ai/standards/architecture.md` says nothing about rendering,
   caching, revalidation or static generation — grep returns nothing. Every route is prerendered
   because that is Next's default and nobody chose it. Setting the model for the whole application is
   authoring that decision, and RULE-09 makes it human.

**The counter-argument, recorded because it is strong and may be preferred.** These seven pages all
read mutable data through the seam and every one is expected to reflect a write. Serving them from a
build-time prerender is arguably not a design choice but a plain defect latent since the first page was
written — in which case instrument 1 is a bug fix and needs no ADR at all. This stage recommends
instrument 1 on exactly that reading, and stops anyway, because whether this is "a defect" or "a
decision nobody made" is not a call an agent should make about the application's rendering model.

### The cost of stopping, stated plainly

MEM-01 sits at `REWORK` until this is answered. All sixteen acceptance criteria map to named tests, all
34 tests pass at both levels, `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm build` all exit 0,
and INV-08 and INV-12 both hold. **The only thing between this ticket and DONE is `pnpm test:e2e`
failing on a defect it did not write and cannot reach.**

If the answer is "split it into its own ticket" — the cleanest option on ownership — that ticket should
be sequenced immediately and MEM-01 held here, not walked into a QA gate it is known to fail. That is
the state `ROO-01`'s Q11 ruled against.

---

## F-9, TAKEN at DESIGN version 4, 2026-08-24T05:36:58Z

**Decided by:** `tech-lead-design`. **Was routed to:** a human, at version 3. **Now blocks:** nothing.
**`rework_count`:** unchanged at 0 (RULE-08) — F-9 is neither the Developer's nor `ba`'s.

**Instrument 1 is adopted.** `src/app/(app)/layout.tsx` gains `export const dynamic = "force-dynamic"`,
the path enters `allowed_paths`, and `02-design.md` section 1.6 is the contract item. The DESIGN gate
passes and the ticket moves to `IN_PROGRESS`.

**The human decision version 3 asked for is withdrawn, not answered.** Nobody needs to reply to it.
Version 3 was wrong about what made it a human's, and it was wrong on a point QA had already put in
writing.

### What version 3 stopped on, and why it does not hold

Version 3 gave four grounds, *"the fourth deciding"*. Two survive as accepted costs, one is answered,
one was a misreading.

**Ground 3 — "`src/app/(app)/layout.tsx` is not in `allowed_paths`, and this stage is the one that
writes that list."** The formulation is right and is kept: *a stage that grants itself any path it
finds convenient is not constrained by RULE-03.* The word doing the work is **convenient**, and it no
longer applies. `tests/e2e/members.spec.ts:749` — **AC-11, this ticket's own acceptance criterion** —
fails at `:782` without this line, on the assertion `02-design.md` section 6.3 instructed QA to treat
as load-bearing. A path without which an acceptance criterion of this ticket cannot pass is required,
not convenient, and enumerating exactly those paths is what section 5 exists to do. The precedent is
this ticket's own, one version back: `tests/e2e/devices.spec.ts` entered `allowed_paths` at version 2
under `ROO-01`'s Q11 — *a design that makes a file fail must put that file in reach of the ticket that
made it fail, or the repair has no owner* — and REVIEW pass 3 examined that addition under R1 and
passed it. It reaches further here, because this time the failing file is MEM-01's own.

**Ground 4 — "there is no decision to apply; RULE-09 makes it human." Wrong, against the ledger.**
RULE-09 reads in full: *"Schema changes, ADRs, registry edits, and PR merges are permanently human."*
Four categories. A one-line source edit under `src/` is none of them. Version 3 did not cite the rule;
it cited a consequence it believed followed from it.

The same error has a recorded precedent here. `.ai/steward/context.md`, session log `2026-08-23`, is
headed *"the orchestrator may commit; RULE-09 was never the obstacle"* and records that `/ship` was
blocked for a day by exactly this shape — every document citing RULE-09 agreed agents could not commit,
the ledger said only that they could not *merge*, and the repair was three prose files and no ADR. That
entry ends: *"Recorded because the general shape recurs: a belief about what a rule says, held
confidently by every document that cites it, and contradicted by the ledger."* It recurred, on the same
rule, five days later.

**Grounds 1 and 2 — four routes with no MEM-01 criterion change rendering mode, and a live defect in
`DONE` `ROO-01` is incidentally repaired. Both accepted as real costs.** They are recorded in
`02-design.md` section 0.0 as costs rather than argued away. The narrower instrument does not exist:
`/members` is not the stale surface, so `force-dynamic` on the one route file MEM-01 already owns
changes nothing (section 7 alternative J), and `src/app/(app)/devices/page.tsx` is no more inside this
ticket than the layout while being strictly worse — it repairs one route and leaves the same defect
latent in five.

### The evidence, and who produced it

**QA produced the decisive half and version 3 read past it.** F-9 as extended at QA pass 3 carries a
subsection headed *"One correction to the record above"*, which retracts the two statements version 3
went on to rely on:

> *"F-9 as written says that across 19 full-suite runs there was not one failure in `members.spec.ts`.
> **Pass 3 saw two**, both at `members.spec.ts:749` (AC-11) … What changes is that the defect is not
> confined to `DEV-01`'s spec file, and reading it as confined there made it look more like another
> ticket's problem than it is."*

QA drew the ownership consequence itself. Version 3 quoted the pass-2 tally instead and concluded the
opposite. This is recorded as a defect in version 3 of `02-design.md`, not as a finding of version 4's.

**This stage re-measured rather than choosing between two records on the same page.** Fresh production
build, and a **fresh `pnpm start` process for every run**:

| Configuration | Runs | Exit 0 | Exit 1 |
|---|---|---|---|
| Working tree as it stands | 6 | **3** | **3** |
| Working tree, one server reused across runs (discarded) | 3 | 3 | 0 |
| `export const dynamic = "force-dynamic"` in `src/app/(app)/layout.tsx` | **8** | **8** | **0** |

The discarded row is kept because the mistake is easy to repeat and it inverts the result: the mock
store is process-global and does not reset, so a reused server passes vacuously and says nothing. QA's
configuration — one `pnpm test:e2e`, one fresh server — is what was reproduced.

The AC-11 failure, verbatim:

```
1) [chromium] › tests/e2e/members.spec.ts:749:5 ›
   AC-11: deleting a member who owns a device is refused, and the refusal states how many (INV-12)

  Error: the member just created on /members is offered as a device owner — DEV-01 AC-2,
         and the sentence section 6.3 calls load-bearing

  expect(received).toContain(expected)
  Expected value:  "QA E2E AC11 mt6rx3yb-15"
  Received array:  ["Select an owner", "Ada Admin", "Mo Manager", "Uma User"]
```

`members.spec.ts:768` is `await page.goto("/devices")` — a full navigation, not a nav `<Link>` click —
so the client router cache is not in the path. The stale copy is the server's. `pnpm build` reports all
seven `(app)` routes `○ (Static)` before the change and `ƒ (Dynamic)` after, with `/` and `/login`
staying static; `/devices` is served `x-nextjs-cache: HIT` with `Cache-Control: s-maxage=31536000`.

**The line was reverted after measuring.** `git status` on that path is clean. The Developer applies it.

### Instruments 2 and 3, declined for the third time

**Instrument 2 (`--workers=1`)** — QA is right that it measures clean and right that alternative H
declined it without knowing that. Re-opened and declined again on better grounds: it repairs nothing.
The application still serves stale surfaces to real users, `ROO-01`'s room delete still leaves `/seats`
and `/devices` showing destroyed seats and detached devices, and this suite is the only instrument that
has ever detected either. Making the detector blind is not making the defect go away. With instrument 1
taken the suite stays at four workers and keeps that power.

**Instrument 3 (`revalidatePath("/", "layout")`)** — ruled out by QA's own measurement rather than by
argument: excluding every member-write test, and so every call to all three actions version 2 changed,
still failed 3 runs in 8.

### QA pass 3's question 1, answered from the seam

**A lost write under concurrency cannot violate INV-04 or INV-05.** `src/lib/data/mock/devices.ts:166-195`
has no `await` inside its critical sections, so under Node's single thread every seam write is atomic.
The cache can make a rendered surface lag the store; it cannot make the store contradict itself. The
observed symptom is always a *missing* effect, never a contradictory one, and a drop cannot produce two
primaries on one seat. **Nothing escalates under RULE-07.** Ruled out deliberately, not by silence.

### What this does NOT close

**F-8 stays open and stays a human's.** Its rendering half stops being reachable — `ROO-01`'s
`deleteRoom` will no longer leave `/seats` and `/devices` stale, because those routes are no longer
served from a prerender. **That is an effect, not a repair, and MEM-01 does not own it.** F-8 is broader:
four routes are revalidated by nothing at all, and `src/actions/rooms.ts` and `src/actions/devices.ts`
are outside `allowed_paths` and stay untouched. Whoever answers F-8 should know that one of its two
consequences has been masked by a change made for a different reason.

---

## F-10 — the sizing table's unit is undefined, and at version 4 it decides a verdict

**Raised by:** `tech-lead-design`, DESIGN version 4. **Routed to:** the **steward** (model plane, not
ticket work). **Blocks:** nothing — the verdict is taken and stated both ways. **`rework_count`:** no
increment.

`.ai/01-operating-model.md` §Sizing heads its second column **Files** and sets the boundaries at
`S — up to 6`, `M — up to 12`, `L — more than 12`, with `L`'s handling being *"must split at DESIGN"*.
It does not say whether an `allowed_paths` entry that is not a file counts.

Every ticket's `allowed_paths` ends with `.ai/board/tickets/<ID>/**` — the ticket's own working
directory, holding no implementation. MEM-01 now stands at **12 source and test files**, or **13
entries** with that glob included. The first reading is `M`; the second is `L`.

Versions 2 and 3 counted the second way and landed on exactly 12, so the ambiguity never decided
anything and was noted only as "on the boundary". Version 4 adds one entry and it decides the verdict.

**Version 4 takes `M`**, and the reasoning is in `02-design.md` section 5 in full: the column is headed
*Files*, a ticket's working directory is not one, counting it makes `S — up to 6` mean five real files,
and the table's stated purpose — *"decides whether the ticket splits"* — together with its split rules
(*"by operation first, then by surface, then by role"*) is about implementation surface throughout.

**The finding is not that reading. It is that this stage had to choose one.** A table whose output is
"must split at DESIGN" should not have an undefined unit, and two tickets have now landed exactly on
its boundary. The steward should settle it in `.ai/01-operating-model.md` — registry-adjacent, RULE-01
— rather than leaving each Tech Lead to pick the reading that suits the ticket in front of them, which
is precisely what version 4 has just done and said so.

**Recommended:** state that the count is of files under `src/`, `tests/` and `prisma/`, and that the
ticket-folder glob and any other board-plane path are excluded. That matches how every version of this
design and `ROO-01`'s and `DEV-01`'s have reasoned in prose, and it changes no past verdict.

**Related and worth deciding with it:** `ROO-01` section 5 already recorded as model debt that the
table *"counts a design's total file surface with no notion of an amendment to a design whose
implementation already exists."* MEM-01 is the second ticket pushed toward a worse size by downstream
repairs — `tests/e2e/devices.spec.ts` at version 2, `src/app/(app)/layout.tsx` at version 4 — neither
of which is scope the story under-specified. The command's instruction for an `M`-to-`L` gap is to route
back to `ba` *because the story was under-specified*; that diagnosis does not fit either case, and a
table that produces it anyway will keep producing it.

---

## F-5 — ANSWERED by ADR-006, recorded at DESIGN version 4

**Was routed to:** a human. **Answered by:** the operator, via `ADR-006`. **Blocks:** nothing.

F-5 said `ADR-003` mandates `Member.authUserId` and `prisma/schema.prisma` does not have it.
**`ADR-006 — Supabase Auth replaces Better Auth` is `ACCEPTED` on `main` at `doc_version: 3`**, and its
OQ-3 settles the field: a plain `String? @unique` with **no foreign key**, its referent moving from
Better Auth's `user` table to Supabase's `auth.users`. ADR-003's substance is unchanged — a Member may
exist with a null link, and that is a normal state rather than a half-built one.

**Nothing in MEM-01 changes.** `schema_delta` stays `none`: the field is still absent from the draft
schema, adding it is still schema work, and RULE-09 still makes schema work human. MEM-01 neither reads
nor writes `authUserId` in any of the four seam functions, and `prisma/schema.prisma` is not in
`allowed_paths`. Marked answered so the next reader does not re-route a question that now has an ADR
behind it.

**One related note, checked rather than assumed.** `.ai/registry/invariants.md` on `main` gained an
enforcement note recording that **INV-08 has no enforcement** — ADR-006 removed Better Auth's
`disableSignUp: true` and the operator chose a `localStorage` flag in its place (MD-14).
`02-design.md` section 3.1's INV-08 row is **unaffected and is not amended**: it never rested on
`disableSignUp`. It rests on the absence of a code path from this surface to an account row. Removing
Better Auth removes a control MEM-01 never invoked.
