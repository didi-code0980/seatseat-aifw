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
