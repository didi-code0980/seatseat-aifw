---
description: Report the next actionable ticket without starting it
---

Run in the **orchestrator session — the lead session**, in report-only mode. The orchestrator is not
a subagent and does not invoke a stage owner; see `.ai/standards/session-model.md`.

**Input:** every `.ai/board/tickets/*/ticket.yaml`, plus `.ai/board/backlog.md`
**Output:** a report to the operator. **No file is written and nothing is invoked.**

## Where the gate sits

`BACKLOG -> SPEC -> [DoR] -> READY -> DESIGN`

**SPEC runs directly out of BACKLOG. DoR is evaluated at the SPEC to READY transition, not before
SPEC.** Two of its six items — `invariants_touched` and `size_estimate` — are produced by the BA at
SPEC, so a gate ahead of SPEC would be asking for fields that do not exist yet. A ticket at BACKLOG
is therefore *not* required to pass DoR to be dispatched; it is required to pass DoR to leave SPEC.

This is the third placement of this gate. The first two put it ahead of its own inputs; check D13
exists so a fourth attempt fails loudly instead of deadlocking the board.

## Report

**Read every `.ai/board/tickets/*/ticket.yaml` first.** `backlog.md` is a cross-check, never the
source: `/ship` is its only writer, so it lags by a whole ticket by design. Reading it first is how
this command used to miss the only actionable ticket on the board — MD-31.

1. **Anything `ESCALATED`**, first and before everything. These halt the loop and have no command.
2. **The design lane's next move.** Whichever comes first: a ticket whose SPEC has passed and whose
   DoR passes — ready to `/design`; or the highest-ordered ticket at `BACKLOG` — ready to `/spec`.
3. **The implement lane's next move**, which is only ever one of two answers: the ticket whose design
   hand-off is pushed and whose predecessor has **merged**, or *nothing — waiting on <ID> to merge*.
4. For a ticket at **SPEC or later**, its full Definition of Ready, item by item, naming the
   producing stage of anything that fails.
5. For a ticket at **BACKLOG**, only items 1, 3, 4 and 6 — the ones produced at BACKLOG. Do not report
   2 and 5 as failures: the BA has not run, and reporting an unwritten field as a defect trains the
   reader to ignore this section.
6. **Lane occupancy, not a WIP number.** One ticket per lane; the implement lane takes the next only
   when the previous has merged. Do not report *WIP against the limit* — the limit is 1 and the
   parallel condition behind it cannot be satisfied (MD-11), so two features in flight across two
   lanes is correct by design and reporting it as an overrun is noise.
7. Any disagreement between `backlog.md` and a `ticket.yaml`, naming `ticket.yaml` as authoritative.
   Do not repair it here; that is the orchestrator's, in `/ship`.

Do not demote a ticket here, and do not promote one. **This command writes nothing.**

## READY is evaluated and never stamped, and that is now said out loud

There is no writer for the `SPEC -> READY` transition and there never was. This command evaluates DoR
and reports it; `spec.md` forbids the BA to set it; `session-model.md` claimed this command performed
it and was wrong. Three documents, no writer — MD-30.

**The resolution is to stop pretending it happens.** A ticket that passes DoR is *reported* READY and
goes straight to `/design`; the DESIGN gate's timestamp in `ticket.yaml` is the proof it was ready,
because DESIGN cannot have run otherwise. That is what has already happened for every ticket to date —
DEV-01's `metrics.md` row records it in those words. `READY` stays in the state enum as the name of a
condition, not of a stored value.

## Finish

Name the ticket, the command, **and the folder** — three worktrees make a correct command in the wrong
folder a silent write to the wrong branch.

```
GRP-01 is at BACKLOG and its BACKLOG-produced DoR items pass.
Run /spec GRP-01 in the aiw-design folder.

Implement lane: nothing — SEA-01 has not merged.
```

If nothing is runnable, say what is blocking instead, and say which of the two lanes is blocked —
they block for different reasons and usually not at the same time. Never invoke the stage owner: a
printed instruction the operator runs is a real session boundary, and that boundary is what RULE-13
relies on.

Definition of Ready is in `.ai/01-operating-model.md`. Session lifetimes are in
`.ai/standards/session-model.md`.

---

## Last step: sign off

**End your reply with the block in `## Replying` (`CLAUDE.md`).** It is not a footer on the reply —
for most runs it *is* the reply. Do not stop at the step above and leave the operator to work out who
answered, whether it passed, where the repository is, and what runs next.

This command writes no artifact and passes no gate, so the first line ends `gate n/a`. *Tiếp theo* names
whatever the board says runs next, **with its folder** — not a topic, a command.
Read the two values rather than recalling them:

```
date '+%Y-%m-%d %H:%M %Z'
git branch --show-current
```

A remembered timestamp or branch is the one part of this block that can be wrong while looking right.
