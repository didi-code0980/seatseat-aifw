---
ticket: GRP-02
from: qa
to: tech-lead-design
raised_at: 2026-08-26
blocks: nothing
---

# GRP-02 — open questions

Questions raised by a stage that cannot answer them from its own inputs, and the stage they are
routed to. Each is stated in full here and in full wherever it is acted on, because every artifact
stands alone (RULE-16).

**Nothing here blocks.** `05-test-plan.md` and `06-test-report.md` carry `gate: PASS` with this open.
It is recorded because it is a defect in section 6 that the next QA pass on this ticket — or the next
ticket that inherits this section's shape — will hit again, and because the file it concerns is an
enumerated `allowed_path` that this stage did not write.

---

## F-1 — Section 6 names no seam call, so `tests/unit/member-groups.test.ts` cannot be written

**Routed to:** `tech-lead-design`. **Raised by:** `qa`, QA. **Blocks:** nothing. **Would add:** the
seam half of AC-3 through AC-8 and AC-10 as unit tests.

`ticket.yaml`'s `allowed_paths` enumerates ten files. Nine are written. The tenth,
`tests/unit/member-groups.test.ts`, is not, and the reason is not a QA choice.

**What section 6 gives QA is a testid contract and nothing else.** Its first table, and the three
restated tables in 6.4, are all `data-testid` values on rendered controls. That is complete for
`tests/e2e/member-groups.spec.ts` — every one of AC-1 through AC-11 is covered there, and the
`05-test-plan.md` coverage map says which test carries which. **It is empty for a unit test.** A unit
test at this seam has to call a function by name, and no function name appears anywhere in section 6.

**QA may not go and find one.** RULE-05 forbids reading `src/**`, `guard-read-scope.mjs` enforces it,
and section 6 states the consequence in its own opening line: *"a control missing from these tables
does not exist as far as QA is concerned."* The same holds of a seam call. So the writer this ticket
adds for `Member.groupId` — `ticket.yaml`'s `schema_delta` note says one seam function is ADDED — is
unaddressable from here, as is whatever composes `listGroups()` into the name map that AC-1's column
renders.

**Section 6.4 points at the answer and at a section QA may not open.** Its closing paragraph reads
*"that is the whole of AC-11 through the UI, and the seam half is stronger anyway (section 3.1)."*
Section 3.1 is section 3. `/qa` dispatches this stage with `01-story.md` and **section 6 only** —
*"a QA agent that can see `04-review.md` is testing the reviewer's conclusions instead of the story"*
— so the pointer resolves to nothing that this session is permitted to read.

**This is a regression against the two worked precedents, not a novel gap.** `tests/unit/members.test.ts`
opens with *"Section 6.1 names the ten calls this file may make and the fields it may assert on"*, and
`tests/unit/groups.test.ts` with *"Section 6.1-6.4 name the seam calls this file may make and the
fields it may assert on."* Both are QA artifacts on disk and both are readable from here; each records
that its design supplied what this one does not.

### Answer needed

An amendment to section 6 — not an answer in this file (RULE-14) — naming, for the seam this ticket
touches:

1. **The writer.** The exported name of the function that assigns a member to a group, its parameter
   shape, and its return shape on success and on the AC-6 refusal. Section 6.3 item 2 already gives
   the form-level refusal string *"A group is required."*; the seam's refusal for a group that no
   longer exists is the equivalent and is absent.
2. **The field the DTO carries.** AC-7's *at most one group* is a cardinality claim, and asserting it
   at the seam means asserting on one field of one member. `01-story.md` calls it `Member.groupId`,
   which is the Prisma model's name; whether the seam DTO exposes that name, a resolved group object,
   or something else is a section 1 fact and is not in section 6.
3. **Whether the group NAME is resolved at the seam or composed at the page.** `ticket.yaml`'s
   `schema_delta` note says *"the members page composes it into a name map"* and *"no seam READ is
   added at all"*, which suggests AC-1 has no seam half at all. If that is right, say so in section 6
   and the unit file is correctly empty for AC-1 — but AC-3 through AC-8 and AC-10 still have one.

### What was done instead

Nothing was guessed and no name was invented. `tests/unit/member-groups.test.ts` is absent rather
than written against an assumed export, and `05-test-plan.md` states for each AC that its level is
`e2e` and why there is no unit row. The e2e suite carries all eleven criteria plus three of section
6.3's uncovered behavioural facts, and both suites exit 0.

**The cost of leaving it is not zero and is worth stating plainly.** Every "nothing else changed"
assertion in this suite — AC-8, AC-9, AC-10, AC-11 — is made by reading rendered tables. That is a
true statement about the surface and a weaker one about the store: a write that changed a field no
column renders would pass. Section 6.4 says as much when it calls the seam half stronger.
