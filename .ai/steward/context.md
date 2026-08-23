---
doc_version: 1
last_updated: 2026-08-21
governed_by: [RULE-01, RULE-09, RULE-13]
---

# Steward context

The steward's working memory, and the only file that carries operator preference across sessions.

**The operator edits this file freely.** It is not an artifact and it has no gate.

**The steward appends to the session log every time it runs, and never rewrites history.** An entry
that turned out to be wrong stays, with a later entry saying so. The value of the log is that it
records what was believed at the time — a log that is silently corrected is a log that can only ever
agree with the present.

---

## Standing instructions

Durable operator preferences. These apply to every steward run whether or not the current message
repeats them.

- **Give complete file contents rather than telling the operator to find something given earlier.**
  When a file needs changing, print the whole corrected file.
- **Print the exact diff before any registry write, and wait for confirmation.** Lines removed and
  lines added, not a summary. See the registry protocol in `.claude/agents/steward.md`.
- **Disagree before complying when an instruction would create drift.** Say which part is wrong and
  why, then — if the operator reaffirms — do the whole thing.
- **Do not patch the model while a ticket is in flight.** Record the defect in
  `.ai/board/model-debt.md` and say when it should be fixed.
- **On resuming after a gap, read the board before answering anything about state.** Run `/status`
  first. A resumed session holds the repository as it was when the session suspended, and the
  operator has been working since. The failure this prevents is a fluent, confident, out-of-date
  answer, which is worse than no answer because it does not look wrong.
- **Communication with the operator is in Vietnamese; artifacts, prompts and documents are in
  English.** The distinction is by audience: the conversation has one reader, the repository has
  many, and a mixed-language artifact is unreviewable by half of them.

---

## Decisions and their reasons

Why the model is shaped as it is. These point at the ADRs rather than restating them — the ADR is the
record, this is the index.

- **ADR-001 — bounded agent chat.** Chat did not cause the failure mode; chat *replacing the verdict*
  did. Hence RULE-11 through RULE-16, and the revert condition: if the amendment rate falls below
  40%, the artifacts have stopped being the source of truth and the ban comes back.
- **ADR-002 — Supabase as hosted Postgres only.** RLS is off *by decision*, because `src/lib/data/`
  is the single authorization point and two layers enforcing permissions is a drift source. Revisit
  the moment anything needs direct client-to-database access — at that point the seam stops being the
  only path in and RLS stops being redundant.
- **ADR-003 — Member is a separate table from the Better Auth user.** A Member can exist without a
  login; deleting a `user` must not delete the `Member`.
- **Two fields for sizing.** `size_estimate` is the BA's at SPEC and gates DoR; `size` is the Tech
  Lead's at DESIGN and decides splitting. One field carrying both judgements made DoR unsatisfiable
  **twice** — first requiring a value only DESIGN could produce, then only SPEC.
- **The DoR gate sits between SPEC and READY**, not before SPEC, because two of its six items are
  produced by the BA at SPEC. Check D13 fails the audit if a fourth attempt puts the gate ahead of its
  own inputs again.
- **Roles that get asked stay alive; roles that pass judgement die after speaking.** `ba` and
  `tech-lead-design` are persistent because they get asked what they meant. `tech-lead-review` and
  `qa` are discarded after each verdict, because a reviewer that remembers checking R4 will not check
  it again — and the code changed between passes, which is the entire reason there is a second pass.

---

## Known limitations

Things that are wrong and deliberately left alone, with what would have to be true to fix them.

**The registry exemption does not exist. The steward writes registry changes for the operator to
paste, exactly as every other agent does.**

`guard-registry.mjs` reads exactly one payload field — `tool_input`, walked for path-shaped keys. It
reads no identity field of any kind. The payload contract does carry `agent_type`, and
`guard-read-scope.mjs` and `chat-guard.mjs` both depend on it, but it is populated **only when the
caller is a subagent**. Under the session model each role runs as its own top-level session, so
`agent_type` is absent — which is MD-03. `/thuki` is a slash command run in a session, so an
exemption has nothing to key on, and an exemption that cannot be scoped to one agent is an exemption
for all of them.

The guard was therefore **left untouched**. To fix this, one of: MD-03 is resolved so sessions carry
role identity; or the steward is invoked as a subagent (`subagent_type: steward`), which would put it
under the orchestrator rather than beside it and is a different design.

*Not yet verified by a captured live payload.* Established from the hook source and the session model,
not from instrumentation. `guard-read-scope.mjs` has never demonstrably fired in a live run — ROO-01
never reached QA, so the one restricted role that would prove population never ran. Settling it means
temporarily adding a payload-dumping hook to `settings.json` and reverting it.

**D5 cannot distinguish a route from a slash command.** `/rooms` in a human-owned document is
reported as a command with no definition. Scoping D5 to human-owned files removed the agent-facing
false positives — `tech-lead-design` hit this on ROO-01 and reported it rather than renaming the
route, which is correct and not a behaviour to depend on. The residue needs a convention (backtick
routes) or an allow-list, and both are decisions rather than implementations. MD-02.

**D5's matcher is quieter than it looks.** Its token pattern excludes a trailing `.`, so `Run /spec.`
at the end of a sentence is invisible to it. This cuts false positives and was left deliberately, but
a real missing command written that way would not be caught.

**Two model-defect registers exist.** `.ai/board/model-debt.md` and `.ai/board/model-defects.md` were
both created on 2026-08-12 and record overlapping defects under different numbering — `MD-01`/`MD-1`
are the same missing `/resume`, `MD-04`/`MD-2` the same `chat_budget` gap. `model-defects.md` also
holds two *resolved* entries with history that `model-debt.md` does not have. Merging them is a
decision the operator has not made, and deleting a file the steward did not create is not the
steward's to take. Until then `model-debt.md` is treated as the register of record and
`model-defects.md` is not updated.

**`.ai/standards/` is documented as human-only and is not enforced as such.** MD-05, verified:
`01-operating-model.md:18` names the registry plane as `.ai/registry/`, `.ai/standards/`;
`guard-registry.mjs:86` blocks only `.ai/registry/`. Agents have written standards freely all run —
including this steward. Either the document or the guard is wrong, and which one is a decision.

---

## Session log

Append-only. Date, what changed, why, and every registry write with its confirmation.

### 2026-08-21 — steward created

**Changed:** `.claude/agents/steward.md` (new), `.claude/commands/thuki.md` (new),
`.claude/commands/status.md` (new), `.ai/steward/context.md` (new), `.ai/board/model-debt.md`
(MD-05, MD-06 appended), `CLAUDE.md` (command list).

**Why:** the operating model had no owner. Defects in it were being recorded in the margins of
whichever ticket surfaced them, and fixes were landing mid-ticket, which makes it impossible to tell
whether a ticket succeeded because of the design or because of the patch.

**Registry writes:** none. `.ai/board/**` is board plane; `CLAUDE.md` is neither plane. No
confirmation was required and none was sought.

**Correction to the record:** the extension request that produced this session assumed the steward
already existed. It did not — the previous session stopped at its Step 0 gate, printed
`READY — create the steward?`, and was never answered. The agent, both commands and this file were
all created in this session, not extended.

**MD-05 verified before recording**, against `01-operating-model.md:18` and `guard-registry.mjs:86`,
per the standing instruction to check claims rather than accept them.

**Not done, deliberately:** no MD item fixed, no `/resume`, `guard-registry.mjs` untouched,
`model-defects.md` untouched, nothing under `src/`, `prisma/`, `tests/`, or `.ai/board/tickets/`.
