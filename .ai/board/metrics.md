---
doc_version: 1
last_updated: 2026-08-10
governed_by: [RULE-06, RULE-07, RULE-08, RULE-11, RULE-15]
---

# Metrics

Appended by `orchestrator` on every state transition. One row per transition, never edited in place —
a corrected row is a new row with a note, because the history of how a ticket moved is the evidence
for whether the loop works.

## Row schema

`| ts | ticket | from | to | agent | rework_count | tokens | wall_clock_s | notes |`

| ts | ticket | from | to | agent | rework_count | tokens | wall_clock_s | notes |
|----|--------|------|----|-------|--------------|--------|--------------|-------|
| 2026-08-12T04:59:46Z | ROO-01 | BACKLOG | SPEC | ba | 0 | — | — | SPEC gate PASS. 11 ACs, `invariants_touched: []` with per-ID reasoning, `size_estimate: M`. Left at SPEC; DoR is the orchestrator's to evaluate. |
| 2026-08-12T15:41:00Z | ROO-01 | ESCALATED | ESCALATED | ba | 0 | — | — | Not a transition — story amendment under RULE-14, logged because five `consulted` entries resolved to amendments and the amendment rate reads this column. Resolved B2, B3 and the INV-11 inversion; AC-8..AC-11 withdrawn by operator scope cut. `invariants_touched` corrected `[]` -> 7 IDs. `size_estimate` held at M. State untouched: Q4, Q5, `schema_delta` and `requires_adr` are human items. |
| 2026-08-12T16:19:31Z | ROO-01 | ESCALATED | SPEC | orchestrator | 0 | — | — | Human decision, given in prose — there is no `/resume` command, and the model defines ESCALATED as human-resolved without saying how. B1 resolved by scope cut (AC-8..AC-11 withdrawn to AUT), B2 and B3 by the `ba` amendment, Q4 by correcting the Sizing table's "touches the seam" wording, H-1..H-3 by fixing `features.md` and `invariants.md`. `schema_delta` returned to `none` and `requires_adr` to `false`: both decisions in design section 4 fell away with the cut and with Q1(a). `rework_count` unchanged — an escalation resolved upstream is not Developer rework (RULE-08). DoR then evaluated: all six items pass. Q5 remains open and gates nothing. |
| 2026-08-12T16:23:48Z | ROO-01 | SPEC | READY | orchestrator | 0 | — | — | DoR PASS on all six items — `feature_ids` resolve, `invariants_touched` is seven IDs, `depends_on` empty, `schema_delta: none`, `size_estimate: M`, one feature group. First ticket to reach READY. Q4 transcribed into `99-questions.md` as a human decision; Q5 deferred to `model-defects.md` unanswered. Carried into DESIGN: the NetworkPort cascade is unspecified in the story, to be asked of `ba`, not decided at DESIGN. |
| 2026-08-12T16:30:41Z | ROO-01 | READY | DESIGN | tech-lead-design | 0 | — | — | DESIGN gate PASS. Seven sections complete, `allowed_paths` enumerated at twelve entries, `size: M` by the Q4 rule — 12 files and no existing caller changes. Q6 and Q7 opened with `ba`: the NetworkPort cascade carried in from READY, and AC-6's three-seat room, which no fixture room is. Neither blocks `/implement`; both block `/qa`. Appended late by the orchestrator — see the note below. |
| 2026-08-12T16:45:54Z | ROO-01 | DESIGN | IN_PROGRESS | developer | 0 | — | — | IN_PROGRESS gate PASS. Ten files under `src/**`, all inside `allowed_paths`; `tests/**` untouched and left to QA. typecheck, lint and test exit 0, plus `pnpm build`. Two naming deviations declared, neither touching a signature or a selector. Five open questions logged, the first being that `mock/layout.ts` still reads `fixtures.ts` and so does not observe the INV-11 cascade — raised rather than fixed, because the file is outside `allowed_paths`. Appended late by the orchestrator. |
| 2026-08-12T16:56:20Z | ROO-01 | IN_PROGRESS | REVIEW | tech-lead-review | 0 | — | — | REVIEW gate **FAIL**, on R8 alone. Eight of nine pass with citation. INV-11: after `deleteRoom`, `layout.getRoomLayout(deletedRoomId)` still returns the room and its six deleted seats, because `mock/layout.ts:1` reads `../fixtures` while the delete writes `mock/store.ts`. Verified by execution. The divergence is introduced by this ticket. `chat_before_verdict: none`, isolated dispatch. Appended late by the orchestrator. |
| 2026-08-12T16:56:20Z | ROO-01 | REVIEW | ESCALATED | orchestrator | 0 | — | — | R8 escalates to a human on first occurrence and never enters REWORK (RULE-07), so `rework_count` stays 0 — the Developer raised this defect correctly rather than editing outside `allowed_paths`, and charging it to the Developer would be exactly the RULE-08 error. Ticket halted; it does not self-resume. Q6 and Q7 remain open with `ba` and still block `/qa`. |
| 2026-08-21T09:41:00Z | ROO-01 | QA | QA | ba | 0 | — | — | Not a transition — second story amendment under RULE-14, answering Q6, Q7, Q8 and Q9 in 99-questions.md. AC-6 and AC-14 Givens corrected: both named fixture states QA could neither observe (RULE-05) nor construct (out-of-scope items 1 and 7). No AC added or removed, no number reused, `invariants_touched` and `size_estimate` unchanged. Q10 and Q11 are `tech-lead-design`'s and still block /qa. |
| 2026-08-21T10:12:00Z | ROO-01 | QA | QA | ba | 0 | — | — | Not a transition — third story amendment under RULE-14, answering Q12. AC-14's control clause asserted `dev-04` is primary; it is `SECONDARY`, and no seeded device is both primary and outside `ROOM-A`, so the clause was unsatisfiable. Defect introduced by the previous `ba` amendment, found by `qa` by execution. Clause now asserts unchanged-in-every-respect with no field named. No AC added or removed; `invariants_touched` and `size_estimate` unchanged. |
| 2026-08-23T05:29:36Z | ROO-01 | QA | DONE | orchestrator | 0 | — | — | **DONE, not shipped.** All four gates `passed: true`. Re-verified by execution at ship time, not taken from a summary: `pnpm verify` exit 0 (typecheck, lint, 45 unit tests, build) and `pnpm test:e2e` exit 0 (24 tests, including AC-6's INV-11 cascade). Definition of Done holds on five of six items; the `allowed_paths` subset check fails on 27 files of model, registry and steward work carried in the same working tree, none of it written by a ROO-01 agent. `/ship` step 4 did not run: `gh` is not installed, `feat/ROO-01` has zero commits and no upstream, and RULE-09 makes committing human-only — so no PR exists and the ARCHIVE row's PR column is empty. `rework_count` finishes at 0: the two failures this ticket took, R8/INV-11 at REVIEW and Q12 at QA, both routed upstream under RULE-07 and RULE-08 and neither was Developer rework. |
| 2026-08-23T06:53:48Z | DEV-01 | BACKLOG | SPEC | ba | 0 | — | — | SPEC gate PASS. 14 ACs in Given/When/Then, eight of them refusals; `invariants_touched: [INV-04, INV-05, INV-06, INV-07]` confirmed rather than changed, with per-ID reasoning for the four engaged and the six reasoned and found not engaged; Out-of-scope has eleven items; `size_estimate: M`. Two questions raised for DESIGN and neither blocks — Q-1, a device's required field set, which no registry or standards document names (RULE-05, the `ROO-01` finding-B2 channel); Q-2, whether the seat picker is room-scoped, which moves `size`. Left at SPEC; DoR is the orchestrator's to evaluate. |
| 2026-08-23T07:09:56Z | DEV-01 | SPEC | SPEC | ba | 0 | — | — | Not a transition — `/spec DEV-01` re-run in the `ba` session against a ticket whose SPEC gate had already passed. The model defines no re-run of a passed stage, so the stage was run as a re-derivation from `.ai/registry/**` and the existing `01-story.md` judged against it rather than overwritten (working agreement: additive only). Every registry citation in the story verified against source — the seed composition and the `no field names` prohibition at `.ai/standards/data-model.md:122-124` and `:28-29`, the two role scopes at `.ai/standards/rbac-and-security.md:17-18,39`, the partial unique index at `:92-93`, and `ROO-01` AC-14. One defect found and amended under RULE-14: the INV-06 bullet cited `out-of-scope item 8`, which is *Devices on any other surface*; the correct items are 2 and 7. All four gate items re-checked and hold — 14 ACs in Given/When/Then with IDs, `invariants_touched: [INV-04, INV-05, INV-06, INV-07]` covering all ten ledger invariants between engaged and reasoned-not-engaged, Out-of-scope at eleven items, `size_estimate: M`. `gates.spec` left at its original `2026-08-23T06:53:48Z`: the gate was not re-passed, it was confirmed. State left at `SPEC`; DoR remains the orchestrator's. |
| 2026-08-23T08:56:30Z | MEM-01 | BACKLOG | SPEC | ba | 0 | — | — | SPEC gate **BLOCKED** on Q-1 — deleting a Member who occupies a seat or owns a device is unspecified, and nothing in `.ai/registry/**` answers it. The two nearest precedents point opposite ways: INV-11 cascades a room delete destructively behind a confirmation, `ADR-003` refuses to cascade a `user` delete to its `Member` (`onDelete: SetNull`) precisely so a departed person's occupancy history survives. Neither governs `Member -> occupancy` or `Member -> device`, and no INV was ever issued for members. Story is otherwise complete: AC-1 to AC-9 are live and none depends on the answer — AC-9 in particular is identical under both branches, because deleting a member nothing refers to has nothing to refuse and nothing to cascade to. AC-10 and AC-11 are reserved placeholders per CLAUDE.md *No invention*, so answering Q-1 amends this story under RULE-14 rather than renumbering it. Out-of-scope has eleven items; `size_estimate: M`, and that estimate survives either answer — Q-1 moves scheduling and `allowed_paths`, not story size. `invariants_touched` written `[INV-01, INV-05, INV-06, INV-08]`: **extended, not narrowed as `ticket.yaml` anticipated**. INV-08 added because MEM-01 is the surface people enter the system on and AC-4 had to be chosen to keep the create form from becoming an account-creation route — the invariants ledger's own warning is that choosing the safe behaviour and then declaring the invariant unengaged is circular. The three transcribed IDs kept because narrowing them is what Q-1 decides. Two consequences for a human: `.ai/registry/features.md` still records MEM-01 as `INV-01, INV-05, INV-06` and omits INV-08 (RULE-01, not corrected here), and adopting the story's recommendation — **refuse** — wants a new invariant whose ledger row is drafted verbatim in Q-1 with its ID left unwritten, because check D2 correctly refuses a document that cites an invariant ID the ledger does not yet hold. State left at `SPEC`; routing to `ESCALATED` is the orchestrator's. No next command printed. |
| 2026-08-23T07:19:53Z | DEV-01 | SPEC | READY | orchestrator | 0 | — | — | DoR PASS on all six items. Stamped at the DESIGN gate because the READY transition itself was never timestamped — `/next-ticket` evaluated DoR and reported it, but that command writes nothing, so the earliest recorded proof that DEV-01 was READY is DESIGN having run. Appended late. |
| 2026-08-23T07:19:53Z | DEV-01 | READY | DESIGN | tech-lead-design | 0 | — | — | DESIGN gate PASS. Seven sections, `allowed_paths` at eleven entries, `size` set, `schema_delta` stays `none`. Five findings F-1 to F-5 raised against `01-story.md`, none blocking; all five must be amended by `ba` before /qa. Appended late. |
| 2026-08-23T07:42:00Z | DEV-01 | DESIGN | IN_PROGRESS | developer | 0 | — | — | IN_PROGRESS gate PASS. Seven files, each logged with a reason and a contract item. typecheck and lint exit 0; test and build also run though neither is the gate. Two declared deviations, both scaffold files the design called new. `tests/e2e/smoke.spec.ts` knowingly left broken for QA per design section 5. Appended late. |
| 2026-08-23T07:50:28Z | DEV-01 | IN_PROGRESS | REVIEW | tech-lead-review | 0 | — | — | REVIEW gate PASS. R1-R9 all pass with `file:line`. No finding, so nothing routes and `rework_count` stays 0. R8 reasoned INV-04, INV-05, INV-06 and INV-07 individually against every `.rank`/`.seatId` write rather than against the implementation's account of them. R1 was verified path-by-path because `guard-allowed-paths.mjs` is unwired (MD-10) and `check-allowed-paths.mjs` skips off a `feat/` branch (MD-09). Appended late. |
| 2026-08-23T08:06:50Z | DEV-01 | REVIEW | QA | qa | 0 | — | — | QA gate PASS. 14 ACs, 26 tests, every name carrying its AC ID; `pnpm test` 61 passed, `pnpm test:e2e` 38 passed, e2e run twice from a cold build because a suite mutating a shared store can pass once on leftover state. All four invariant IDs probed, none violated. `smoke.spec.ts` repaired without reading `fixtures.ts` (RULE-05). F-1 carries past the gate: the seam refuses a duplicate asset tag with no criterion naming it, so a real refusal ships untested — routed to `ba` under RULE-08, `rework_count` untouched. Appended late. |
| 2026-08-23T08:35:53Z | DEV-01 | QA | DONE | orchestrator | 0 | — | — | Re-verified by execution at ship time: `pnpm verify` exit 0 (61 unit tests, build) and `pnpm test:e2e` exit 0 (38 tests). Second ticket through the loop, and the first with `rework_count: 0` and no escalation — the ROO-01 pattern transferred. One thing follows it out: F-1 is still open with `ba`. |
| 2026-08-23T09:19:29Z | MEM-01 | SPEC | SPEC | ba | 0 | — | — | Not a transition — the SPEC gate that row 32 recorded as **BLOCKED** on Q-1 passing, once the human answer arrived. Deleting a Member who occupies a seat or owns a device **refuses**; ADR-005 records the decision and issues INV-12, and the story's AC-10 and AC-11 stop being reserved placeholders. `invariants_touched` settles at `[INV-08, INV-12]` — INV-01, INV-05 and INV-06 fall away exactly as the ticket's seeding comment predicted they would under a refusal, because nothing cascades. `size_estimate: M` survives the answer. Appended at ship time under the one-writer rule. |
| 2026-08-24T05:36:58Z | MEM-01 | READY | DESIGN | tech-lead-design | 0 | — | — | DESIGN gate PASS, and the timestamp is design **version 4**, not version 1 — this one row stands for four versions of `02-design.md`, because the gate carries the pass time and the intervening versions were not recorded when they happened. Twelve `allowed_paths` and `size: M`. Version 2 answered F-6 by adding `revalidatePath` and pulled `tests/e2e/devices.spec.ts` into the list; version 4 answered F-9 by accepting `export const dynamic = "force-dynamic"` on `src/app/(app)/layout.tsx`, an alternative version 3 had rejected. `schema_delta` stays `none`. |
| 2026-08-24T08:40:28Z | MEM-01 | DESIGN | IN_PROGRESS | developer | 0 | — | — | IN_PROGRESS, and this row also stands for more than one visit — the timestamp is `03-impl-log.md`'s `produced_at` at its last, which is the F-9 rework. Nine files under `src/**` plus the one-line `layout.tsx` change, every one inside `allowed_paths`, each logged with a reason and the design section it implements. `tests/**` left to QA except `tests/e2e/devices.spec.ts:373`, which QA itself had written. |
| 2026-08-24T08:53:00Z | MEM-01 | IN_PROGRESS | REVIEW | tech-lead-review | 0 | — | — | REVIEW gate PASS at pass 4, the re-review of design version 4. R1-R9 all pass with `file:line`, no finding, no routing row. R1 read the full changed set against `allowed_paths`; R8 was re-run **by execution** rather than by reading, four cases each asserting its own non-vacuity, and INV-08 and INV-12 both hold. Passes 1 to 3 are kept unedited in `04-review.md`; pass 3 attested to code that version 4 then changed, which is why there is a pass 4. |
| 2026-08-24T08:59:18Z | MEM-01 | REVIEW | QA | qa | 0 | — | — | QA gate PASS at pass 4, and the first pass where both halves hold. Mapping: 16 criteria to 34 named tests, zero unmapped. Commands: `pnpm test` 79 passed, `pnpm test:e2e` 54 passed across 4 workers on consecutive runs, zero failures and zero skips. Pass 3 had failed on the command half alone — `pnpm test:e2e` exiting 1 on six runs in twelve — and F-9 routed to `tech-lead-design` rather than to the Developer, which is why `rework_count` is still 0 after two rework cycles. |
| 2026-08-24T09:21:52Z | MEM-01 | QA | DONE | orchestrator | 0 | — | — | **DONE, not merged.** All four gates `passed: true`, and every Definition of Done item re-verified by execution at ship time rather than read from a summary: `pnpm verify` exit 0 (typecheck, lint, 79 unit tests, Turbopack production build), `pnpm test:e2e` exit 0 (54 tests), `check-allowed-paths` PASS over the whole branch — 20 changed files, all inside the list. The merge-ordering item `02-design.md` section 0 left for a human is discharged by the branch's own base, `022f06a`, which already carries the commit issuing INV-12; nothing was rebased. Pull request **not opened**: `gh` reports no logged-in host for the third ship running (MD-17), and a prefilled compare URL was handed to the operator instead. MEM-01 failed the QA gate twice — pass 1 and pass 3 — and still carries `rework_count: 0`, because RULE-08 charged both causes upstream to the design. |

**On the four DESIGN-through-ESCALATED rows above** — `16:30:41` to `16:56:20`. They were appended by the orchestrator at `2026-08-12T17:00Z`, after the
fact — the DESIGN, IN_PROGRESS and REVIEW stages ran without the orchestrator writing a row at each
transition, which is its job in the loop and did not happen. Every timestamp is sourced, not
reconstructed: `16:30:41` and `16:45:54` from the gate record in `ticket.yaml`, `16:56:20` from
`04-review.md`'s `produced_at`. No row here carries a time that was not already written down
somewhere. The `READY -> DESIGN` row is stamped at the gate's pass time rather than at dispatch,
matching the convention of the four rows above it, because dispatch time was never recorded.
**On the five MEM-01 rows above** — `09:19:29` on 2026-08-23 through `08:59:18` on 2026-08-24. They
were appended by `/ship` on 2026-08-24, after the fact, and that is the design rather than a lapse:
`.ai/standards/session-model.md` made `/ship` the **single writer** of this file on 2026-08-24, so a
ticket's transitions are recorded when it ships instead of when it moves. The cost is visible here —
each row carries the last timestamp of a stage that was entered more than once, and the intervening
versions are legible only in the artifacts.

**Two transitions are deliberately absent: `SPEC -> READY` and the dispatch into DESIGN.** No document
records a time for either. DoR was evaluated and passed — six items, all six pass, or DESIGN could not
have run — but nothing stamped it, and the READY row is transient by design. Following the precedent
set for ROO-01's DESIGN escalation four rows up: a row whose timestamp would have to be reconstructed
is left out and the gap is named, because inventing precision here is worse than an incomplete table.

## Targets

| Metric | Target |
|---|---|
| Tickets reaching DONE with no human intervention | at least 70% |
| Mean rework cycles per ticket | at most 1.0 |
| Defect escape rate (REWORKs originating at QA divided by total) | at most 30% |
| Clarifications per ticket | at most 3 |
| Amendment rate | at least 60%; revert below 40% |
| **Invariant violations** | **0 — hard pass/fail** |

## Reading these

**Invariant violations is not a target.** It is a condition. If it is greater than zero, the model is
not validated regardless of how good the other five numbers are. A loop that produces wrong data
quickly is worse than no loop, because the data outlives the experiment.

**Amendment rate** is the proportion of clarifications that resulted in an upstream artifact being
edited — `resulted_in_amendment: true` in a `consulted` block, divided by all `consulted` entries.

It carries a revert condition, not just a target. Below 40% over any ten consecutive tickets,
RULE-11 through RULE-16 are struck and the chat ban is reinstated. See
`.ai/registry/decisions/ADR-001-bounded-agent-chat.md`. Below 40% means clarifications are being
answered in conversation and left there, which is the signature of the design having moved out of the
artifacts and into transcripts.

**Defect escape rate** measures the REVIEW gate, not the Developer. A high rate means REVIEW is
passing work that QA then rejects, which is a reviewer problem.

**Clarifications per ticket** near the RULE-15 budget of six is a signal to look at the pair. A pair
that always exhausts its budget is not clarifying, it is negotiating, and negotiation between
constructing agents is how they converge on a shared wrong understanding.

**Mean rework cycles** counts only Developer-caused rework (RULE-08). Upstream defects routed to `ba`
or `tech-lead-design` do not appear here, which means this number can look good while the loop is
churning. Read it next to clarifications per ticket, not alone.

## Escalations

Logged separately, because an escalation is not a transition the loop recovers from.

| ts | ticket | trigger | invariant | resolution |
|----|--------|---------|-----------|------------|
| 2026-08-12T16:56:20Z | ROO-01 | REVIEW check R8 failed. After `deleteRoom`, the deleted room and its seats remain retrievable through the seam — `src/lib/data/mock/layout.ts:1` reads `../fixtures` while the delete writes `mock/store.ts`. Verified by execution, not by reading. `mock/requests.ts:1` shares the root cause and engages no invariant. | INV-11 | **Open.** Awaiting a human. Two decisions: whether a stale layout of a deleted room makes INV-11 false — a reading of `.ai/registry/invariants.md`, which is human-only under RULE-01 — and if so, whether the fix is a design amendment adding `mock/layout.ts` and `mock/requests.ts` to `allowed_paths`. Three import lines either way; no signature changes. |

**One row, two escalations.** ROO-01 also escalated at DESIGN on 2026-08-12 (blockers B1, B2, B3),
and that one is deliberately absent: it was identified only after it had been resolved, its trigger
and invariant would have had to be reconstructed, and the operator's instruction was that inventing
precision here is worse than an incomplete table. Its full record is in `ticket.yaml`'s header
comments, in `02-design.md`, and in the transitions table above. This note exists so the gap reads as
a decision rather than as an omission.
