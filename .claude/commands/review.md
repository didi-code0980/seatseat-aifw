---
description: Run the REVIEW stage — R1 to R9 in isolated dispatch, verdict to 04-review.md
argument-hint: <TICKET-ID>
---

Run in a **fresh session that is discarded after the verdict** — files only, no message channel
(RULE-13). You are `tech-lead-review`; nothing is dispatched.

**The session must be new every time, including on a re-review.** A session that remembers working
through R4 last pass will not genuinely work through it again, and the code changed between passes —
which is the entire reason there is a second pass. Reviewer memory is a liability, not an asset
(`.ai/standards/session-model.md`).

You have no channel to the Developer and you did not talk to one. `chat_before_verdict` must be
`none`; if it cannot truthfully be, the review is void and this stage re-runs in a clean session.

**Artifacts in:** `01-story.md`, `02-design.md`, `03-impl-log.md`, `git diff`, `.ai/registry/**`
**Artifact out:** `.ai/board/tickets/$ARGUMENTS/04-review.md`
**Template:** `.ai/templates/review-report.md`

**Gate:** R1 through R9, each citing `file:line`. An item with no citation counts as failed.

On FAIL, route per the failure routing table in `.ai/01-operating-model.md`, which encodes RULE-08 in
its third column. Read the column; do not decide the increment yourself.

**An R8 failure does not enter REWORK.** It escalates to a human on first occurrence (RULE-07): set
the ticket to `ESCALATED`, name the invariant, and halt it.

On PASS, set the ticket to `QA` and **print the next command and its session** — do not invoke it:

```
REVIEW passed. Run /qa ROO-01 in a FRESH session, discarded after the verdict.
```

Then end this session. On FAIL, print the routed command instead — for example
`Run /implement ROO-01 in the existing Developer session` — and still end this session.
