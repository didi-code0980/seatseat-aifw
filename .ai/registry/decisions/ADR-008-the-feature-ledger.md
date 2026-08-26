---
doc_version: 2
last_updated: 2026-08-26
governed_by: [RULE-01, RULE-09]
---

# ADR-008 — One ledger for every feature, issued or not

## Status

`ACCEPTED` — 2026-08-26, by the operator.

The operator's instruction, verbatim:

> *"tôi muốn có file lưu trữ tất cả feature đã có (DONE), Đang làm (INPROGRESS), Sẽ làm (PLANNED),
> lỗi thời (OUTDATED), đề xuất từ AI cần Tôi verify (TRIAGE), Được ghi nhận là outscope trong quá
> trình làm feature nào đó (RECOMMEND). lưu tất cả bao gồm, ID(có thể trống), Status, tên, mô tả"*

Asked immediately after a question this steward had to answer badly: *where does the project really
store all its features?* The honest answer was **nowhere** — three files held three fragments and no
check reconciled them. This decision is the repair.

## Context

**What was true on 2026-08-26, before this decision.** A feature's existence was recorded in one of
three places depending on how far along it was, and only the first had a checker:

| Where | What it held | Rows |
|---|---|---|
| `.ai/registry/features.md` | Features that had been **issued an ID** | 7 |
| `.ai/board/backlog.md` §"Deseeded — waiting on registry rows" | Work known and wanted, **no ID** | 4, one of them stale |
| `.ai/registry/decisions/` | Work **decided**, no ID, no row | ADR-007 |

**The stale row is the argument in miniature.** That table listed *"User self-release | REG | waiting
on a row in the REG table"* after `REG-01` had been seeded — the row existed and the file that
tracked its absence never learned. Nothing detects that, because nothing reads that table.

**The failure this produced is not hypothetical and is the reason this ADR exists.** The operator read
`features.md`, saw no authentication feature anywhere, and asked why. The answer took four paragraphs:
the provider swap is filed under `SYS` rather than `AUT`; the `AUT` sign-in row was issued and then
withdrawn on 2026-08-24 with its row deleted; and two more `AUT` items were deseeded in Phase C and
never issued. **Every one of those facts was recorded somewhere. None of them was recorded where
somebody looking for features would look.**

**What the file already had, and what it was missing.** `features.md` declared a Status enum of
`PLANNED`, `IN_PROGRESS`, `DONE`, `DEFERRED`. `DEFERRED` was declared and **used by no row, ever** —
verified by reading, not recalled. There was no way to record a proposal awaiting judgement, no way to
record something dropped as out-of-scope by a ticket, and no way to retire a row that had stopped
being true without deleting it.

## Decision

**`.ai/registry/features.md` is the single ledger for every feature the project knows about, issued or
not. There is no second file.**

1. **Six statuses, replacing four.**

   | Status | Means | ID |
   |---|---|---|
   | `TRIAGE` | Proposed — by an agent or from an idea — and **not yet verified by the operator** | empty |
   | `RECOMMEND` | Recorded as out-of-scope while building something else. Nobody has decided to build it | empty |
   | `PLANNED` | Verified and wanted. A ticket may be seeded against it | required |
   | `IN_PROGRESS` | A ticket exists and is in flight | required |
   | `DONE` | **Merged into `main`.** Not "gated" | required |
   | `OUTDATED` | No longer true or no longer wanted. Kept as a record, never deleted | either |

2. **`DEFERRED` is retired.** No row ever carried it. Anything that would have been `DEFERRED` is
   `TRIAGE` if it needs a decision, or `OUTDATED` if the decision was no.

3. **The `ID` column may be empty, and for two statuses it must be.** `TRIAGE` and `RECOMMEND` rows
   carry no ID. **This is the load-bearing clause of the whole decision** — see Rationale. An ID is
   what makes a feature citable: check D1 resolves it, Definition of Ready accepts it, and a story may
   be written against it. A proposal that has not been verified must not be any of those things, and
   the cheapest way to guarantee that is to give it nothing to cite.

4. **Two columns are added: `Status` moves to second position and `Description` is new.** The column
   order becomes `ID | Status | Title | Description | Group | Invariants touched | Notes`, matching
   the four fields the instruction named, in the order it named them. `Notes` keeps what it holds
   today — row history, corrections, the process trail — and `Description` carries what the feature
   *is*, in one or two sentences. They had been the same column, which is why neither could be read.

5. **An `OUTDATED` row's ID stops resolving.** Check D1 already fails on an ID absent from this file;
   it now also fails on an ID present but `OUTDATED`. Without this, retiring a feature would leave
   every citation of it passing, and Definition of Ready would accept a ticket against a feature the
   project has abandoned.

6. **Anyone may add a `TRIAGE` or `RECOMMEND` row. Only the operator promotes one.** Promotion means
   giving it an ID and a status of `PLANNED`, and it happens by merging the pull request that does so
   — the MD-24 position, already settled on 2026-08-26: *"A human decides the row; an agent may type
   it."* This ADR does not reopen it.

7. **`.ai/board/backlog.md`'s "Deseeded — waiting on registry rows" table is absorbed and removed.**
   Its four rows become `TRIAGE` rows here. A board-plane table tracking the absence of a registry row
   is a second source of truth about the registry, and it had already drifted.

8. **Check D14 enforces the shape.** Status is one of the six; `TRIAGE` and `RECOMMEND` have no ID;
   `PLANNED`, `IN_PROGRESS` and `DONE` have one; an ID matches its group section; no ID appears twice.

## Rationale

**Why one file rather than a new one, which is what the instruction literally asked for.** The
instruction asked for *a file* holding everything. A new file would have delivered the words and not
the thing: `features.md` cannot be deleted — Definition of Ready, check D1, RULE-17 and every story
ever written cite it — so a second file would have made **four** places instead of three. The defect
being repaired is fragmentation, and the only repair that removes fragmentation is a merge. Stated
here rather than done quietly, because it is a departure from the literal ask.

**Why an unverified proposal must not have an ID, at length, because it is the clause that can be got
wrong later by someone being helpful.** The system's protection against invented requirements is that
an agent may not invent a feature ID: check D1 fails on an ID that does not resolve, and Definition of
Ready refuses a ticket whose `feature_ids` do not all exist. Both of those are *resolution* checks —
they ask whether a row exists, not whether anyone agreed with it. **The moment a `TRIAGE` row has an
ID, an agent can write a story against an AI's own proposal and every check will pass.** The empty ID
is not a formatting convention; it is the enforcement, and it is why clause 3 and clause 8 exist
together rather than clause 3 alone.

**Why `RECOMMEND` is separate from `TRIAGE` when both are "not decided yet".** Their provenance
differs and provenance is what the operator will use to judge them. A `TRIAGE` row is something an
agent thought of. A `RECOMMEND` row is something a ticket **hit** — it was in the way, it was written
down as out-of-scope, and a person doing real work decided not to do it right then. The second carries
evidence the first does not, and collapsing them would throw that away. `RECOMMEND` rows name the
ticket that raised them, in `Notes`, for exactly this reason.

**Why `OUTDATED` rather than deleting the row.** The `AUT` sign-in row was deleted when the operator
withdrew it on 2026-08-24 (commit `1148108`), and the effect was that the feature became invisible
rather than visibly withdrawn. Two days later the operator asked why there was no authentication
feature. A deletion removes the answer along with the row.

**The alternative that was rejected: a status column plus a separate `proposals.md` for `TRIAGE` and
`RECOMMEND`.** It has one real merit — proposals could be appended on the board plane without a
CODEOWNERS review, which is less friction for an agent recording an out-of-scope item mid-ticket.
Rejected because the friction is the feature. The operator asked for proposals *they* verify; a
proposal that lands without review is not one they have verified, and the review at merge is the
verification. It also reintroduces the exact split this ADR closes.

## Consequences

**Easier.**

- One place answers *what does this project intend to build*, at every stage of certainty.
- Nothing dropped as out-of-scope disappears. The eight rows this change adds were all recoverable
  from files, and every one of them had been invisible to anyone reading the registry.
- Withdrawing a feature stops erasing it.
- `Description` becomes readable, because it stopped competing with row history for the same cell.

**Harder, and these are real.**

- **The file gets long, and long files get skimmed.** Twelve rows becomes forty as `RECOMMEND` items
  accumulate — every ticket's out-of-scope list is a source. There is no pruning mechanism in this
  decision beyond `OUTDATED`, and it is the operator who has to apply it.
- **`IN_PROGRESS` still has no writer, and this ADR does not give it one.** `Status` is written by
  `orchestrator` at `/ship` step 3 — the end of the loop. Nothing writes `IN_PROGRESS` when a ticket
  starts, so a feature under construction reads `PLANNED` until it ships. **`GRP-01` is in that state
  right now**: its `ticket.yaml` on `feat/GRP-01` says `IN_PROGRESS` and the registry says `PLANNED`.
  Recorded as **MD-41** with a fix shape, and set by hand here, which is not a mechanism.
- **A `RECOMMEND` row is a judgement about what an out-of-scope item *means*.** A story's out-of-scope
  list says "not in this ticket"; a `RECOMMEND` row says "worth building sometime". Those are not the
  same claim, and turning one into the other is exactly the kind of inference that becomes an invented
  requirement if done carelessly. The eight rows added with this ADR each cite the ticket and item
  they came from so the inference can be checked.
- **Seven columns is wide.** Accepted rather than solved; the alternative was leaving `Description`
  and `Notes` fused, which is the thing being fixed.

## Revert condition

**If a story is ever written against a feature that the operator did not promote, this decision has
failed and clause 3 is the thing to check first.** The observable signal is a `ticket.yaml` whose
`feature_ids` resolve to a row that was `TRIAGE` or `RECOMMEND` at the time the ticket was seeded.
D14 makes the precondition checkable — no ID on those rows — but the audit cannot see back in time,
so this one is caught by reading the ledger's git history at the point of the complaint.

**If `RECOMMEND` rows outnumber every other status by more than four to one**, the ledger has become
a wishlist rather than a register, and the pruning gap under Consequences has stopped being
theoretical. At that point either the operator prunes on a cadence, or `RECOMMEND` moves to the board
plane and this ADR's rejected alternative is reconsidered on its merits.

## Affected documents

| File | Change | doc_version |
|---|---|---|
| `.ai/registry/features.md` | The whole of it: six statuses, empty IDs, two new columns, eight new rows | 7 → 8 ✅ done |
| `.ai/board/backlog.md` | §"Deseeded" absorbed and removed, with a pointer to the ledger | 1 → 2 ✅ done |
| `scripts/check-docs.mjs` | D14 added; D1 extended to reject an `OUTDATED` citation | — ✅ done |
| `scripts/tests/check-docs.test.mjs` | D14 and the D1 extension | — ✅ done |
| `.ai/board/model-debt.md` | MD-41 — `IN_PROGRESS` has no writer | — ✅ done |
| `.claude/commands/docs-audit.md` | D14 in the check list | — ✅ done |
| `.ai/01-operating-model.md` | The BACKLOG row's gate wording, which says feature IDs must exist | — |
