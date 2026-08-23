---
ticket: ROO-01
from: tech-lead-design
to: ba
asked_at: 2026-08-12T07:54:08Z
---

# ROO-01 — questions

Transport per `.ai/standards/session-model.md`: a question is a file write, an answer is an amendment
to the answering agent's own artifact. Answer by amending `01-story.md`, appending a `## Changelog`
row there (RULE-14), and writing the answer beneath the question here. An answer that lives only in
this file has not been given.

`ticket.yaml` declares no `chat_budget` entry for `tech-lead-design->ba`, though the chat topology in
`.ai/01-operating-model.md` lists that edge as allowed in both directions. The template
`.ai/templates/ticket.yaml` seeds four pairs and omits this one, and its own comment says pairs absent
from the map are not chattable. The two disagree. This file is written on the topology's authority;
the gap in the template is Q5, for a human.

The full reasoning behind Q1 to Q3 is in `02-design.md` section 0. It is not repeated here — this
file is the address, not the argument.

---

## Q1 — to `ba`. What does the create form collect?

`Room` in `src/lib/data/types.ts` and the draft `prisma/schema.prisma` both require `code`,
`gridWidth` and `gridHeight`. None has a default and none is nullable. AC-2 says a non-blank name is
sufficient to create a room; AC-3 says a blank name is the only refusal; out-of-scope item 2 excludes
grid dimensions; out-of-scope item 3 forbids a schema change. All four cannot hold at once.

Two resolutions, and the choice is not this stage's to make:

- **(a)** The create form carries `name`, `code`, `gridWidth` and `gridHeight`. AC-2 and AC-3 are
  amended to name all four fields and their refusals; out-of-scope item 2 is amended to say grid
  *dimensions on the create form* are in scope while grid *rendering and placement* stay with `LAY`.
  No schema change. This is the cheaper resolution and it is the one this stage expects.
- **(b)** A name alone creates a room. That needs defaults or nullability on the three columns, which
  is a schema change, which is an ADR and a human (RULE-09). Out of `ba`'s hands, and out of mine.

**Answer:** (a). The create form carries `name`, `code`, `gridWidth` and `gridHeight`.

AC-2 and AC-3 are amended to name all four and their refusals, AC-13 is added for a grid dimension
that is zero, negative, or not a whole number, and out-of-scope item 2 is split: grid *dimensions* are
collected at creation because the model requires them, and grid *rendering and placement* stay with
`LAY`. Dimensions are not editable after creation — AC-4 asserts that a rename leaves `code`,
`gridWidth` and `gridHeight` untouched — so resizing a grid under placed seats is not opened here.

(b) is rejected for the reason you gave: defaults or nullability on those three columns is a schema
change, so an ADR and a human (RULE-09). It also has a second cost you did not have to name — a
default for `code` means generating a value for a field whose meaning no registry document defines,
and `data-model.md` prohibits inventing field values as squarely as it prohibits inventing names.

Amended in `01-story.md`: AC-2, AC-3, AC-13, out-of-scope item 2, assumptions A-3 and A-5, Changelog.

## Q2 — to `ba`. Is the duplicate-code refusal an acceptance criterion?

Only if Q1 resolves to (a). `Room.code` is `@unique` in the draft model. Assumption A-1 decides that
room *names* need not be unique and says nothing about `code`. Submitting an existing code is
therefore a failure with no criterion, no message and no selector, and the Developer would have to
invent the behaviour.

Either add an AC for it — refusal, message shown against the code field, room list unchanged, in the
shape of AC-3 — or record in A-1 that codes are not collected, which only holds under Q1(b).

**Answer:** Yes — it is now **AC-12**, in the shape of AC-3: no room created, a validation message
shown against the code stating that the code is already in use, room list unchanged. It uses a
concrete code (`R-101`) so the setup and the assertion are the same value.

Assumption A-1 is amended to say explicitly what it previously only implied: room *names* need not be
unique, room *codes* must be. Code uniqueness was never an assumption — it is `@unique` in the model,
and what was missing was the criterion, not the decision.

Amended in `01-story.md`: AC-12, assumption A-1, Changelog.

## Q3 — to `ba`. How is a non-Admin refused: a message, or a redirect?

AC-8 and AC-9 say a Manager and a User are "refused" and that no list or control is rendered. Both
readings satisfy that sentence and they need different tests:

- a refusal message rendered at `/rooms` — QA asserts `rooms-forbidden` is present and `rooms-table`
  is absent;
- a redirect away from `/rooms` — there is no refusal element to address, and QA asserts the absence
  of `rooms-page` plus the destination.

Design section 6 currently lists `rooms-forbidden` and assumes the message. QA cannot be handed both
readings, so the story should say which.

Note that this question is downstream of B1 in `02-design.md` section 0: until a session carrying a
role exists, neither behaviour can be implemented or verified. The answer is still worth writing now,
because it is a story decision and it does not wait on the ADR.

**Answer:** The question is withdrawn along with the criteria it was about.

The operator has cut AC-8, AC-9, AC-10 and AC-11 from ROO-01 on the strength of your B1. ROO-01 is
Room CRUD against `DATA_SOURCE=mock` with no role guard, so there is no non-Admin refusal on this
surface to shape, and design section 6 does not need `rooms-forbidden` for this ticket.

Message-or-redirect is a real story decision and it is still owed — by the `AUT` ticket that
implements the guard, where the session it depends on will exist. Out-of-scope item 5 carries the four
withdrawn criteria to that group verbatim, along with the requirement that the check live in the
server action rather than in `PermissionGate`, so the substance is not lost in the move. Answering it
here would have committed a future ticket to a shape decided before its dependency existed.

Their AC numbers are retired and not reused. A reference to `AC-10` written before the cut will not
silently resolve to something else.

Amended in `01-story.md`: AC-8 to AC-11 withdrawn, Permissions section rewritten, out-of-scope item 5,
assumption A-4 superseded, Changelog.

## Q4 — to a human, not to `ba`. Which sizing row governs a seam change?

`.ai/01-operating-model.md` sizes ROO-01 as `M` by file count — nine files — and as `XL` by the row
that reads "any size, if it touches the schema or the seam", since the ticket adds `createRoom`,
`updateRoom` and `deleteRoom` to `src/lib/data/`. XL escalates.

On the literal reading, every feature ticket that adds a seam function escalates, which would stop
the loop rather than constrain it. The intended reading is probably a *change to the seam's existing
contract* rather than an addition to it, but that is a guess about a human-owned standard, and this
stage does not edit `.ai/01-operating-model.md` (RULE-01 covers the registry; the operating model is
human-owned per `.ai/standards/testing-standards.md`). `size` has been left unset in `ticket.yaml`
pending this.

**Answer — human decision, 2026-08-12. Transcribed by the orchestrator; the words are the
operator's.**

The Sizing table's XL wording was wrong, twice. It first read "touches the seam", and the correction
to that read "changes `types.ts`". Both made every feature ticket escalate — the first because every
feature ticket adds a seam function, the second because every feature ticket adds a DTO. An XL row
that catches everything constrains nothing.

The test is whether **existing callers must change**. A schema migration, a changed signature that
existing callers must follow, or a reshaped type that ripples outward — those are XL. Adding a new
function to `src/lib/data/`, or a new type alongside the existing ones, is ordinary feature work.

**ROO-01 is M.**

> *Orchestrator note, not the operator's voice.* The rule above is the decision and it governs. The
> corresponding edit to the Sizing table in `.ai/01-operating-model.md` had not landed in the working
> tree when this was transcribed at `2026-08-12T16:23:48Z` — the row still read "or changes
> `types.ts`". Reported to the operator; the decision is recorded here so it is not lost if the paste
> is re-applied later. `size` remains unset in `ticket.yaml` regardless: it is `tech-lead-design`'s
> field, written at DESIGN.

## Q5 — to a human. `tech-lead-design->ba` is missing from `chat_budget`

The chat topology allows the edge; `.ai/templates/ticket.yaml` does not seed a budget for it, and
`ba->product` is missing for the same reason. `.claude/hooks/chat-guard.mjs` does not block a write
addressed to `ba` — `ba` is not a judge, and with no matching budget line the RULE-15 count is
skipped — so the omission is silent rather than enforced. Either the template gains the two pairs, or
its comment is amended to say the map is not the topology.

**Deferred, not answered — human, 2026-08-12.** This is a real gap in the model and it is logged in
`.ai/board/model-defects.md` as MD-2 rather than decided here. It does not gate DoR and it did not
block this ticket: `chat-guard.mjs` let Q1 to Q3 through because `ba` is not a judge, which is
exactly why the omission is worth fixing deliberately rather than in passing. Answering it inside a
ticket would settle a template question on one ticket's convenience.

---

# Second round — raised at DESIGN, 2026-08-12T16:30:41Z

Both are for `ba`. **Neither blocks `/implement` and both block `/qa`**, for the reason given in
`02-design.md` section 0.2: each resolves to a test or a number, and neither changes a signature, a
file in `allowed_paths`, or a `data-testid`. The DESIGN gate passed on that basis.

A third item travels with them and is already owed: out-of-scope item 3 of `01-story.md` still says
this ticket carries a pending `schema_delta` and `requires_adr: true`. A human returned both to `none`
and `false`, and `02-design.md` section 4 confirms `none`. One RULE-14 pass covers all three.

## Q6 — for `ba`. Deleting a room destroys its network ports. Is that intended, and does it want a criterion?

Raised by the operator in `ticket.yaml` and passed on unchanged, not decided at DESIGN.

`prisma/schema.prisma` declares `NetworkPort` to `Seat` as `onDelete: Cascade`, and in the seam DTO a
port is a field *of* a seat (`Seat.ports`). INV-11 deletes a room's seats, so those seats' ports go
with them and there is no shape of this design in which they do not. No acceptance criterion mentions
it, and out-of-scope item 7 sends ports to the `SEA` group without noting that this ticket destroys
them.

Two resolutions, and the implementation is byte-for-byte identical under both:

- **(a)** An acceptance criterion in AC-14's shape, asserting the ports of a destroyed seat no longer
  exist. It adds a test, not code. Ports appear on no surface here, so it needs no `data-testid` —
  it is a unit test at the seam, like AC-14.
- **(b)** A line in out-of-scope item 7, or against INV-11 in the story, saying the loss is intended
  and deliberately uncriterioned.

What should not happen is neither: a permanent data loss that no criterion covers and no test
exercises is one refactor away from becoming a silent one.

**Answer:** (b) — recorded, deliberately without a criterion.

A port belongs to a seat and is part of that seat's fixed physical description (glossary), and you
note that in the seam it is a field *of* a seat rather than a row with an identity of its own. That
is what settles it: AC-6 already asserts the seats are gone, so a criterion asserting their ports are
gone would assert the same fact a second time and could not fail independently of AC-6. A test that
cannot fail on its own is coverage in name only.

This is the opposite of AC-14, and the asymmetry is the point. A device **survives** its seat — INV-07
says it may exist unassigned — so there is a state after the cascade that can be right or wrong, and
it needs a criterion. A port has no after-state to be wrong about.

Your "what should not happen is neither" is right, so the loss is now stated: out-of-scope item 7
records it as intended, with the condition attached that reverses this answer. The day `SEA` gives a
port a seam read path of its own, a port can outlive its seat the way a device does, and this needs a
criterion in AC-14's shape from that point on.

Amended in `01-story.md`: out-of-scope item 7, Changelog.

## Q7 — for `ba`. AC-6 needs a room with exactly three seats, and no such room exists

AC-6's Given is "a room exists that contains exactly three seats" and its assertion is "that number
is three". `src/lib/data/fixtures.ts` builds **two rooms of six seats each** — `seatRow(...)` is
called twice per room, three seats at a time. There is no three-seat room, this ticket creates no
seats (out-of-scope item 1), and a room created through AC-2 has none at all.

QA cannot resolve this for itself in either direction. It cannot construct the setup, because seat
creation does not exist on this surface; and it cannot look up the real number, because RULE-05 keeps
it out of `src/**` and `fixtures.ts` is `src/**`. Written as it stands, AC-6 is the INV-11 criterion
and it is the one criterion on this ticket QA cannot execute.

Three resolutions:

- **(a)** Amend AC-6's Given and its assertion to the number a fixture room actually contains — six —
  and state which room. Cheapest, no code and no fixture change.
- **(b)** Amend AC-6 to assert the confirmation names *the number of seats that room contains*, and
  state the number in the Given as the setup datum QA is entitled to be told. Slightly weaker as an
  assertion, and it survives a later fixture change.
- **(c)** Change the fixture set so a room holds three seats. This one is **not** `ba`'s and is not
  recommended: `.ai/standards/data-model.md` documents the seed composition as "2 rooms, about 12
  seats", it is a human-owned standard, and `fixtures.ts` is shared with `prisma/seed.ts`. It is
  listed only so the option is visibly considered and visibly declined.

`02-design.md` section 6 already gives QA `room-delete-seat-count`, a bare integer, so the assertion
is addressable whichever way this lands. What is missing is which room and what number.

**Answer:** (b), with the datum from (a).

AC-6's Given now reads "at least one seat, and *N* is the number it contains", the assertion is that
the confirmation names *N* and that *N* seats are destroyed, and the Given also names `ROOM-A` and its
six seats as the setup datum QA is entitled to be told.

(a) alone would have pinned the INV-11 criterion to a fixture count, and the fixture is not what
INV-11 constrains — the invariant is that the number shown equals the number lost, which is a relation
between two values, not either value. Written as a literal it would also break the next time the seed
changes, and `.ai/standards/data-model.md` fixes the seed composition as a human-owned standard, so
that change is somebody else's to make and would arrive without warning.

You were right to decline (c). The three-seat room was mine to fix, not the fixtures'.

`room-delete-seat-count` needs no change; it is still the bare integer the assertion reads.

Amended in `01-story.md`: AC-6 and the note beneath it, Changelog.

---

# Third round — raised at the DESIGN amendment, 2026-08-21T03:23:13Z

## Q8 — for `ba`. Should the delete cascade null `seatId` on seat requests pointing at destroyed seats?

**This blocks neither `/implement` nor `/qa`.** No acceptance criterion reaches it, no surface renders
a request, and no invariant covers it. It is raised because this ticket is what makes the state
reachable, and because the next group to touch requests should inherit it knowingly rather than find
it.

`fixtures.ts:86`'s `req-01` names `seat-a-03` and `room-a`. After `deleteRoom("room-a")` both are
gone and the request still names them — verified by execution, and true both before and after the R8
fix in version 3 of `02-design.md`, because nothing in this ticket writes the requests array.

The mock therefore diverges from the schema. `prisma/schema.prisma` declares
`SeatRequest.seat ... onDelete: SetNull`, so a real database would set `req-01.seatId` to `null` when
its seat is destroyed. It declares no relation at all on `SeatRequest.roomId`, so that one dangles in
both implementations — a schema property, not a choice made here.

Three resolutions:

- **(a)** A criterion in AC-14's shape: after a room is deleted, a seat request that named one of its
  seats still exists and names no seat. The cascade gains about five lines, mirroring
  `onDelete: SetNull` exactly as AC-14 mirrors it for devices, and it becomes assertable.
- **(b)** A line in out-of-scope item 7 recording that requests are deliberately left dangling by this
  ticket and that `REG` owns the reconciliation. The mock keeps diverging from the schema, knowingly.
- **(c)** Nothing. Not recommended — the divergence is then discovered by whoever first runs `REG`
  against `DATA_SOURCE=prisma` and finds behaviour the mock never showed.

DESIGN did not decide it, for the same reason version 2 kept a `SEAT_COUNT_CHANGED` refusal out of
section 1: implementing a behaviour with no criterion means QA cannot test it and the Developer is
inventing the rule.

**Answer:** (b) — recorded in out-of-scope item 7, with `REG` named as the owner.

(a) is the consistent-looking answer and I am declining it. AC-14 exists because a device left
pointing at a destroyed seat while still flagged primary violates INV-04 and INV-05, against a row
that cannot be repaired afterwards because the seat naming its correct owner is gone. That is an
invariant failure. A request naming a destroyed seat is not: no invariant in the ledger has a seat
request as its subject, which is the same conclusion `04-review.md` reached under R8. Mirroring
`onDelete: SetNull` for devices was obligatory; mirroring it for requests is a preference.

Against that, (a) is five lines of cascade written at QA, after REVIEW has passed, for behaviour with
no feature row behind it — the Developer would be inventing the rule, which is the reason you kept
`SEAT_COUNT_CHANGED` out of section 1 and it applies unchanged here.

So the divergence is written down instead: the mock leaves the request naming its destroyed seat, the
schema would blank it, and `REG` inherits the reconciliation knowingly. That is your (c) risk closed
without spending a rework cycle to close it. If the operator would rather have it now, it is a story
amendment and a design amendment, not a QA-stage fix.

Amended in `01-story.md`: out-of-scope item 7, Changelog.

---

# Fourth round — raised at QA, 2026-08-21T09:19:56Z

```yaml
from: qa
to: ba
asked_at: 2026-08-21T09:19:56Z
```

Q6 and Q7 are still unanswered above and both still block this gate. Q7 is now confirmed by
execution rather than by reading: `tests/e2e/rooms.spec.ts` enumerates every listed room through
`room-delete-seat-count`, which design section 6 provides for exactly this, and reports

```
[["ROOM-A",6],["ROOM-B",6],["QA-AC2-…",0],["QA-AC4-…",0],["QA-AC4R-…",0],["R-101",0]]
```

No room holds three seats, and the only rooms QA can create hold none. AC-6 is written and it fails
on its Given. It is the INV-11 criterion, so this is the one gap on this ticket that leaves an
invariant unprobed at the gate.

Q9 below is new and is of the same kind as Q7 — an acceptance criterion whose Given names a fixture
state that no artifact reaching QA discloses.

## Q9 — for `ba`. AC-14's Given names a device, a seat and a room that QA cannot identify

AC-14 reads "Given a room exists containing a seat, and a device is assigned to that seat as its
primary device". To execute it QA must know **which** room to delete and **which** device to assert
on afterwards. Neither is knowable here:

- Devices appear on no surface this ticket builds (out-of-scope item 7), so there is no `data-testid`
  in design section 6 that names one — section 6 says so itself, under "AC-14 has no selector, by
  design".
- `src/lib/data/fixtures.ts` is `src/**`, and RULE-05 keeps QA out of it. This is the same wall Q7
  ran into.
- Unlike AC-6's room, this setup cannot be constructed either: seat creation and device assignment
  are both out of scope (items 1 and 7), so QA cannot build the Given even in principle.

Two resolutions, both cheap and neither touching code:

- **(a)** Amend AC-14's Given to name the seeded room, seat and device as setup data QA is entitled
  to be told — in the same shape AC-12 already uses when it names `R-101`. This is the resolution
  that matches how the story treats every other datum it hands QA.
- **(b)** Amend AC-14 to assert over *any* primary device on *any* seat of the deleted room, with the
  Given stating only that the seed contains at least one such device. Weaker as an assertion and it
  survives a fixture change, but it still needs `tech-lead-design` to answer Q10 below before it can
  be written.

Either way AC-14 also needs Q10 answered. Q9 alone does not unblock it.

**Answer:** (a). AC-14's Given now names `ROOM-A` and the device `dev-01`, and adds `dev-04` as a control.

You are right that this is the shape AC-12 already uses for `R-101`, and right that it is the only
resolution that works: (b) cannot be constructed either, because seat creation and device assignment
are both out of scope, so weakening the Given to "any primary device on any seat" would leave QA with
a criterion it still could not set up.

The control is an addition to what you asked for. `dev-04` sits on a seat in the other room and must
come back untouched. Without it AC-14 passes against a cascade that detaches every device in the
system, which is the more damaging of the two failures and the one a single-device assertion cannot
see.

The identifiers reached this story through `03-impl-log.md` and `04-review.md`, which name them in
their INV-06 and INV-07 rows — not from `fixtures.ts`, which RULE-05 keeps me out of as firmly as it
keeps you.

**This does not unblock AC-14 on its own.** Your Q10 to `tech-lead-design` still stands: naming the
device does not tell you which seam function may be called to read it back, and I cannot answer that
without designing. AC-14 needs both answers.

Amended in `01-story.md`: AC-14 and the note beneath it, Changelog.

---

```yaml
from: qa
to: tech-lead-design
asked_at: 2026-08-21T09:19:56Z
```

## Q10 — for `tech-lead-design`. Section 6 mandates a seam unit test but does not name the seam entry points it needs

Section 6 closes with: "it is verified at the seam: call `deleteRoom` and assert the device still
exists with `seatId: null` and `rank: "SECONDARY"`. That is a unit test in `tests/unit/rooms.test.ts`
against `@/lib/data`."

`deleteRoom` is the only name in that sentence. Asserting that a device "still exists" needs a second
call — a device read — and section 6 lists no such name, no argument and no return shape. Section 1
would have them, but the QA dispatch is the story and section 6 only, and the working agreement in
`CLAUDE.md` forbids inventing one.

Section 6 is the right place for this and is already most of the way there: it is the file that
decided AC-14 is a seam test rather than a UI test, and it is the only channel RULE-05 leaves open.
What it needs is the seam surface QA is permitted to call, in the shape of the selector table above
it — the function name, its argument, and enough of its return shape to assert `seatId` and `rank` on.

`tests/unit/rooms.test.ts` is listed in `allowed_paths` and has deliberately **not** been created. A
stub or a skipped test would read as coverage that does not exist, which `.ai/standards/testing-standards.md`
rules out directly.

**Answer:** You are right, it is an omission in section 6, and the fix is where you said it belongs.

`02-design.md` **section 6.1** is new and names the whole seam surface you may call — `listRooms`,
`deleteRoom`, `listDevices` — with the import line, each argument, and the return fields AC-14 asserts
on. Anything absent from that table stays out of bounds, on the same footing as an unlisted selector.

Three things it also tells you, because each would otherwise be found through a failure:

- The story names rooms by `code` and `deleteRoom` takes an `id`. `listRooms()` is the bridge; ids are
  `crypto.randomUUID()` and are not stable across a run, which is the same fact that re-keyed the row
  selectors in Q11.
- `dev-04`, the control device `ba` added under Q9, sits on a seat this document does not disclose and
  you may not look up. Snapshot `listDevices()` before the delete and assert its entry is unchanged
  after. That is a stronger assertion than a literal — it fails if any field moves.
- Mock state is process-global and does not reset. Vitest isolates per file, so the delete cannot
  reach another file; within `tests/unit/rooms.test.ts` it reaches every test after it. There is no
  reset hook, and `02-design.md` section 7 says why not.

Declining to write a stub was correct and is the reason this is a design amendment rather than a
Developer fix.

Amended in `02-design.md`: section 6.1, section 0.4, Changelog.

## Q11 — for `tech-lead-design`. `tests/e2e/smoke.spec.ts` is broken by section 6's row re-keying and is outside `allowed_paths`

`pnpm test:e2e` exits 1 on a test this ticket did not write and QA may not edit:

```
tests/e2e/smoke.spec.ts:38  "fixtures reach the rooms table"
  getByTestId('rooms-row-room-a')  — element(s) not found
```

Section 6 re-keys rows from room id to room `code`, with a reason QA has no argument with — ids are
minted with `crypto.randomUUID()` and a test cannot address a room it just created. The seeded rooms
are consequently `rooms-row-ROOM-A` and `rooms-row-ROOM-B`, and the Phase B smoke test that addressed
them by id no longer resolves. The implementation is doing what section 6 specifies; the test that
predates section 6 is not.

This is not routed to `developer`: `allowed_paths` contains `tests/unit/rooms.test.ts` and
`tests/e2e/rooms.spec.ts` and nothing else under `tests/`, so no agent on this ticket has been able to
touch `smoke.spec.ts` at any stage. It is a design-side omission — the decision that broke the file and
the list that excludes it are both section 5 and 6's.

Two resolutions:

- **(a)** Add `tests/e2e/smoke.spec.ts` to `allowed_paths` so the two id-keyed assertions can be
  re-pointed at the code-keyed testids. One line each, no behaviour change. Note this takes the file
  count from 12 to 13, which is the `L` row in the Sizing table — the same "must split at DESIGN over
  one line" pressure the v3 amendment recorded avoiding for `mock/layout.ts`.
- **(b)** Leave section 6 as it is and record the smoke assertions as this ticket's to break, with a
  human amending them outside the ticket's path budget.

The QA gate requires `pnpm test:e2e` to exit 0, so this blocks the gate under either resolution until
one is applied. Every other e2e test passes: 22 of 24, with the second failure being AC-6 above.

**Answer:** (a). `tests/e2e/smoke.spec.ts` is added to `allowed_paths` and the two assertions are
yours to re-point: the seeded rows are `rooms-row-ROOM-A` and `rooms-row-ROOM-B`.

Your framing is the right one and I am adopting it as a rule rather than a one-off: **a design that
breaks a file must put that file in reach of the ticket that broke it.** Section 6 made the decision
that broke `smoke.spec.ts:40-41` and section 5 is the list that excluded it; leaving the repair with
no owner is a design defect, not a QA problem. Resolution (b) — a human patching it off the board —
trades a visible file for an invisible manual step, and the ticket that caused the break is the
cheapest place to absorb two selector strings.

The re-keying itself stands, for the reason you already accept.

You are also right about the count, and it is paid rather than avoided: thirteen files is the `L` row.
The ticket is **not** split — that clause is a pre-implementation instrument and this ticket is
implemented with a REVIEW `PASS` — and `02-design.md` section 5 carries the reasoning in full,
together with the observation that this is the second time the Sizing table has pushed toward the
wrong answer on ROO-01 by weighing an amendment as though it were new scope. That is model debt for
the steward and is deliberately not acted on inside a ticket.

Amended in `02-design.md`: section 5, section 0.4, Changelog. `ticket.yaml`: `allowed_paths`, `size`.

---

# Fifth round — raised at the QA re-run, 2026-08-21T09:49:30Z

```yaml
from: qa
to: ba
asked_at: 2026-08-21T09:49:30Z
```

Q6 to Q11 are all answered and all of them landed. The AC-6 amendment made that criterion executable
and it passes on both levels; the AC-14 amendment made most of AC-14 executable; section 6.1 gave the
seam surface the unit test needed; and `smoke.spec.ts` is repaired and green. `pnpm test:e2e` exits 0
with 24 of 24 passing. One clause of one criterion is left, and it is the same shape as Q7 rather
than a new kind of problem.

## Q12 — for `ba`. AC-14's control device `dev-04` is not primary, and no device that would satisfy the clause survives the delete

AC-14's Given now reads "the device `dev-04` is assigned to a seat in a different room", and its last
Then reads "`dev-04` is unchanged — still assigned to its seat, still primary".

Executed through the surface section 6.1 permits — `devices.listDevices()`, asserting on `id`,
`seatId` and `rank`, snapshotted before and after `rooms.deleteRoom` — the seed disagrees with the
second half:

```
AC-14's Given says dev-04 is primary, and it is SECONDARY. It did come back unchanged (true), so the
control's substance holds and only the rank clause is wrong. Devices that were assigned AND primary
before the delete: [{"id":"dev-01","survivedUnchanged":false},{"id":"dev-03","survivedUnchanged":false}]
```

Three facts, and the third is the one that decides this:

1. `dev-04` **is** assigned to a seat, and it **is** unchanged by the delete — deep-equal to its
   pre-delete snapshot. Everything the control exists to prove holds. Its rank is `SECONDARY`.
2. Exactly two devices were assigned *and* primary before the delete: `dev-01`, which AC-14 already
   names as the device that must be detached, and `dev-03`.
3. **Neither survived the delete unchanged.** `dev-03` was detached too, which means its seat was in
   `ROOM-A` as well. So there is no device anywhere in the seed that is assigned to a seat in a room
   other than `ROOM-A` *and* primary. The clause as written cannot be satisfied by any substitution
   of the device id.

This is Q7's shape: a Given naming a fixture state the seed does not have. It is narrower — one
clause of one criterion, and the criterion's purpose is already met — so it is stated with its
resolutions rather than left open.

- **(a)** Drop `still primary` from the last Then and the implied rank from the Given, leaving
  "`dev-04` is unchanged — still assigned to its seat". The assertion in the test is already deep
  equality against the pre-delete snapshot, which is strictly stronger than the two named fields: it
  fails if *any* field moves, rank included. Recommended, and it is the resolution that needs nothing
  from anyone else.
- **(b)** Keep the clause and change the seed so a primary device sits on a seat outside `ROOM-A`.
  This is **not** `ba`'s: `.ai/standards/data-model.md` documents the seed composition and is
  human-owned, and `fixtures.ts` is outside `allowed_paths` on this ticket. Listed so it is visibly
  considered and visibly declined, as Q7's option (c) was.
- **(c)** Point the control at `dev-03` and keep `still primary`. **This does not work** and is listed
  only to close it off — fact 3 above shows `dev-03` is detached by the same cascade, so it is a
  second detached device, not a control.

Nothing else blocks. On (a) this is a one-line edit to `01-story.md` and a one-line edit to
`tests/unit/rooms.test.ts`, and the gate closes.

**Answer:** (a), and thank you for executing it rather than reporting it as a mismatch.

The clause was wrong and it was mine. `dev-04` came to this story through `04-review.md`, which
records it as "untouched at `seat-b-01`" — that establishes it is seated and survives, and says
nothing about rank. I wrote "still primary" anyway. That is the same defect as Q7 and Q9 for the third
time, and this time I introduced it in the amendment that fixed the other two: a Given asserting
fixture state that no artifact reaching me disclosed.

Your fact 3 is what makes (a) the only option rather than the cheapest one. If some other device were
primary outside `ROOM-A` this would be a substitution; there is none, so the clause is unsatisfiable
by construction and (c) is closed for the reason you give. (b) is correctly declined and for the
right reason — the seed composition is a human-owned standard and `fixtures.ts` is outside
`allowed_paths`, which is Q7's (c) again.

The new clause is "`dev-04` is unchanged in every respect — still assigned to the same seat, with no
field of it altered". It is deliberately not a list of fields. Naming fields is what admitted the
error, and the deep-equality assertion you already have is strictly stronger than any list I could
write: it fails if a cascade corrupts a field the story never thought to name. The story now says what
the test already does.

Amended in `01-story.md`: AC-14's last Then, the note beneath it, Changelog.


