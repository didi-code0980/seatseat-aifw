# DEV-01 — open questions

Questions raised by a stage that cannot answer them from its own inputs, and the stage they are
routed to. Each is stated in full here and in full wherever it is acted on, because every artifact
stands alone (RULE-16).

**None of these blocks DESIGN.** `02-design.md` passed its gate on `2026-08-23T07:19:53Z` with all
five open. They are stated as findings in section 0 of that document, which is the binding record;
this file is the routing.

**They are unsafe to carry into QA.** Each one is a criterion that is missing, incomplete, or
inferred, and QA may not invent one (RULE-05, and it cannot read `src/**` to check). One RULE-14 pass
over `01-story.md` closes all five, and it should happen before `/qa`, not before `/implement` —
nothing here changes what the Developer builds.

---

## F-1 — `Device.assetTag` is `@unique`, so A-3 is false and AC-3 is incomplete

**Routed to:** `ba`. **Raised by:** `tech-lead-design`, DESIGN. **Blocks:** QA, not IN_PROGRESS.

`01-story.md` A-3 assumes no field of a device carries a uniqueness constraint and says "DESIGN is
expected to check this and raise it". `prisma/schema.prisma:185` reads `assetTag String @unique`.

`02-design.md` specifies the refusal anyway — the seam is agreeing with the model, not adding a rule,
and a mock that accepts a duplicate accepts data the database rejects. What is missing is the
criterion.

**Answer needed:** an acceptance criterion refusing a duplicate asset tag, in the shape `ROO-01`'s
AC-12 took for `Room.code`. Section 6 of the design already carries the selector for it
(`device-create-tag-error`) marked *pending F-1*.

This is `ROO-01`'s B3 repeating on a second entity. Worth noting when it is answered: a story's
uniqueness assumption has now been wrong twice, on both entities the loop has specified, because
`.ai/standards/data-model.md` states it "contains no field names" and the BA has no other source.

---

## F-2 — Q-1 answered: the device's field set

**Routed to:** `ba`. **Raised by:** `tech-lead-design`, DESIGN. **Blocks:** QA, not IN_PROGRESS.

`01-story.md` Q-1 asks what a device's required fields are. Transcribed from
`src/lib/data/types.ts` and `prisma/schema.prisma:183-201`:

- Collected by the form, all required: `assetTag`, `model`, `ownerId`.
- Not collected: `id` (minted by the seam), `seatId` (always null at create), `rank` (always
  `SECONDARY` at create).

**Answer needed:** AC-2, AC-3 and AC-4 amended from "every required field" to the three named fields.
The criteria become more specific, not different, which is what the story predicted.

Note for whoever amends it: `data-model.md`'s raw-SQL sketch names `"Device"."isPrimary"` under its
own `TODO(verify):`. The approved draft uses `rank DeviceRank`. The design uses `rank`. Reconciling
`data-model.md` is human work under RULE-01 and no agent has done it.

---

## F-3 — `ownerId` is nullable, and no DEV-01 path can clear one

**Routed to:** `ba`. **Raised by:** `tech-lead-design`, DESIGN. **Blocks:** QA, not IN_PROGRESS.

`prisma/schema.prisma:189` makes `ownerId` nullable and the seed contains one device with no owner.
AC-2 and AC-3 make an owner mandatory at creation. The design also makes it mandatory at edit — one
schema for the field on both paths — with the consequence that **this surface can set an owner and
never unset one**, and the seeded ownerless device can be edited only by giving it one.

**Answer needed:** either a line in AC-4 confirming the owner is required on edit, or a line in
out-of-scope recording that returning a device to unowned belongs elsewhere. Also a decision on how
AC-1 should describe an ownerless device — the design renders the literal `unowned`.

The alternative, an *Unowned* option in the picker, is rejected in `02-design.md` section 7 with its
reasons. Reversing that is a criterion plus a fifth reason code, not a rewrite.

---

## F-4 — Q-2 answered: the seat picker is flat and carries the occupant

**Routed to:** `ba`. **Raised by:** `tech-lead-design`, DESIGN. **Blocks:** nothing.

`01-story.md` Q-2 asks whether the assign control is scoped by room and states the story's position
that it must not be, while noting the choice affects `size` and is DESIGN's to confirm. Confirmed: a
flat select over every seat, not scoped by room. `size` is `M` and the choice did not move it.

The reason is stronger than list ergonomics: the option label carries the seat's occupant, which is
what makes AC-8 and AC-10 constructible by QA without disclosing the seed. Exact label format is in
`02-design.md` section 6.

**Answer needed:** none, unless `ba` disagrees. Recorded so Q-2 is closed rather than left open.

---

## F-5 — A-5 verified, and AC-8's Given is not in the seed

**Routed to:** `ba`. **Raised by:** `tech-lead-design`, DESIGN. **Blocks:** QA, not IN_PROGRESS.

`01-story.md` A-5 infers from counts that the seed holds an unoccupied seat and a seat whose occupant
owns a device on it. Verified against `src/lib/data/fixtures.ts`: both hold. A-5 can be recorded as
confirmed rather than assumed.

**What the seed does not contain is AC-8's Given.** Every seeded device that sits on a seat is owned
by that seat's occupant, because INV-05 makes it so. A device whose owner is not the occupant must be
constructed, and it is constructible entirely through this surface — create, assign, then attempt to
designate. `02-design.md` section 6.2 hands QA the route for this and every other Given.

**Answer needed:** a line in A-5, or in AC-8, recording that its Given is constructed rather than
seeded. Without it a QA agent will write the test with no setup and report the wrong thing when it
fails.

---

## Not a question — recorded because it has no other home

**The `tech-lead-design` to `ba` chat edge has no `chat_budget` pair.** `ticket.yaml` seeds four
pairs and omits this one, although the chat topology in `.ai/01-operating-model.md` permits it. That
is MD-04 in `.ai/board/model-debt.md` and MD-2 in `.ai/board/model-defects.md`, both open, both filed
by `ROO-01` for the same reason at the same stage.

The consequence here is that F-1 to F-5 reach `ba` as a file rather than as a conversation, and if
they were a conversation it would be unbudgeted and uncounted, exactly as `ROO-01`'s Q1 to Q3 were.
`consulted` in `02-design.md` is empty and `chat_before_verdict` reads `none`; both are accurate.

Nothing is asked of `ba` here. It is the second ticket to hit the same gap at the same stage, which
is the kind of evidence the steward asked for.

---

## QA's reading of F-1 to F-5, appended at the QA gate on 2026-08-23

**Added by `qa`, additive only. Nothing above is edited** — F-1 to F-5 are `tech-lead-design`'s
findings and their routing to `ba` stands as written.

The section above says all five are *unsafe to carry into QA* and should be closed by one RULE-14
pass before `/qa`. That pass did not happen — `01-story.md`'s changelog has two entries,
`2026-08-23T06:53:48Z` and `2026-08-23T07:09:56Z`, and neither amends AC-2, AC-3, AC-4, AC-8 or A-5.
QA ran anyway rather than blocking, and this is the record of what that cost, because the claim
turned out to be true of one of the five and not of the other four.

**F-2, F-3, F-5 and F-4 cost this stage nothing**, because section 6 of `02-design.md` already
carries what QA needed and section 6 is an input QA is given:

- **F-2** — the device's field set. AC-2, AC-3 and AC-4 say "every required field"; section 6 lists
  exactly three create inputs (`device-create-tag`, `device-create-model`, `device-create-owner`)
  with one error element each. AC-3 was tested against those three.
- **F-3** — `ownerId` nullable, no path clears one. Section 6 specifies the literal `unowned` for the
  owner cell, which is all AC-1 needs; AC-4 was tested by editing the model, so the open question of
  whether the owner is required on edit was never load-bearing.
- **F-5** — AC-8's Given is not in the seed. Section 6.2 hands QA the route — create, assign, attempt
  to designate — and both suites take it. No test assumed a seeded mismatch.
- **F-4** — asked for nothing and closed Q-2.

**F-1 is the one that left a hole, and it is still open.** The seam refuses a duplicate asset tag
and section 6 carries `device-create-tag-error` for the message, marked *pending F-1*. There is no
acceptance criterion, so there is no test: QA may not invent one (RULE-05). A real refusal in the
shipped code is therefore unasserted, and deleting the check would not fail either suite. Both suites
mint a run-unique asset tag so the untested refusal is never triggered by accident.

**Nothing is asked of `ba` here that is not already asked above.** The answer F-1 needs is unchanged
— one criterion in the shape `ROO-01`'s AC-12 took for `Room.code`. This entry records that QA
reached its verdict with the gap open, so that whoever closes F-1 knows a test is owed with it and
does not read the QA gate as evidence the refusal was checked. Details in `06-test-report.md`, under
*One behaviour with no acceptance criterion*.

`consulted` is empty in both `05-test-plan.md` and `06-test-report.md` and `chat_before_verdict` is
`none` in both. This is a file, not a conversation, and no `chat_budget` pair moved.
