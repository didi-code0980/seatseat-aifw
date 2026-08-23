---
doc_version: 1
last_updated: 2026-08-12
governed_by: [RULE-01, RULE-10]
---

# Model defects

Defects in the operating model itself — gaps, contradictions, and rules that cannot be followed as
written. Not domain bugs, which are `BUG-nnn` tickets, and not feature work.

**Why this file exists.** These were being recorded in the margins of whatever ticket happened to
surface them: a comment in a `ticket.yaml`, a note in a `metrics.md` row, an unanswered block in a
`99-questions.md`. Each was true where it sat and invisible everywhere else, and a defect in the
model outlives by many tickets the one that found it.

**Plane.** This file is in the board plane and agents may write it. The fixes it describes are
almost always in the registry or standards planes, which are human-only under RULE-01 — so an entry
here is a report, never a change. Nothing is resolved by editing this file.

**Not a backlog.** There is no ordering and no priority column. A human decides what gets fixed and
when, the same way `backlog.md` works.

## Open

| ID | Defect | Surfaced by | Where it should be fixed |
|----|--------|-------------|--------------------------|
| MD-1 | **No `/resume` command.** The model defines `ESCALATED` as human-resolved but never says how a human resolves it. There is no command, no artifact, and no gate for the return trip. ROO-01 came back from `ESCALATED` on prose instructions given to the orchestrator in conversation — which worked, and left the reasoning in a chat transcript rather than in a file until it was copied into `ticket.yaml` by hand. | ROO-01, 2026-08-12. Operator's note: the gap is real and gets a command after this ticket closes. | A new command file under `.claude/commands/`, plus the `ESCALATED` row of the stage ownership table in `.ai/01-operating-model.md`. |
| MD-2 | **`tech-lead-design->ba` is missing from `chat_budget`.** The chat topology in `.ai/01-operating-model.md` lists the edge as allowed in both directions. `.ai/templates/ticket.yaml` seeds four pairs and omits this one and `ba->product`, and its own comment says pairs absent from the map are not chattable. The two documents disagree. The omission is silent rather than enforced: `.claude/hooks/chat-guard.mjs` does not block a write addressed to `ba`, because `ba` is not a judge, so with no matching budget line the RULE-15 count is simply skipped. ROO-01's Q1 to Q3 went through unbudgeted and uncounted. | ROO-01, Q5 in `99-questions.md`, raised by `tech-lead-design` 2026-08-12. | Either `.ai/templates/ticket.yaml` gains the two pairs, or its comment is amended to say the map is not the topology. Whichever is chosen, `chat-guard.mjs` should fail loudly on a pair it has no budget for rather than skipping the count. |

## Resolved

Kept rather than deleted: a defect that was fixed once is the cheapest evidence that a similar
proposal has been tried.

| ID | Defect | Resolved | How |
|----|--------|----------|-----|
| MD-3 | **The Definition of Ready gate sat ahead of its own inputs.** Two placements in a row required fields that no reachable stage produced — first `size` (set at DESIGN), then `size_estimate` (set at SPEC), while the gate itself sat before SPEC. Any ticket reaching the gate deadlocked. | 2026-08-12 | The gate moved to the SPEC→READY transition, `size` split into `size_estimate` (BA, at SPEC) and `size` (Tech Lead, at DESIGN), and check **D13** added to `scripts/check-docs.mjs` — it fails the audit if any DoR item names a producing stage later than the gate, so a fourth attempt fails loudly instead of silently. |
| MD-4 | **The XL sizing row caught every feature ticket.** It first read "any size, if it touches the schema or the seam", under which every ticket adding a `src/lib/data/` function escalated. The correction read "changes `types.ts`", under which every ticket adding a DTO escalated. A row that catches everything constrains nothing. | 2026-08-12 | Human decision on ROO-01's Q4: the test is whether **existing callers must change**. Adding a function or a type is ordinary feature work; a migration, a changed signature, or a reshaped type is XL. Recorded in full under Q4 in `.ai/board/tickets/ROO-01/99-questions.md`. |
