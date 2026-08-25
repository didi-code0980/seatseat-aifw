# GRP-01 — open questions

Questions raised by a stage that cannot answer them from its own inputs, and the stage or person they
are routed to. Each is stated in full here and in full wherever it is acted on, because every artifact
stands alone (RULE-16).

**None of these blocks anything.** `02-design.md` passed its gate on `2026-08-25T07:14:49Z` with all
three of them open, and `/implement` can run today without any of them being answered. They are stated
as findings in section 0 of that document, which is the binding record; this file is the routing, and
it carries the exact edit for each so that acting on one costs a paste rather than a reconstruction.

`Q-1`, `Q-2`, `Q-4` and `Q-6` from `01-story.md` are not here. All four were answered by the operator
at SPEC and are acceptance criteria now. `Q-3` and `Q-7` are not here either: both were routed to
DESIGN, both were answered on 2026-08-25, and both are written back into `01-story.md` under RULE-14.
`Q-5` is not here because it is already correctly routed — the operator's, through the steward, and it
gates nothing.

**The operator delegated these three to `tech-lead-design` on 2026-08-25 — *cứ quyết định theo phân
tích của bạn*. The decision taken was to write neither of the two files below and to route them
instead.** The reasoning is under *Not a question* at the foot of this file, because a delegation
declined without a recorded reason is indistinguishable from a delegation ignored.

---

## F-3b — `.ai/standards/data-model.md` describes the seed and omits the two groups it has always held

**Routed to:** the operator, through the steward. **Raised by:** `tech-lead-design`, DESIGN.
**Blocks:** nothing. **Severity:** real — it has already produced one wrong premise in one story.

`.ai/standards/data-model.md:122-124` reads:

> `prisma/seed.ts` and `src/lib/data/fixtures.ts` share fixture data so both modes render identically:
> 2 rooms, about 12 seats, 3 members across the three roles, 5 devices — 2 primary, 2 secondary, and 1
> unassigned, which exercises INV-07.

`src/lib/data/fixtures.ts:13-22` has held two groups and three members inside them since it was
written:

```ts
export const groups: Group[] = [
  { id: "grp-eng", name: "Engineering", parentId: null },
  { id: "grp-eng-platform", name: "Platform", parentId: "grp-eng" },
];

export const members: Member[] = [
  { id: "mem-admin",   ... role: "ADMIN",   groupId: "grp-eng" },
  { id: "mem-manager", ... role: "MANAGER", groupId: "grp-eng-platform" },
  { id: "mem-user",    ... role: "USER",    groupId: "grp-eng-platform" },
];
```

**This has already cost something.** `01-story.md` cited that sentence and concluded the seed had *no
groups at all*, which is why `Q-7` was opened — *how does QA reach the state AC-13 needs* — against a
state the seed already contained. The BA did nothing wrong: it read a human-owned standards document
and believed it, which is what that document is for. The next BA will do the same.

**The exact edit.** Replace `.ai/standards/data-model.md:122-124` with:

```md
`prisma/seed.ts` and `src/lib/data/fixtures.ts` share fixture data so both modes render identically:
2 groups — one nested beneath the other — 2 rooms, about 12 seats, 3 members across the three roles
and each belonging to one of the two groups, 5 devices — 2 primary, 2 secondary, and 1 unassigned,
which exercises INV-07.
```

Bump `doc_version` and `last_updated` in that file's front-matter with it.

**Why this stage did not make the edit.** `.ai/standards/**` is human-only, and it is not in GRP-01's
`allowed_paths` — writing it would fail `scripts/check-allowed-paths.mjs` and review check R1 on a
ticket that is otherwise clean. It is worth adding that **nothing would have stopped the write**:
`MD-05` records that `01-operating-model.md` declares the standards plane human-only while
`guard-registry.mjs` blocks only `.ai/registry/**`, and agents have written standards freely all run.
A guard that does not fire is not permission.

---

## F-4b — AC-12 says "delete and confirm", and under the design there is nothing to confirm

**Routed to:** `ba`. **Raised by:** `tech-lead-design`, DESIGN. **Blocks:** nothing — `02-design.md`
section 6.2 resolves it operationally so `/qa` can proceed either way.

`01-story.md` AC-12's *When* is *When I delete `A` and confirm*. The design refuses at the point of
request: pressing Delete on a group with children opens `group-delete-refused-dialog`, which has a
dismiss control and **no confirm control**. `group-delete-confirm` is never rendered for such a group,
so AC-12's *When* is not literally reachable.

The design took that shape rather than the literal one because asking a person to confirm a destructive
action that will not happen is the interaction MEM-01's section 7 alternative A rejected for INV-12,
and because AC-12's own *Then* — *a message states that its child groups must be deleted or moved
first* — is a rule about the tree, which reads as a rule when it arrives instead of a confirmation and
as a failure when it arrives after one.

**No criterion was rewritten.** An acceptance criterion is the BA's, and a design that edits the
criteria it is judged against has removed the gate. `02-design.md` section 6.4 item 3 states the
sequence for QA instead.

**Answer needed, if any.** Either a one-clause amendment to AC-12's *When* — *When I delete `A`* — or
a decision that the confirm-then-refuse dialog is wanted after all, which is a redesign of
`02-design.md` section 1.5 and overturns section 7 alternative G. **If nobody answers, nothing breaks:**
QA has the sequence, and the criterion's *Then* is asserted exactly as written.

---

## F-5b — the draft schema performs the reparent `Q-1` rejected

**Routed to:** the operator. **Raised by:** `tech-lead-design`, DESIGN. **Blocks:** nothing today.
**Becomes load-bearing:** the day `src/lib/data/prisma/groups.ts` stops returning `notWired`.

`prisma/schema.prisma:153`:

```prisma
parent Group? @relation("GroupTree", fields: [parentId], references: [id], onDelete: SetNull)
```

Under a wired Prisma implementation, deleting `Engineering` **succeeds** and sets `Platform.parentId`
to null — the child group moves silently to the top level. That is the *reparent* branch of `Q-1`,
which the operator rejected on the ground that a silent structural change is unexplainable without an
audit log the system does not have. It is declared in the model, in the file nobody has approved.

**Nothing is exposed today.** No migration exists, `DATA_SOURCE` is `mock`, `prisma/groups.ts` is four
`notWired` stubs, and `deleteGroup` refuses on both sides before any database is consulted — section
1.2 rule 6 and section 3.1. The line is a trap for the ticket that wires Prisma, not a live defect.

**The exact edit.** In `prisma/schema.prisma:153`, `SetNull` becomes `Restrict`:

```prisma
parent Group? @relation("GroupTree", fields: [parentId], references: [id], onDelete: Restrict)
```

That makes the model refuse what AC-12 refuses, rather than contradict it. `Member.group` at
`prisma/schema.prisma:167` is **already** `SetNull` and is **already** correct — it is `Q-2`'s detach,
and F-6 in the design records the agreement.

**Why this stage did not make the edit.** RULE-09 puts schema changes permanently behind a human, the
file's own header says so in its first two lines, and `prisma/schema.prisma` is not in GRP-01's
`allowed_paths` — the write would fail `scripts/check-allowed-paths.mjs` and R1. The operator's
delegation is a decision to let this stage choose; it is not an ADR, and writing one that recorded an
acceptance nobody gave would be a claim about a human rather than a record of one.

---

## Not a question — why a delegation was declined, recorded so it is not mistaken for an omission

The operator answered this stage's report with *cứ quyết định theo phân tích của bạn*. Against the
standing instruction *decide and report, do not ask*, declining to act needs its reason on the record.

The decision is that **F-3b and F-5b are not edits this stage may make, and the delegation does not
change that** — for one mechanical reason and one about what a signature is.

**Mechanical, and it is the decisive one.** `allowed_paths` was enumerated at ten files twenty minutes
earlier and `scripts/check-allowed-paths.mjs` passes against it now. Both proposed edits are outside
it. Making either would fail that check in CI and review check R1, converting a ticket that passed its
gate cleanly into rework — for two changes that block nothing and that no code path reaches while
`DATA_SOURCE` is `mock`. The cost of deferring is zero and the cost of acting is a rework cycle.

**About the signature.** RULE-09 names schema changes, ADRs, registry edits and merges together as
permanently human, and the enforcement is CODEOWNERS rather than a hook — which means the guard that
would have stopped F-5b is a review the operator performs at merge, not a refusal at write time. An
agent that writes through a guard that is enforced downstream has not been permitted, it has moved
where the disagreement happens. A one-line delegation in chat is authority to *decide*; it is not the
ADR that RULE-09 asks for, and treating it as one would put the operator's name on a schema decision
they described in six words.

**What was done instead.** Both edits are written out above in full, ready to paste, with their line
numbers verified against the files as they stand at `2026-08-25T07:29:59Z`. The standing instruction
that the ask arrives complete or it does not arrive is what this file is discharging.

**One thing this stage did do on its own authority**, and it is recorded because it is also outside
the command's declared artifacts: `01-story.md` was amended under RULE-14 to carry the answers to
`Q-3`, `Q-4`'s two residues and `Q-7`. That was not a judgement call — `Q-4` asks for it in terms
(*it amends this story under RULE-14 when it is settled*), and the answers are behavioural facts QA
must test while QA reads the story and design section 6 and not design section 1. No acceptance
criterion was added, removed, renumbered or reworded, and the story's front-matter was not touched.
