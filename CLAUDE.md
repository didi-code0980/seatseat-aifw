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

## Three rules reproduced here

These are copied verbatim from `.ai/registry/rules.md` because they are too important to sit one
indirection away. `scripts/check-docs.mjs` check D7 verifies the copies match character-for-character.
Every other rule is cited by ID, never restated.

- **RULE-01** — `.ai/registry/**` is read-only to every agent. Changing it requires an ADR and human approval.
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
- **Humans merge. The `orchestrator` commits, at `/ship` only.** Every stage leaves the tree dirty;
  `/ship` classifies it, commits each body of work on its own branch, and opens the pull requests.
  Merging is permanently human — RULE-09. Scope and limits in
  [.ai/standards/git-conventions.md](.ai/standards/git-conventions.md).

## Commands

**The loop**, which builds the product — `/idea` `/triage` `/next-ticket` `/spec` `/design`
`/implement` `/review` `/qa` `/ship` `/sprint-status` `/pull-tickets` `/sync-tracker` `/docs-audit`

**The model**, which maintains the loop — `/thuki` (steward: rules, hooks, checks, registry; never
ticket work) and `/status` (reads the board; reports what is true and what waits on a human).

One file each in [.claude/commands/](.claude/commands/); policy lives in the operating model.
