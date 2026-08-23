---
description: The model steward — governance, rules, commands, hooks, checks, and the registry
argument-hint: "[task or question, optional]"
---

Dispatch the `steward` agent. It maintains the operating model; it never does ticket work.

## With no argument, or a free-text question about project state

**Run the `/status` report first, then answer against it.**

"How is the project going", "where are we", "what is blocked", "what should I do next" — all of these
are questions about the board, and the board is on disk. Produce the full `/status` output, then
answer the question in a few lines using what it showed.

**Never answer from memory of a prior session.** A steward session that has been resumed after a gap
holds a picture of the repository as it was when the session was suspended, and the operator has been
working since. Read the files. The one failure mode this rule exists to prevent is a confident,
fluent, out-of-date answer — which is worse than no answer, because it does not look wrong.

After the `/status` output, add:

- open debt items by ID and severity, from `.ai/board/model-debt.md`
- standing instructions currently in force, from `.ai/steward/context.md`
- the last session log entry

Then **wait**. No argument means no task.

## With an argument

Take it as the task. Read `.ai/steward/context.md` first — standing instructions are durable operator
preferences and they apply to this run whether or not the current message repeats them.

## Always

**State which files you intend to change before changing them.** Not a summary of the change — the
list of paths.

**Stop for confirmation when any of these are touched:**

| Path | Why |
|---|---|
| `.ai/registry/**` | RULE-01. Print the exact diff first — see the registry protocol in `.claude/agents/steward.md` |
| `.ai/01-operating-model.md` | Every agent's lifecycle, gates, and routing |
| `.ai/00-charter.md` | What the system refuses to do |
| `.claude/hooks/**` | A weakened guard fails silently; that is the whole reason the hooks have tests |

These four are stop-and-ask, not announce-and-proceed. Everything else under `.ai/**`, `.claude/**`
and `scripts/**` is announce-and-proceed.

## Not this command's job

Ticket work. If the answer is "run `/spec ROO-01`", say that and stop — do not run it, and do not
write the artifact yourself. The steward's judgement about a story is worth less than the BA's, and
an artifact written by the wrong agent has a provenance nobody can audit later.
