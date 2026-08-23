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

**On the four DESIGN-through-ESCALATED rows above** — `16:30:41` to `16:56:20`. They were appended by the orchestrator at `2026-08-12T17:00Z`, after the
fact — the DESIGN, IN_PROGRESS and REVIEW stages ran without the orchestrator writing a row at each
transition, which is its job in the loop and did not happen. Every timestamp is sourced, not
reconstructed: `16:30:41` and `16:45:54` from the gate record in `ticket.yaml`, `16:56:20` from
`04-review.md`'s `produced_at`. No row here carries a time that was not already written down
somewhere. The `READY -> DESIGN` row is stamped at the gate's pass time rather than at dispatch,
matching the convention of the four rows above it, because dispatch time was never recorded.
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
