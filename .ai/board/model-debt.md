---
doc_version: 1
last_updated: 2026-08-12
governed_by: [RULE-01]
---

# Model debt

Defects in the operating model itself, found while running it. Not ticket work — these are
gaps in the rules, the commands, or the guards.

Recorded here rather than fixed on discovery: patching the model mid-run makes it impossible
to tell whether a ticket succeeded because of the design or because of the patch.

Reviewed after each ticket closes.

| ID | Found | Defect | Severity | Fix shape |
|----|-------|--------|----------|-----------|
| MD-01 | ROO-01, DESIGN | ESCALATED has no exit command. The model says a human resolves it but not how. Resolved in prose. | Blocks the loop | `/resume <ID>` |
| MD-02 | ROO-01, DESIGN | D5 cannot distinguish a route (`/rooms`) from a slash command. Scoping removed the agent-facing false positives; the ambiguity remains for human-owned docs. | Cosmetic | Convention or allow-list — a decision, not an implementation |
| MD-03 | Bootstrap, Block 2 | Sessions carry no role identity. `agent_type` is absent, so `chat-guard` blocks every write addressed to a judging role rather than only the forbidden pairs. Sound, but broader than the rule. | Latent | Unknown — see below |
| MD-04 | ROO-01, DESIGN | `chat_budget` has no `tech-lead-design->ba` pair, though the topology permits that edge. | Gap | One line in the template |
| MD-05 | Steward setup | `01-operating-model.md:18` declares `.ai/standards/` to be registry plane; `guard-registry.mjs:86` blocks only `.ai/registry/**`. Agents have written standards freely all run. Either the document or the guard is wrong. | Real | A decision: tighten the guard, or correct the document |
| MD-06 | Steward setup | The registry is writable by one agent — **in intent only**. The intended control was a printed diff plus operator confirmation, which is weaker than a paste because a prompt shows a path, not content. The exemption was not implementable (see MD-03), so the steward pastes like everyone else and this risk is not yet live. | Accepted risk, not yet incurred | If MD-03 is ever fixed and the exemption lands, watch for confirmation fatigue; revert to print-for-paste if a registry change is approved that the operator had not read |

## Notes

**MD-01** is the only one that blocked work. Everything else was noticed, not hit.

**MD-03** is the one to be careful with. Three fixes are possible and they cost very different
amounts: an environment variable set when the session opens (certain, but requires opening
sessions from a terminal rather than editor tabs); a `.active-role` pointer written by each
stage command (cheap, works with editor tabs, correct only while WIP is 1); or leaving the
guard broad, which is what happens now. The right choice depends on whether mis-typed tabs
actually occur. Nobody knows yet.

**MD-03 now blocks something concrete.** It stopped being purely latent when the steward was created:
the registry exemption needs to be scoped to one agent, scoping needs role identity, and there is
none. `guard-registry.mjs` was left untouched rather than exempting every agent to reach one. That is
the whole of MD-06's "not yet incurred".

**MD-05 was verified, not assumed**, against `01-operating-model.md:18` and `guard-registry.mjs:86`.
Worth stating because it is the kind of claim that reads as obviously true and is cheap to check.

**A second register exists.** `.ai/board/model-defects.md` records overlapping defects under a
different numbering — `MD-1` is this file's `MD-01`, `MD-2` is `MD-04` — and additionally holds two
*resolved* entries with history absent here: the circular Definition of Ready, and the XL sizing row
that caught every ticket. Merging the two is an open decision for the operator. Until it is made,
**this file is the register of record** and `model-defects.md` is not being updated. Two registers
disagreeing is itself model debt; it is not listed as an MD item because recording it in one of the
two files would be the same mistake again.

## Review log

| Date | Ticket | Items closed | Items added |
|------|--------|--------------|-------------|
