# Seat and Device Tracking System

An internal web application for managing physical seat assignments, network port mapping, and device
ownership across organizational rooms. Three roles: Admin, Manager, User.

## Read these before doing anything

| File | What it is |
|------|------------|
| [.ai/00-charter.md](.ai/00-charter.md) | What this system is for and what it refuses to do |
| [.ai/01-operating-model.md](.ai/01-operating-model.md) | Lifecycle, stage ownership, gates, chat topology, dispatch loop |
| [.ai/registry/rules.md](.ai/registry/rules.md) | All 18 process rules, each stated exactly once |
| [.ai/registry/invariants.md](.ai/registry/invariants.md) | The 8 domain invariants |
| [.ai/registry/features.md](.ai/registry/features.md) | The only valid source of feature IDs |
| [.ai/standards/](.ai/standards/) | Architecture, coding, data model, RBAC, testing, UI, git, integrations |
| [.claude/PERMISSIONS.md](.claude/PERMISSIONS.md) | Why each permission and hook exists |
| [.ai/steward/context.md](.ai/steward/context.md) | **How the operator wants to be worked with.** Standing instructions, and the log of what changed and why |

**Read the standing instructions in `.ai/steward/context.md` before your first reply in a session,
whichever agent you are.** They are durable operator preferences — autonomy, answer length, language,
what to verify before speaking — and they apply whether or not the current message repeats them. The
operator named "having to explain the same preference again" as a standing cost; that file is the
mechanism against it. It is board plane and agent-writable, but only the steward appends to it.

## Three rules reproduced here

These are copied verbatim from `.ai/registry/rules.md` because they are too important to sit one
indirection away. `scripts/check-docs.mjs` check D7 verifies the copies match character-for-character.
Every other rule is cited by ID, never restated.

- **RULE-01** — Changing `.ai/registry/**` requires an ADR and human approval. Enforcement is CODEOWNERS review on the pull request, not a hook.
- **RULE-02** — No component may bypass the `src/lib/data/` seam. Enforced by ESLint, not convention.
- **RULE-03** — An agent may not edit any file outside the active ticket's `allowed_paths`.

## Two planes

`.ai/registry/` and `.ai/standards/` are permanent and human-only. `.ai/board/` is transient and
agent-writable. A ticket's working directory is `.ai/board/tickets/` — never under the registry.

## Stack

Next.js 16 App Router, TypeScript, Prisma 7, PostgreSQL, Better Auth, Tailwind, dnd-kit, Vitest,
Playwright, Docker Compose. Package manager is pnpm. Next.js 16, Prisma 7, and Better Auth are past
reliable recall — inspect installed types or current docs before writing config against them, and
write `TODO(verify):` rather than guessing.

## Visual direction

Light SaaS. Accent `#FB5729`. Near-black `#1C1C1C`. Black pill buttons. White cards on a light-gray
canvas. Gilroy or Manrope for UI, IBM Plex Mono for codes and IDs. Details in
[.ai/standards/ui-design-system.md](.ai/standards/ui-design-system.md).

## Working agreements

- **Windows-native.** No `.sh` files, no `chmod`, no shebang execution. Every hook is `.mjs` run via
  `node`.
- **No invention.** No invented feature IDs, acceptance criteria, database fields, or invariants.
  Missing information becomes a placeholder plus an entry under `OPEN QUESTIONS`.
- **Additive only.** Do not delete or rewrite a file you did not create in the current run.
- **Humans merge. The `orchestrator` commits, at `/handoff` and `/ship` only.** Every stage leaves
  the tree dirty. `/handoff` persists a finished lane and releases the branch so the next worktree can
  take it; `/ship` adds the state transition and opens the pull requests. Both classify the tree and
  keep ticket work and chore work on separate branches. Merging is permanently human — RULE-09. Scope
  and limits in [.ai/standards/git-conventions.md](.ai/standards/git-conventions.md).
- **Three worktrees, one travelling branch.** `aiw-work` designs and ships, `aiw` builds,
  `aiw-steward` maintains the model. `feat/<ID>` moves `aiw-work -> aiw -> aiw-work` by `/handoff`.
  Confirm `pwd` and `git branch --show-current` before the first instruction of a session — since
  ADR-004 nothing stops a session writing to the wrong folder's branch.
  [.ai/standards/session-model.md](.ai/standards/session-model.md).

## Sign-off — every agent, every reply

**End every reply to the operator with this block, whoever you are.** Four lines, this order, nothing
else in it. Labels are in the conversation language per `.ai/steward/context.md`; this file shows the
Vietnamese form because that is the conversation language today.

```
---
**Tôi là `<agent>`.** Vừa <what you did> — <TICKET-ID>, gate <PASS | FAIL | BLOCKED | n/a>.
**Xong lúc:** <output of `date '+%Y-%m-%d %H:%M %Z'`>
**Branch:** <output of `git branch --show-current`, or `detached @ <sha>`>
**Tiếp theo:** <command> — trong folder <aiw | aiw-work | aiw-steward>
```

- **Read the time and the branch. Never supply them from context.** `date` and
  `git branch --show-current`, every time, even when you are confident. A sign-off is a claim about a
  machine's state, and an invented one is worse than none because it looks measured.
- **No `Bash` tool means `unavailable — no Bash tool`**, not a guess. `product` is the only agent in
  this position today.
- **Quote the gate from your artifact's front-matter.** If your reply completes no command, write
  `gate n/a` and say what you are waiting on in the *Tiếp theo* line.
- **Name the folder, not just the command.** Three worktrees make a correct command in the wrong
  folder a silent write to the wrong branch.
- **On a FAIL, *Tiếp theo* is the routed command**, per the routing table in
  `.ai/01-operating-model.md` — not the next happy-path stage. On `ESCALATED`, it is a human decision
  and there is no command; say so.
- **Never put this block in an artifact.** It is conversation. Artifacts carry front-matter, and that
  is the record.

## Commands

**The loop**, which builds the product — `/idea` `/triage` `/next-ticket` `/spec` `/design`
`/handoff` `/implement` `/review` `/qa` `/handoff` `/ship` `/sprint-status` `/pull-tickets`
`/sync-tracker` `/docs-audit`

**The model**, which maintains the loop — `/thuki` (steward: rules, hooks, checks, registry; never
ticket work) and `/status` (reads the board; reports what is true and what waits on a human).

One file each in [.claude/commands/](.claude/commands/); policy lives in the operating model.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
